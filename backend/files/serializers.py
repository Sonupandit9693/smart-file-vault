from rest_framework import serializers
from .models import File
import os
import hashlib
import tempfile
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

class FileSerializer(serializers.ModelSerializer):
    storage_saved = serializers.SerializerMethodField()
    is_duplicate = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = File
        fields = [
            'id', 'file', 'original_filename', 'file_type', 'size', 
            'uploaded_at', 'content_hash', 'is_duplicate', 'storage_saved'
        ]
        read_only_fields = ['id', 'uploaded_at', 'content_hash', 'is_duplicate', 'storage_saved']
    
    def get_storage_saved(self, obj):
        """Return the amount of storage saved if file is deduplicated"""
        return obj.storage_saved
    
    def create(self, validated_data):
        """
        Handle file upload with deduplication.
        If a file with the same content hash exists, create a reference to it.
        """
        try:
            upload_file = validated_data['file']
            
            # Calculate hash directly without saving the file
            file_hash = self._calculate_file_hash(upload_file)
            
            # Check if a file with the same hash already exists
            existing_file = File.find_duplicate(file_hash)
            
            # Create the file instance after hash calculation
            file_instance = File(
                file=upload_file,
                original_filename=validated_data['original_filename'],
                file_type=validated_data['file_type'],
                size=validated_data['size'],
                content_hash=file_hash
            )
            
            if existing_file:
                # This is a duplicate - create a new record that references the original
                file_instance.is_duplicate = True
                file_instance.reference_file = existing_file
                file_instance.actual_size = 0  # Actual disk space used is minimal for references
                
                # Don't save the file content again, just save the model
                file_instance.file = existing_file.file
                file_instance.save()
                
                # Log deduplication success
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"Deduplicated file: {file_instance.original_filename}, saved {file_instance.size} bytes")
                
                return file_instance
            else:
                # Not a duplicate - save as normal
                file_instance.actual_size = file_instance.size  # For non-duplicates, actual size = file size
                file_instance.save()
                
                return file_instance
                
        except Exception as e:
            # Log the error
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error during file upload: {str(e)}")
            raise serializers.ValidationError(f"File upload failed: {str(e)}")
            
    def _calculate_file_hash(self, file):
        """Calculate SHA-256 hash for a file without modifying the original file."""
        try:
            sha256_hash = hashlib.sha256()
            
            # Save the current position
            pos = file.tell()
            
            # Reset to the beginning of the file
            file.seek(0)
            
            # Read and update hash in chunks to efficiently handle large files
            for chunk in iter(lambda: file.read(4096), b""):
                sha256_hash.update(chunk)
            
            # Reset file position back to where it was
            file.seek(pos)
            
            return sha256_hash.hexdigest()
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error calculating file hash: {str(e)}")
            # Re-raise as validation error with clear message
            raise serializers.ValidationError(f"Unable to process file: {str(e)}")
