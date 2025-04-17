import React, { useState, useEffect } from 'react';
import { fileService } from '../services/fileService';
import { File as FileType, FileFilters } from '../types/file';
import { 
  DocumentIcon, 
  TrashIcon, 
  ArrowDownTrayIcon,
  DocumentDuplicateIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SearchFilters } from './SearchFilters';
import { StorageStats } from './StorageStats';

export const FileList: React.FC = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FileFilters>({});
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds refresh

  // Query for fetching files with filters
  const { data: files, isLoading, error } = useQuery({
    queryKey: ['files', filters],
    queryFn: () => fileService.getFiles(filters),
    refetchInterval: refreshInterval,
  });

  // Handler for filter changes
  const handleFilterChange = (newFilters: FileFilters) => {
    setFilters(newFilters);
  };

  // Format size display more nicely
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Force refresh stats and files
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['files'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

  // Set up periodic refresh
  useEffect(() => {
    const refreshTimer = setInterval(() => {
      handleRefresh();
    }, refreshInterval);

    return () => clearInterval(refreshTimer);
  }, [refreshInterval, queryClient]);

  // Mutation for deleting files
  const deleteMutation = useMutation({
    mutationFn: fileService.deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  // Mutation for downloading files
  const downloadMutation = useMutation({
    mutationFn: ({ fileUrl, filename }: { fileUrl: string; filename: string }) =>
      fileService.downloadFile(fileUrl, filename),
  });

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleDownload = async (fileUrl: string, filename: string) => {
    try {
      await downloadMutation.mutateAsync({ fileUrl, filename });
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">Failed to load files. Please try again.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Note: The formatSize, handleRefresh functions and useEffect hook have been moved before the conditional returns

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Abnormal File Vault</h2>
      
      {/* Storage Statistics */}
      <StorageStats />
      
      {/* Search and Filters */}
      <SearchFilters onFilterChange={handleFilterChange} />
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Uploaded Files</h3>
        <button 
          onClick={handleRefresh}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Refresh
        </button>
      </div>
      {!files || files.length === 0 ? (
        <div className="text-center py-12">
          <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No files</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by uploading a file
          </p>
        </div>
      ) : (
        <div className="mt-6 flow-root">
          <ul className="-my-5 divide-y divide-gray-200">
            {files.map((file) => (
              <li key={file.id} className={`py-4 ${file.is_duplicate ? 'bg-blue-50' : ''}`}>
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {file.is_duplicate ? (
                      <DocumentDuplicateIcon className="h-8 w-8 text-blue-500" />
                    ) : (
                      <DocumentIcon className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900 truncate mr-2">
                        {file.original_filename}
                      </p>
                      {file.is_duplicate && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <CheckBadgeIcon className="h-3 w-3 mr-1" />
                          Deduplicated
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center space-x-2">
                      <span>{file.file_type}</span>
                      <span>•</span>
                      <span>{formatSize(file.size)}</span>
                      {file.is_duplicate && (
                        <>
                          <span>•</span>
                          <span className="text-green-600 font-medium">
                            Saved {formatSize(file.storage_saved)}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Uploaded {new Date(file.uploaded_at).toLocaleString()}
                    </p>
                    {file.content_hash && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        Hash: {file.content_hash.substring(0, 16)}...
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDownload(file.file, file.original_filename)}
                      disabled={downloadMutation.isPending}
                      className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}; 