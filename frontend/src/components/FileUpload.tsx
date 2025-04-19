import React, { useState, useRef, useCallback, useEffect } from 'react';
import { fileService } from '../services/fileService';
import { 
  CloudArrowUpIcon, 
  ExclamationCircleIcon, 
  CheckCircleIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface FileUploadProps {
  onUploadSuccess: () => void;
}

interface UploadResponseDuplicateDetails {
  is_duplicate: boolean;
  original_filename?: string;
  storage_saved?: number;
  content_hash?: string;
}

interface UploadResponse {
  is_duplicate?: boolean;
  duplicate_details?: UploadResponseDuplicateDetails;
  content_hash?: string;
  // Add other response fields as needed
}

interface UploadResultState {
  success: boolean;
  message: string;
  isDuplicate: boolean;
  originalFilename?: string;
  storageSaved?: number;
  contentHash?: string;
}
export const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResultState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  
  // Configuration for file validation
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_FILE_TYPES: string[] = []; // Empty array means all types are allowed

  const uploadMutation = useMutation({
    mutationFn: fileService.uploadFile.bind(fileService), // Bind to preserve 'this' context
    onSuccess: (response: UploadResponse) => {
      console.log("Upload succeeded with response:", response);
      
      // Clear previous states
      setError(null);
      
      // Check if the file was a duplicate - ensure it's always a boolean with !!
      const isDuplicate = !!(response.is_duplicate || 
                          (response.duplicate_details && response.duplicate_details.is_duplicate));
      
      // Prepare success message
      let resultMessage = "File uploaded successfully!";
      if (isDuplicate) {
        resultMessage = "File uploaded successfully! Duplicate content detected.";
      }
      
      // Set upload result for display
      setUploadResult({
        success: true,
        message: resultMessage,
        isDuplicate: isDuplicate,
        originalFilename: response.duplicate_details?.original_filename,
        storageSaved: response.duplicate_details?.storage_saved,
        contentHash: response.content_hash || response.duplicate_details?.content_hash
      });
      
      // Immediately invalidate and refetch queries to update UI
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['files'] }),
        queryClient.invalidateQueries({ queryKey: ['stats'] }),
        queryClient.refetchQueries({ queryKey: ['files'] }),
        queryClient.refetchQueries({ queryKey: ['stats'] })
      ]).then(() => {
        console.log("All queries invalidated and refetched");
      });
      
      // Reset selected file state
      setSelectedFile(null);
      
      // Reset the file input element
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      onUploadSuccess();
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to upload file. Please try again.';
      
      // Clear any previous success state
      setUploadResult(null);
      
      console.group('File Upload Error Details');
      console.error('Original error:', error);
      
      // Extract more detailed error message if available
      if (error?.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        
        if (error.response.data) {
          const responseData = error.response.data;
          console.error('Response data:', responseData);
          
          if (typeof responseData === 'string') {
            errorMessage = responseData;
          } else if (responseData.detail) {
            errorMessage = responseData.detail;
          } else if (responseData.error) {
            errorMessage = responseData.error;
          } else if (responseData.message) {
            errorMessage = responseData.message;
          } else if (Array.isArray(responseData) && responseData.length > 0) {
            errorMessage = responseData[0];
          }
        }
      } else if (error.request) {
        // Request was made but no response received
        console.error('No response received:', error.request);
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Something else caused the error
        console.error('Error message:', error.message);
        errorMessage = `Error setting up request: ${error.message}`;
      }
      
      // Network error specific information
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        errorMessage = 'Upload timed out. Please try again.';
      } else if (axios.isAxiosError(error) && !error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      console.groupEnd();
      setError(errorMessage);
    },
  });

  // Detect accurate file type
  const detectFileType = (file: File): string => {
    // This is a simple approach; for production, consider using a library like file-type
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    // Map common extensions to MIME types
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'html': 'text/html',
      'json': 'application/json',
      'xml': 'application/xml',
      'zip': 'application/zip',
      'md': 'text/markdown',
    };
    
    // Use the mapped MIME type or fall back to the browser-detected type
    return mimeTypes[extension] || file.type || 'application/octet-stream';
  };

  // File validation
  const validateFile = (file: File): boolean => {
    console.group('File Validation');
    console.log('File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      detectedType: detectFileType(file),
      lastModified: new Date(file.lastModified).toISOString()
    });
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const errorMsg = `File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
      console.error(errorMsg);
      setError(errorMsg);
      console.groupEnd();
      return false;
    }
    
    // Validate file type if specific types are defined
    if (ALLOWED_FILE_TYPES.length > 0 && !ALLOWED_FILE_TYPES.includes(file.type)) {
      const errorMsg = `File type not allowed. Supported types: ${ALLOWED_FILE_TYPES.join(', ')}`;
      console.error(errorMsg);
      setError(errorMsg);
      console.groupEnd();
      return false;
    }
    
    console.log('File validation passed');
    console.log('File validation passed');
    console.groupEnd();
    return true;
  };
  
  // Helper function to format file sizes for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        setError(null);
      } else {
        // Reset the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };
  
  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  }, [isDragging]);
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        setError(null);
      }
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    // Reset statuses before upload
    setError(null);
    setUploadResult(null);

    console.group('File Upload Attempt');
    console.log('Uploading file:', selectedFile.name);
    
    // Log the FormData being sent for debugging
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('original_filename', selectedFile.name);
    formData.append('file_type', detectFileType(selectedFile));
    formData.append('size', selectedFile.size.toString());
    
    // Log FormData entries (can't log FormData directly)
    console.log('FormData entries:');
    for (const pair of Array.from(formData.entries())) {
      console.log(`${pair[0]}: ${pair[1]}`);
    }
    
    try {
      console.log('Starting upload mutation...');
      
      // Create form data for upload
      const uploadData = {
        file: selectedFile,
        original_filename: selectedFile.name,
        file_type: detectFileType(selectedFile),
        size: selectedFile.size
      };
      
      // Execute the mutation and get the result
      const result = await uploadMutation.mutateAsync(uploadData);
      console.log('Upload successful:', result);
      console.groupEnd();
    } catch (err) {
      console.error('Upload failed in component handler');
      console.groupEnd();
      // Detailed error handling is done in onError callback
    }
  };

  // Effect to reset file input when upload is successful
  useEffect(() => {
    if (uploadResult?.success && fileInputRef.current) {
      // Ensure file input is reset when upload is successful
      fileInputRef.current.value = '';
    }
  }, [uploadResult]);

  return (
    <div className="p-6">
      <div className="flex items-center mb-4">
        <CloudArrowUpIcon className="h-6 w-6 text-primary-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-900">Upload File</h2>
      </div>
      
      {/* Upload Result Message */}
      {uploadResult && (
        <div className={`mb-4 p-3 rounded-md ${uploadResult.isDuplicate ? 'bg-blue-50' : 'bg-green-50'}`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {uploadResult.isDuplicate ? (
                <DocumentDuplicateIcon className="h-5 w-5 text-blue-600" />
              ) : (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${uploadResult.isDuplicate ? 'text-blue-800' : 'text-green-800'}`}>
                {uploadResult.message}
              </h3>
              {uploadResult.isDuplicate && (
                <div className="mt-2 text-sm text-blue-700">
                  <p>This file matches <strong>{uploadResult.originalFilename}</strong>.</p>
                  <p className="mt-1">Saved {formatFileSize(uploadResult.storageSaved || 0)} of storage space.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* File Upload Area */}
      <div className="mt-4 space-y-4">
        <div
          className={`file-upload-area flex justify-center px-6 pt-5 pb-6 border-2 ${
            isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
          } border-dashed rounded-lg`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-1 text-center">
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
              >
                <span>Upload a file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  onChange={handleFileSelect}
                  disabled={uploadMutation.isPending}
                  ref={fileInputRef}
                  accept={ALLOWED_FILE_TYPES.join(',')}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">Any file up to 10MB</p>
            {isDragging && (
              <div className="mt-2 text-sm text-primary-600">
                Drop file here to upload
              </div>
            )}
          </div>
        </div>

        {/* Selected File Information */}
        {selectedFile && (
          <div className="text-sm text-gray-600">
            <div>Selected: {selectedFile.name}</div>
            <div className="mt-1 text-xs text-gray-500">
              File size: {formatFileSize(selectedFile.size)}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded flex items-start">
            <ExclamationCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploadMutation.isPending}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            !selectedFile || uploadMutation.isPending
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
          }`}
        >
          {uploadMutation.isPending ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Uploading...
            </>
          ) : (
            'Upload'
          )}
        </button>
      </div>
    </div>
  );
};