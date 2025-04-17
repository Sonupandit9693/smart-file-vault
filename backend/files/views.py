from django.shortcuts import render
from django.db.models import Q, Min, Max, Sum, Count
from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, DateTimeFilter, NumberFilter, CharFilter
from datetime import datetime, timedelta
from .models import File
from .serializers import FileSerializer

# Create your views here.

class FileFilter(FilterSet):
    """
    Filter for File model that supports advanced filtering options.
    """
    file_type = CharFilter(field_name='file_type', lookup_expr='iexact')
    min_size = NumberFilter(field_name='size', lookup_expr='gte')
    max_size = NumberFilter(field_name='size', lookup_expr='lte')
    upload_date_after = DateTimeFilter(field_name='uploaded_at', lookup_expr='gte')
    upload_date_before = DateTimeFilter(field_name='uploaded_at', lookup_expr='lte')
    
    class Meta:
        model = File
        fields = ['file_type', 'min_size', 'max_size', 'upload_date_after', 'upload_date_before']


class FileViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing files with deduplication and advanced search/filtering.
    """
    queryset = File.objects.all()
    serializer_class = FileSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = FileFilter
    search_fields = ['original_filename']
    ordering_fields = ['original_filename', 'size', 'uploaded_at', 'file_type']
    ordering = ['-uploaded_at']

    def create(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        data = {
            'file': file_obj,
            'original_filename': file_obj.name,
            'file_type': file_obj.content_type,
            'size': file_obj.size
        }
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Retrieve statistics about file storage and deduplication.
        
        Returns:
            - total_files: Count of all files
            - unique_files: Count of non-duplicate files
            - duplicate_files: Count of duplicate files
            - total_size: Total size of all files (logical size)
            - actual_size: Actual storage used (physical size)
            - storage_saved: Storage space saved through deduplication
            - file_types: Count of files by file type
        """
        total_files = File.objects.count()
        unique_files = File.objects.filter(is_duplicate=False).count()
        duplicate_files = File.objects.filter(is_duplicate=True).count()
        
        total_size = File.objects.aggregate(total=Sum('size'))['total'] or 0
        actual_size = File.objects.aggregate(total=Sum('actual_size'))['total'] or 0
        storage_saved = total_size - actual_size
        
        # Group files by file type
        file_types = File.objects.values('file_type').annotate(count=Count('id')).order_by('-count')
        
        # Get size ranges for filtering
        size_range = File.objects.aggregate(min=Min('size'), max=Max('size'))
        
        stats = {
            'total_files': total_files,
            'unique_files': unique_files,
            'duplicate_files': duplicate_files,
            'total_size': total_size,
            'actual_size': actual_size,
            'storage_saved': storage_saved,
            'storage_saved_percentage': (storage_saved / total_size * 100) if total_size > 0 else 0,
            'file_types': list(file_types),
            'size_range': size_range
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def file_types(self, request):
        """
        Get a list of all file types in the system.
        Used for populating filter dropdown in the frontend.
        """
        file_types = File.objects.values_list('file_type', flat=True).distinct()
        return Response(list(file_types))
