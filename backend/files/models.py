from django.db import models
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.core.files.storage import default_storage
import uuid
import os
import hashlib
import logging

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
        """Calculate and store the SHA-256 hash of the file content"""
        sha256_hash = hashlib.sha256()
        with self.file.open('rb') as f:
            # Read and update hash in chunks to efficiently handle large files
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        self.content_hash = sha256_hash.hexdigest()
        return self.content_hash
        
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
    def find_duplicate(cls, file_hash):
        """Find a file with the same hash if it exists"""
        return cls.objects.filter(content_hash=file_hash, is_duplicate=False).first()

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
