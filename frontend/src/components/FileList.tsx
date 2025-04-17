import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { fileService } from '../services/fileService';
import { File as FileType } from '../types/file';
import { 
  ArrowDownTrayIcon,
  DocumentDuplicateIcon,
  CheckBadgeIcon,
  TrashIcon,
  Bars4Icon, // Replaced ViewListIcon
  Squares2X2Icon, // Replaced ViewGridIcon
  DocumentIcon,
  DocumentTextIcon,
  PhotoIcon,
  ArchiveBoxIcon,
  ArrowPathIcon,
  FunnelIcon,
  ChevronDownIcon,
  AdjustmentsVerticalIcon,
  CalendarIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { Range } from 'react-range';
import { format } from 'date-fns';

// Advanced filter interface
interface AdvancedFilters {
  dateRange: {
    start: string | null;
    end: string | null;
  };
  sizeRange: {
    min: number;
    max: number;
  };
  fileTypes: string[];
  showDuplicatesOnly: boolean;
  sortBy: 'name' | 'date' | 'size';
  sortOrder: 'asc' | 'desc';
}

export const FileList: React.FC = () => {
  // Component state
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filteredFiles, setFilteredFiles] = useState<FileType[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    dateRange: { start: null, end: null },
    sizeRange: { min: 0, max: 10000 },
    fileTypes: [],
    showDuplicatesOnly: false,
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const queryClient = useQueryClient();

  // Query and mutations
  const { data: files, isLoading, error, refetch } = useQuery({
    queryKey: ['files'],
    queryFn: () => fileService.getFiles()
  });

  const deleteMutation = useMutation({
    mutationFn: fileService.deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    }
  });

  // Utility functions
  const handleDownload = async (fileUrl: string, filename: string) => {
    try {
      await fileService.downloadFile(fileUrl, filename);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <PhotoIcon className="h-6 w-6" />;
    if (fileType.includes('pdf')) return <DocumentTextIcon className="h-6 w-6" />;
    if (fileType.includes('zip') || fileType.includes('compressed')) return <ArchiveBoxIcon className="h-6 w-6" />;
    return <DocumentIcon className="h-6 w-6" />;
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (date: string): string => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  // Render helper functions
  const renderFileCard = (file: FileType) => (
    <div
      key={file.id}
      className={`bg-white rounded-xl shadow-sm border ${
        file.is_duplicate ? 'border-blue-200' : 'border-gray-200'
      } hover:shadow-md transition-shadow duration-200`}
    >
      <div className="p-6">
        <div className="flex items-start">
          <div className={`flex-shrink-0 ${
            file.is_duplicate ? 'text-blue-500' : 'text-gray-400'
          }`}>
            {getFileTypeIcon(file.file_type)}
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-gray-900 truncate" title={file.original_filename}>
              {file.original_filename}
            </h3>
            <div className="mt-1 text-sm text-gray-500">
              {formatSize(file.size)}
            </div>
            {file.is_duplicate && (
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <CheckBadgeIcon className="h-3 w-3 mr-1" />
                  Saved {formatSize(file.storage_saved || 0)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <div className="flex space-x-4">
            <span>{file.file_type.split('/')[1]?.toUpperCase() || file.file_type}</span>
            <span>•</span>
            <span>{formatDate(file.uploaded_at)}</span>
          </div>
        </div>

        <div className="mt-4 flex space-x-2">
          <button
            onClick={() => handleDownload(file.file, file.original_filename)}
            className="flex-1 inline-flex justify-center items-center px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-md hover:bg-primary-100"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            Download
          </button>
          <button
            onClick={() => handleDelete(file.id)}
            disabled={deleteMutation.isPending}
            className="flex-1 inline-flex justify-center items-center px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <TrashIcon className="h-4 w-4 mr-1" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="overflow-hidden bg-white shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg">
      <ul role="list" className="divide-y divide-gray-200">
        {files?.map((file) => (
          <li
            key={file.id}
            className={`p-4 ${file.is_duplicate ? 'bg-blue-50' : ''} hover:bg-gray-50`}
          >
            <div className="flex items-center space-x-4">
              <div className={`flex-shrink-0 ${
                file.is_duplicate ? 'text-blue-500' : 'text-gray-400'
              }`}>
                {getFileTypeIcon(file.file_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.original_filename}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{formatSize(file.size)}</span>
                  <span>•</span>
                  <span>{formatDate(file.uploaded_at)}</span>
                  {file.is_duplicate && (
                    <>
                      <span>•</span>
                      <span className="text-blue-700">
                        Saved {formatSize(file.storage_saved || 0)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleDownload(file.file, file.original_filename)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-md hover:bg-primary-100"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                  Download
                </button>
                <button
                  onClick={() => handleDelete(file.id)}
                  disabled={deleteMutation.isPending}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
  );

  // Advanced filters component
  const renderAdvancedFilters = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <button
        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm text-gray-700 hover:bg-gray-50"
      >
        <div className="flex items-center">
          <AdjustmentsVerticalIcon className="h-5 w-5 mr-2 text-gray-400" />
          <span>Advanced Filters</span>
          {Object.values(advancedFilters).some(value => 
            value !== null && 
            (Array.isArray(value) ? value.length > 0 : value !== false)
          ) && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              Active
            </span>
          )}
        </div>
        <ChevronDownIcon
          className={`h-5 w-5 text-gray-400 transform transition-transform ${
            showAdvancedFilters ? 'rotate-180' : ''
          }`}
        />
      </button>

      {showAdvancedFilters && (
        <div className="p-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={advancedFilters.dateRange.start || ''}
                  onChange={(e) => setAdvancedFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: e.target.value }
                  }))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                <input
                  type="date"
                  value={advancedFilters.dateRange.end || ''}
                  onChange={(e) => setAdvancedFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: e.target.value }
                  }))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
            </div>

            {/* File Size Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File Size Range (KB)
              </label>
              <Range
                values={[advancedFilters.sizeRange.min, advancedFilters.sizeRange.max]}
                step={100}
                min={0}
                max={10000}
                onChange={([min, max]) => setAdvancedFilters(prev => ({
                  ...prev,
                  sizeRange: { min, max }
                }))}
                renderTrack={({ props, children }) => (
                  <div
                    {...props}
                    className="h-2 w-full bg-gray-200 rounded-full"
                  >
                    {children}
                  </div>
                )}
                renderThumb={({ props }) => (
                  <div
                    {...props}
                    className="h-4 w-4 bg-white border-2 border-primary-500 rounded-full"
                  />
                )}
              />
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>{advancedFilters.sizeRange.min}KB</span>
                <span>{advancedFilters.sizeRange.max}KB</span>
              </div>
            </div>

            {/* File Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File Types
              </label>
              <select
                multiple
                value={advancedFilters.fileTypes}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setAdvancedFilters(prev => ({
                    ...prev,
                    fileTypes: selected
                  }));
                }}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                {Array.from(new Set(files?.map(file => file.file_type) || [])).map(type => (
                  <option key={type} value={type}>
                    {type.split('/')[1]?.toUpperCase() || type}
                  </option>
                ))}
              </select>
            </div>

            {/* Show Duplicates Only */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="duplicates"
                checked={advancedFilters.showDuplicatesOnly}
                onChange={(e) => setAdvancedFilters(prev => ({
                  ...prev,
                  showDuplicatesOnly: e.target.checked
                }))}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="duplicates" className="ml-2 block text-sm text-gray-700">
                Show duplicates only
              </label>
            </div>

            {/* Sort Options */}
            <div className="col-span-full flex items-center space-x-4">
              <select
                value={advancedFilters.sortBy}
                onChange={(e) => setAdvancedFilters(prev => ({
                  ...prev,
                  sortBy: e.target.value as 'name' | 'date' | 'size'
                }))}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="size">Sort by Size</option>
              </select>
              <select
                value={advancedFilters.sortOrder}
                onChange={(e) => setAdvancedFilters(prev => ({
                  ...prev,
                  sortOrder: e.target.value as 'asc' | 'desc'
                }))}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={() => {
                setAdvancedFilters({
                  dateRange: { start: null, end: null },
                  sizeRange: { min: 0, max: 10000 },
                  fileTypes: [],
                  showDuplicatesOnly: false,
                  sortBy: 'date',
                  sortOrder: 'desc'
                });
                setFilteredFiles(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Reset Filters
            </button>
            <button
              onClick={() => {
                // Apply filters to the file list
                if (!files) return;
                
                let filtered = [...files];
                
                // Apply date range filter
                if (advancedFilters.dateRange.start) {
                  filtered = filtered.filter(file => 
                    new Date(file.uploaded_at) >= new Date(advancedFilters.dateRange.start!)
                  );
                }
                if (advancedFilters.dateRange.end) {
                  filtered = filtered.filter(file => 
                    new Date(file.uploaded_at) <= new Date(advancedFilters.dateRange.end!)
                  );
                }

                // Apply size range filter
                filtered = filtered.filter(file => 
                  file.size >= advancedFilters.sizeRange.min * 1024 && 
                  file.size <= advancedFilters.sizeRange.max * 1024
                );

                // Apply file type filter
                if (advancedFilters.fileTypes.length > 0) {
                  filtered = filtered.filter(file => 
                    advancedFilters.fileTypes.includes(file.file_type)
                  );
                }

                // Apply duplicates filter
                if (advancedFilters.showDuplicatesOnly) {
                  filtered = filtered.filter(file => file.is_duplicate);
                }

                // Apply sorting
                filtered.sort((a, b) => {
                  const order = advancedFilters.sortOrder === 'asc' ? 1 : -1;
                  switch (advancedFilters.sortBy) {
                    case 'name':
                      return order * a.original_filename.localeCompare(b.original_filename);
                    case 'size':
                      return order * (a.size - b.size);
                    case 'date':
                      return order * (new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime());
                    default:
                      return 0;
                  }
                });

                // Update the files list
                setFilteredFiles(filtered);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Main render
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Files</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${
                viewMode === 'list'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Bars4Icon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${
                viewMode === 'grid'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Squares2X2Icon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="max-w-xl mx-auto">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // Debounce search
                clearTimeout(searchTimeout.current);
                searchTimeout.current = setTimeout(() => {
                  const filtered = files?.filter(file => 
                    file.original_filename.toLowerCase().includes(e.target.value.toLowerCase())
                  );
                  setFilteredFiles(filtered || null);
                }, 300);
              }}
              placeholder="Search files by name..."
              className="w-full pl-10 pr-4 py-3 border-gray-300 focus:ring-primary-500 focus:border-primary-500 rounded-lg shadow-sm text-base"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {renderAdvancedFilters()}

      {/* File Display - Filtered or Original */}
      {/* Show empty state if no files or filtered files are empty */}
      {(!files?.length || (filteredFiles && !filteredFiles.length)) ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {!files?.length ? 'No files uploaded yet' : 'No files match the filters'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {!files?.length 
              ? 'Get started by uploading a file'
              : 'Try adjusting your filters to find what you\'re looking for'
            }
          </p>
        </div>
      ) : (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(filteredFiles || files).map(renderFileCard)}
          </div>
        ) : (
          <div className="overflow-hidden bg-white shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg">
            <ul role="list" className="divide-y divide-gray-200">
              {(filteredFiles || files).map((file) => (
                <li
                  key={file.id}
                  className={`p-4 ${file.is_duplicate ? 'bg-blue-50' : ''} hover:bg-gray-50`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`flex-shrink-0 ${
                      file.is_duplicate ? 'text-blue-500' : 'text-gray-400'
                    }`}>
                      {getFileTypeIcon(file.file_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.original_filename}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{formatSize(file.size)}</span>
                        <span>•</span>
                        <span>{formatDate(file.uploaded_at)}</span>
                        {file.is_duplicate && (
                          <>
                            <span>•</span>
                            <span className="text-blue-700">
                              Saved {formatSize(file.storage_saved || 0)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDownload(file.file, file.original_filename)}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-md hover:bg-primary-100"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                        Download
                      </button>
                      <button
                        onClick={() => handleDelete(file.id)}
                        disabled={deleteMutation.isPending}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
        )
      )}
    </div>
  );
};
