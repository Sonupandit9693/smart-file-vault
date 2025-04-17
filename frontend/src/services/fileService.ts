import axios from 'axios';
import { File as FileType, FileFilters, StorageStats } from '../types/file';
import { format } from 'date-fns';

// Configure API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Configuration for cache management
const CACHE_CONFIG = {
  staleTime: 1000 * 60 * 5, // 5 minutes
  cacheTime: 1000 * 60 * 30, // 30 minutes 
  retry: 3 // Retry failed requests 3 times
};

// Set up a custom axios instance with interceptors for logging
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.data instanceof FormData ? 'FormData (not logged)' : config.data,
      params: config.params
    });
    return config;
  },
  (error) => {
    console.error('Request setup error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging
apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.group('API Response Error');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    }
    
    console.groupEnd();
    return Promise.reject(error);
  }
);

// Utility functions for file service
const formatDateForFilter = (date: Date): string => {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss");
};

// Helper to determine if a response contains a duplicate file 
const isDuplicateFile = (response: any): boolean => {
  return (
    response?.is_duplicate === true || 
    (response?.duplicate_details && response?.duplicate_details.is_duplicate === true)
  );
};

export const fileService = {
  // Cache management helpers for React Query
  cacheKeys: {
    files: 'files',
    stats: 'stats',
    fileTypes: 'fileTypes',
    fileDetail: (id: string) => ['file', id]
  },

  // Invalidate related queries after certain operations
  invalidateRelatedQueries: async (queryClient: any) => {
    console.log('Invalidating and refetching all related queries');
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['files'] }),
      queryClient.invalidateQueries({ queryKey: ['stats'] }),
      queryClient.invalidateQueries({ queryKey: ['fileTypes'] })
    ]);
  },

  // Validation functions
  validateFileSize(file: File, maxSize: number = 10 * 1024 * 1024): boolean {
    if (file.size > maxSize) {
      console.error(`File size (${file.size} bytes) exceeds maximum allowed size (${maxSize} bytes)`);
      return false;
    }
    return true;
  },
  
  validateFileType(file: File, allowedTypes: string[] = []): boolean {
    // If no allowed types specified, allow all
    if (allowedTypes.length === 0) return true;
    
    if (!allowedTypes.includes(file.type)) {
      console.error(`File type "${file.type}" not in allowed types: ${allowedTypes.join(', ')}`);
      return false;
    }
    return true;
  },
  
  // Define upload file data type
  async uploadFile(data: { 
    file: File;
    original_filename?: string;
    file_type?: string; 
    size?: number;
  }): Promise<FileType> {
    console.group('File Upload Request');
    
    // Validate file
    if (!data.file) {
      const error = new Error('No file provided');
      console.error(error);
      console.groupEnd();
      throw error;
    }
    
    // Basic validation
    if (!fileService.validateFileSize(data.file)) { // Changed from this.validateFileSize to fileService.validateFileSize
      const error = new Error('File size exceeds limit');
      console.error(error);
      console.groupEnd();
      throw error;
    }
    
    // Create and populate form data
    const formData = new FormData();
    formData.append('file', data.file);
    
    // Add metadata required by the server
    const filename = data.original_filename || data.file.name;
    const fileType = data.file_type || data.file.type || 'application/octet-stream';
    const fileSize = (data.size || data.file.size).toString();
    
    formData.append('original_filename', filename);
    formData.append('file_type', fileType);
    formData.append('size', fileSize);
    
    // Log upload attempt details
    console.log('Uploading file with data:', {
      name: filename,
      type: fileType,
      size: parseInt(fileSize),
      lastModified: new Date(data.file.lastModified).toISOString()
    });
    
    try {
      // Use a different approach to log FormData contents
      console.log('FormData contents:');
      for (const pair of Array.from(formData.entries())) {
        console.log(`- ${pair[0]}: ${pair[0] === 'file' ? 'File object' : pair[1]}`);
      }
      
      // Use our apiClient with interceptors for better logging
      const response = await apiClient.post('/files/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // Add progress monitoring
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      });
      
      console.log('Upload successful:', response.data);
      console.groupEnd();
      return response.data;
    } catch (error: any) {
      console.error('Upload failed:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          console.error('Upload timed out. Check file size and network connection.');
        } else if (!error.response) {
          console.error('Network error. Check API URL and CORS configuration.');
        }
      }
      
      console.groupEnd();
      throw error;
    }
  },

  async getFiles(filters?: FileFilters): Promise<FileType[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      // Basic search and filters
      if (filters.search) params.append('search', filters.search);
      if (filters.file_type) params.append('file_type', filters.file_type);
      if (filters.min_size) params.append('min_size', filters.min_size.toString());
      if (filters.max_size) params.append('max_size', filters.max_size.toString());
      if (filters.upload_date_after) params.append('upload_date_after', filters.upload_date_after);
      if (filters.upload_date_before) params.append('upload_date_before', filters.upload_date_before);
      
      // Enhanced filtering options
      if (filters.is_duplicate !== undefined) params.append('is_duplicate', filters.is_duplicate.toString());
      if (filters.filename_contains) params.append('filename_contains', filters.filename_contains);
      if (filters.content_hash) params.append('content_hash', filters.content_hash);
      if (filters.ordering) params.append('ordering', filters.ordering);
    }
    
    try {
      // Log the filters being applied
      console.log('Fetching files with filters:', Object.fromEntries(params.entries()));
      
      const response = await apiClient.get('/files/', { params });
      
      // Handle paginated response if backend uses pagination
      if (response.data.results && Array.isArray(response.data.results)) {
        // Return just the results array from a paginated response
        return response.data.results;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching files:', error);
      throw error;
    }
  },

  async getStats(abortSignal?: AbortSignal): Promise<StorageStats> {
    try {
      console.log('Fetching storage statistics');
      const response = await apiClient.get('/files/stats/', {
        signal: abortSignal
      });
      
      const stats = response.data;
      
      // Add some derived metrics for the UI if needed
      if (stats.total_size > 0 && !stats.storage_saved_percentage) {
        stats.storage_saved_percentage = Math.round((stats.storage_saved / stats.total_size) * 100 * 100) / 100;
      }
      
      return stats;
    } catch (error: any) {
      // Don't log aborted requests as errors
      if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
        console.log('Stats request was aborted');
        throw error;
      }
      
      console.error('Error fetching storage stats:', error);
      throw error;
    }
  },

  async getFileTypes(): Promise<string[]> {
    try {
      console.log('Fetching available file types');
      const response = await apiClient.get('/files/file_types/');
      
      // Sort file types alphabetically for better UX
      const fileTypes = response.data;
      if (Array.isArray(fileTypes)) {
        return fileTypes.sort();
      }
      
      return fileTypes;
    } catch (error) {
      console.error('Error fetching file types:', error);
      throw error;
    }
  },

  async deleteFile(id: string): Promise<void> {
    try {
      console.log(`Deleting file with ID: ${id}`);
      await apiClient.delete(`/files/${id}/`);
      console.log(`File ${id} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting file ${id}:`, error);
      throw error;
    }
  },

  async downloadFile(fileUrl: string, filename: string): Promise<void> {
    try {
      console.log(`Downloading file: ${filename} from ${fileUrl}`);
      // Use direct axios here since the URL might be absolute and not relative to our API
      const response = await axios.get(fileUrl, {
        responseType: 'blob',
      });
      
      // Create a blob URL and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      throw new Error('Failed to download file');
    }
  },

  // Get a single file by ID
  async getFileById(id: string): Promise<FileType> {
    try {
      console.log(`Fetching file details for ID: ${id}`);
      const response = await apiClient.get(`/files/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching file with ID ${id}:`, error);
      throw error;
    }
  }
};
