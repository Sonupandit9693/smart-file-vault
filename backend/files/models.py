from django.db import models
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.core.files.storage import default_storage
import uuid
import os
import hashlib
import logging
import tempfile
import shutil
from pathlib import Path
from django.conf import settings

logger = logging.getLogger(__name__)

def file_upload_path(instance, filename):
    """Generate file path for new file upload"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('uploads', filename)

class File(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.FileField(upload_to=file_upload_path)
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100)
    size = models.BigIntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)
    content_hash = models.CharField(max_length=64, blank=True, db_index=True)
    reference_file = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='duplicates')
    is_duplicate = models.BooleanField(default=False)
    actual_size = models.BigIntegerField(default=0, help_text="Actual disk space used (differs from size for duplicates)")
    reference_count = models.PositiveIntegerField(default=1, help_text="Number of references to this file")
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return self.original_filename

    def calculate_hash(self):
        """
        Calculate and store the SHA-256 hash of the file content.
        Handles large files efficiently with proper error handling.
        """
        # Larger chunk size for better performance with big files
        CHUNK_SIZE = 8192 * 1024  # 8MB chunks for better performance
        
        try:
            sha256_hash = hashlib.sha256()
            
            # Make sure the file position is at the beginning
            self.file.seek(0)
            
            try:
                # Try direct file reading first - most efficient approach
                with self.file.open('rb') as f:
                    for byte_block in iter(lambda: f.read(CHUNK_SIZE), b""):
                        sha256_hash.update(byte_block)
            except (IOError, OSError) as e:
                # Fallback: If direct file access fails, try downloading to a temp file
                logger.warning(f"Direct file access failed for {self.original_filename}, using fallback: {str(e)}")
                
                with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                    temp_path = temp_file.name
                    try:
                        # Copy the file to temporary storage
                        for chunk in self.file.chunks(CHUNK_SIZE):
                            temp_file.write(chunk)
                        temp_file.flush()
                        
                        # Calculate hash from the temp file
                        with open(temp_path, 'rb') as f:
                            for byte_block in iter(lambda: f.read(CHUNK_SIZE), b""):
                                sha256_hash.update(byte_block)
                    finally:
                        # Clean up temp file
                        try:
                            Path(temp_path).unlink(missing_ok=True)
                        except Exception as ex:
                            logger.error(f"Failed to remove temp file {temp_path}: {str(ex)}")
            
            # Reset file position back to the beginning
            self.file.seek(0)
            
            # Store the calculated hash
            self.content_hash = sha256_hash.hexdigest()
            logger.info(f"Calculated hash for {self.original_filename}: {self.content_hash}")
            return self.content_hash
            
        except Exception as e:
            logger.error(f"Error calculating hash for {self.original_filename}: {str(e)}")
            # Return a fallback hash to avoid system failure, but log the error
            fallback_hash = hashlib.sha256(f"{self.original_filename}_{self.size}_{uuid.uuid4()}".encode()).hexdigest()
            self.content_hash = fallback_hash
            logger.warning(f"Using fallback hash for {self.original_filename}: {fallback_hash}")
            return fallback_hash
    
    def save(self, *args, **kwargs):
        """
        Override the save method to handle content-based deduplication.
        This ensures files with identical content are properly linked, 
        even if they have different filenames.
        """
        # Check if this is a new file being added (no ID yet)
        is_new = not self.pk
        
        # For new files, check for duplicates by content
        if is_new and not self.is_duplicate:
            try:
                # Calculate the hash if not already done
                if not self.content_hash:
                    self.calculate_hash()
                
                # Look for existing file with same hash
                duplicate_of = self.find_duplicate_by_content(self.content_hash)
                
                if duplicate_of:
                    logger.info(f"Found duplicate content: {self.original_filename} matches {duplicate_of.original_filename}")
                    
                    # This is a duplicate file - set up the reference
                    self.reference_file = duplicate_of
                    self.is_duplicate = True
                    self.actual_size = 0  # No additional storage used
                    
                    # Add detailed log for debugging
                    logger.debug(f"Duplicate details - New file: {self.original_filename}, " 
                                f"Original: {duplicate_of.original_filename}, "
                                f"Content hash: {self.content_hash}")
                else:
                    # This is a new unique file
                    self.is_duplicate = False
                    self.actual_size = self.size
                    self.reference_file = None
                    logger.info(f"New unique file: {self.original_filename} with hash {self.content_hash}")
            
            except Exception as e:
                logger.error(f"Error during duplication check: {str(e)}")
                # Fallback to conservative approach
                self.is_duplicate = False
                self.actual_size = self.size
                self.reference_file = None
        
        # Continue with the normal save
        super().save(*args, **kwargs)
        
    def delete(self, *args, **kwargs):
        """
        Override delete to handle reference counting and file cleanup
        """
        try:
            if self.is_duplicate and self.reference_file:
                # If this is a duplicate, decrement reference count on the original
                original = self.reference_file
                if original.reference_count > 0:
                    original.reference_count -= 1
                    original.save(update_fields=['reference_count'])
                    logger.info(f"Decremented reference count for {original.id} to {original.reference_count}")
            elif not self.is_duplicate:
                # If this is an original file, check if it has duplicates
                duplicates = self.__class__.objects.filter(reference_file=self)
                if duplicates.exists():
                    # Prevent deletion if it has duplicates
                    # Just mark it as inactive rather than deleting
                    logger.warning(f"File {self.id} has {duplicates.count()} duplicates, can't delete physical file")
                else:
                    # If no duplicates, delete the actual file
                    try:
                        if default_storage.exists(self.file.name):
                            default_storage.delete(self.file.name)
                            logger.info(f"Deleted physical file: {self.file.name}")
                    except Exception as e:
                        logger.error(f"Error deleting file {self.file.name}: {str(e)}")
            
            # Delete the database record
            super().delete(*args, **kwargs)
        
        except Exception as e:
            logger.error(f"Error during file deletion: {str(e)}")
            raise

    @classmethod
    @classmethod
    def find_duplicate(cls, file_hash):
        """Find a file with the same hash if it exists"""
        return cls.objects.filter(content_hash=file_hash, is_duplicate=False).first()
        
    @classmethod
    def find_duplicate_by_content(cls, content_hash):
        """
        Find a file with the same content hash that's not itself a duplicate.
        This ensures we always reference the original source file.
        """
        if not content_hash:
            return None
            
        return cls.objects.filter(
            content_hash=content_hash,
            is_duplicate=False
        ).order_by('uploaded_at').first()
        
    def verify_duplicate_status(self):
        """
        Verifies that this file's duplicate status is correct by comparing hashes.
        Returns True if the verification was successful, False otherwise.
        """
        try:
            # If not marked as duplicate, nothing to verify
            if not self.is_duplicate or not self.reference_file:
                return True
                
            # Verify content hash matches the reference file
            reference_hash = self.reference_file.content_hash or self.reference_file.calculate_hash()
            my_hash = self.content_hash or self.calculate_hash()
            
            if my_hash != reference_hash:
                logger.warning(f"Hash mismatch: File {self.id} has hash {my_hash} but reference {self.reference_file.id} has {reference_hash}")
                return False
            return True
        except Exception as e:
            logger.error(f"Error verifying duplicate status: {str(e)}")
            return False
            
    @classmethod
    def recheck_duplicates(cls):
        """
        Utility method to recheck all files for duplicate content.
        Useful for maintenance or if hash calculation logic has been improved.
        """
        try:
            logger.info("Starting system-wide duplicate check")
            files = cls.objects.all()
            
            # First, ensure all files have content hashes
            for file in files:
                if not file.content_hash:
                    try:
                        file.calculate_hash()
                        file.save(update_fields=['content_hash'])
                    except Exception as e:
                        logger.error(f"Failed to calculate hash for {file.id}: {str(e)}")
            
            # Then, check for duplicates
            unique_hashes = {}
            for file in files.filter(is_duplicate=False):
                if file.content_hash in unique_hashes:
                    # Already have a file with this hash
                    other_file = unique_hashes[file.content_hash]
                    logger.info(f"Found duplicates: {file.original_filename} and {other_file.original_filename}")
                else:
                    unique_hashes[file.content_hash] = file
                    
            logger.info(f"Duplicate check complete. Found {len(files) - len(unique_hashes)} potential duplicates")
            return True
        except Exception as e:
            logger.error(f"Error in recheck_duplicates: {str(e)}")
            return False
    @property
    def storage_saved(self):
        """Calculate storage space saved if this is a duplicate file"""
        if self.is_duplicate:
            return self.size - self.actual_size
        return 0

    @classmethod
    def get_total_storage_saved(cls):
        """Return the total storage saved through deduplication"""
        duplicates = cls.objects.filter(is_duplicate=True)
        return sum(duplicate.storage_saved for duplicate in duplicates)
        
    @classmethod
    def update_reference_counts(cls):
        """Update reference counts for all files"""
        try:
            # Get all original files
            originals = cls.objects.filter(is_duplicate=False)
            for original in originals:
                # Count duplicates
                duplicate_count = cls.objects.filter(reference_file=original).count()
                # Update reference count
                original.reference_count = duplicate_count + 1  # +1 for the original itself
                original.save(update_fields=['reference_count'])
            return True
        except Exception as e:
            logger.error(f"Error updating reference counts: {str(e)}")
            return False


# Signal handlers for post-save and post-delete actions
@receiver(post_save, sender=File)
def update_file_references(sender, instance, created, **kwargs):
    """Update reference counts when a file is saved"""
    if created and instance.is_duplicate and instance.reference_file:
        try:
            # Increment reference count on the original file
            original = instance.reference_file
            original.reference_count += 1
            original.save(update_fields=['reference_count'])
            logger.info(f"Incremented reference count for {original.id} to {original.reference_count}")
        except Exception as e:
            logger.error(f"Error updating reference count: {str(e)}")
