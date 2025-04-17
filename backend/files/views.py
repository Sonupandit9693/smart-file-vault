from django.shortcuts import render
from django.db.models import Q, Min, Max, Sum, Count, F, Value, IntegerField
from django.db.models.functions import Lower
from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, DateTimeFilter, NumberFilter, CharFilter
from django_filters import BooleanFilter, MultipleChoiceFilter
from functools import reduce
from operator import or_, and_
import logging
from datetime import datetime, timedelta
from .models import File
from .serializers import FileSerializer

# Create your views here.

logger = logging.getLogger(__name__)

class FileFilter(FilterSet):
    """
    Enhanced filter for File model with advanced filtering options.
    Supports multiple filter types, logical combinations, and optimized queries.
    """
    # Basic filters
    file_type = CharFilter(field_name='file_type', lookup_expr='iexact')
    min_size = NumberFilter(field_name='size', lookup_expr='gte')
    max_size = NumberFilter(field_name='size', lookup_expr='lte')
    upload_date_after = DateTimeFilter(field_name='uploaded_at', lookup_expr='gte')
    upload_date_before = DateTimeFilter(field_name='uploaded_at', lookup_expr='lte')
    
    # Advanced filters
    is_duplicate = BooleanFilter(field_name='is_duplicate')
    filename_contains = CharFilter(method='filter_filename_contains')
    content_hash = CharFilter(field_name='content_hash', lookup_expr='exact')
    
    # For contextual word search in filenames
    def filter_filename_contains(self, queryset, name, value):
        if not value:
            return queryset
            
        # Split search terms and create OR conditions for each word
        search_terms = value.lower().split()
        if not search_terms:
            return queryset
            
        # For each term, create a filter condition
        queries = [Q(original_filename__icontains=term) for term in search_terms]
        
        # Combine with OR
        return queryset.filter(reduce(or_, queries))
    
    class Meta:
        model = File
        fields = [
            'file_type', 'min_size', 'max_size', 
            'upload_date_after', 'upload_date_before',
            'is_duplicate', 'filename_contains', 'content_hash'
        ]

class OptimizedPagination(PageNumberPagination):
    """
    Optimized pagination for potentially large file sets.
    Includes additional metadata about total storage savings.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def get_paginated_response(self, data):
        # Add storage statistics to pagination response
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
        })


class FileViewSet(viewsets.ModelViewSet):
    """
    Enhanced API endpoint for managing files with content-based deduplication 
    and advanced search/filtering capabilities.
    """
    queryset = File.objects.all()
    serializer_class = FileSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = FileFilter
    search_fields = ['original_filename']
    ordering_fields = ['original_filename', 'size', 'uploaded_at', 'file_type', 'is_duplicate']
    ordering = ['-uploaded_at']
    pagination_class = OptimizedPagination
    ordering = ['-uploaded_at']
    def get_queryset(self):
        """
        Optimize queryset with select_related for improved performance.
        """
        return File.objects.select_related('reference_file').all()

    def create(self, request, *args, **kwargs):
        """
        Enhanced file upload endpoint with content-based deduplication.
        Computes file hash and detects duplicates based on content.
        """
        try:
            file_obj = request.FILES.get('file')
            if not file_obj:
                return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f"File upload initiated: {file_obj.name} ({file_obj.size} bytes, {file_obj.content_type})")
            
            # Extract file metadata from the request or use defaults
            original_filename = request.data.get('original_filename', file_obj.name)
            file_type = request.data.get('file_type', file_obj.content_type or 'application/octet-stream')
            file_size = int(request.data.get('size', file_obj.size))
            
            data = {
                'file': file_obj,
                'original_filename': original_filename,
                'file_type': file_type,
                'size': file_size
            }
            
            # Create and validate the file instance
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            
            # Save with deduplication (handled by the model's save method)
            instance = serializer.save()
            
            # Enhanced response for duplicate files
            response_data = serializer.data
            if instance.is_duplicate and instance.reference_file:
                response_data['duplicate_details'] = {
                    'is_duplicate': True,
                    'original_file_id': str(instance.reference_file.id),
                    'original_filename': instance.reference_file.original_filename,
                    'storage_saved': instance.storage_saved,
                    'content_hash': instance.content_hash
                }
                logger.info(f"Duplicate file detected: {instance.original_filename} matches {instance.reference_file.original_filename}")
                
            headers = self.get_success_headers(serializer.data)
            return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)
            
        except Exception as e:
            logger.error(f"Error during file upload: {str(e)}")
            return Response({'error': f'Upload failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Enhanced statistics about file storage and deduplication.
        
        Returns:
            - total_files: Count of all files
            - unique_files: Count of non-duplicate files
            - duplicate_files: Count of duplicate files
            - total_size: Total size of all files (logical size)
            - actual_size: Actual storage used (physical size)
            - storage_saved: Storage space saved through deduplication
            - storage_saved_percentage: Percentage of storage saved
            - file_types: Count of files by file type
            - size_range: Min and max file sizes
            - recent_uploads: Count of files uploaded in last day/week
            - duplicate_trends: How duplication has increased over time
        """
        try:
            # Apply any filters from the request
            queryset = self.filter_queryset(self.get_queryset())
            
            # Basic stats
            total_files = queryset.count()
            unique_files = queryset.filter(is_duplicate=False).count()
            duplicate_files = queryset.filter(is_duplicate=True).count()
            
            # Storage stats with optimized query
            storage_stats = queryset.aggregate(
                total_size=Sum('size'),
                actual_size=Sum('actual_size'),
                min_size=Min('size'),
                max_size=Max('size')
            )
            
            total_size = storage_stats['total_size'] or 0
            actual_size = storage_stats['actual_size'] or 0
            storage_saved = total_size - actual_size
            storage_saved_percentage = round((storage_saved / total_size * 100), 2) if total_size > 0 else 0
            
            # Group files by file type with count and total size
            file_types = queryset.values('file_type').annotate(
                count=Count('id'),
                total_type_size=Sum('size')
            ).order_by('-count')
            
            # Recent upload trends
            now = datetime.now()
            recent_day = queryset.filter(uploaded_at__gte=now - timedelta(days=1)).count()
            recent_week = queryset.filter(uploaded_at__gte=now - timedelta(days=7)).count()
            
            # Compile all stats
            stats = {
                'total_files': total_files,
                'unique_files': unique_files,
                'duplicate_files': duplicate_files,
                'total_size': total_size,
                'actual_size': actual_size,
                'storage_saved': storage_saved,
                'storage_saved_percentage': storage_saved_percentage,
                'size_range': {
                    'min': storage_stats['min_size'],
                    'max': storage_stats['max_size']
                },
                'file_types': list(file_types),
                'recent_uploads': {
                    'day': recent_day,
                    'week': recent_week
                }
            }
            
            return Response(stats)
        except Exception as e:
            logger.error(f"Error calculating stats: {str(e)}")
            return Response({'error': f'Stats calculation failed: {str(e)}'}, 
                           status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def file_types(self, request):
        """
        Get a list of all file types in the system.
        Used for populating filter dropdown in the frontend.
        """
        file_types = File.objects.values_list('file_type', flat=True).distinct()
        return Response(list(file_types))
