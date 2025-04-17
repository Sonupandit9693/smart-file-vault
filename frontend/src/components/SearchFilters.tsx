import React, { useState, useEffect } from 'react';
import { FileFilters } from '../types/file';
import { fileService } from '../services/fileService';
import { format } from 'date-fns';
import { Range, getTrackBackground } from 'react-range';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  XMarkIcon,
  CalendarIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  DocumentIcon,
  DocumentTextIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

// Range component prop interfaces
interface IThumbProps {
  key: number;
  style: React.CSSProperties;
  tabIndex?: number;
  'aria-valuemax'?: number;
  'aria-valuemin'?: number;
  'aria-valuenow'?: number;
  dragging?: boolean;
  ref?: React.RefObject<any>;
  role?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onKeyUp?: (e: React.KeyboardEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
}

interface RangeThumbProps {
  props: IThumbProps;
  index: number;
}

interface ITrackProps {
  style: React.CSSProperties;
  ref?: React.RefObject<any>;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
}

interface RangeTrackProps {
  props: ITrackProps;
  children: React.ReactNode;
}

// Error boundary component
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children, fallback }) => {
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Error in component:', error);
      setHasError(true);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  if (hasError) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

interface SearchFiltersProps {
  onFilterChange: (filters: FileFilters) => void;
}

interface FilterPreset {
  name: string;
  icon: React.ReactNode;
  filters: FileFilters;
}

// Add custom animation keyframes
const fadeInAnimation = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes expandDown {
    from { max-height: 0; opacity: 0; }
    to { max-height: 1000px; opacity: 1; }
  }
  
  .filter-section-enter {
    animation: expandDown 0.3s ease-out forwards;
    overflow: hidden;
  }
`;

// Add style tag for custom animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = fadeInAnimation;
  document.head.appendChild(style);
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState<FileFilters>({});
  const [fileTypes, setFileTypes] = useState<string[]>([]);
  const [sizeRange, setSizeRange] = useState<[number, number]>([0, 10000]);
  const [showFilters, setShowFilters] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [isDebouncingSearch, setIsDebouncingSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterPresets: FilterPreset[] = [
    {
      name: 'Last 24 hours',
      icon: <CalendarIcon className="h-4 w-4" />,
      filters: {
        upload_date_after: format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      }
    },
    {
      name: 'Last week',
      icon: <CalendarIcon className="h-4 w-4" />,
      filters: {
        upload_date_after: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      }
    },
    {
      name: 'Large files',
      icon: <DocumentTextIcon className="h-4 w-4" />,
      filters: {
        min_size: 5000 // 5MB
      }
    },
    {
      name: 'Documents only',
      icon: <DocumentIcon className="h-4 w-4" />,
      filters: {
        file_type: 'application/pdf'
      }
    }
  ];

  useEffect(() => {
    const fetchFileTypes = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const types = await fileService.getFileTypes();
        setFileTypes(types);
      } catch (error) {
        console.error('Error fetching file types:', error);
        setError('Failed to load file types');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFileTypes();
  }, []);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Immediate search for specific fields
    if (['filename_contains', 'content_hash'].includes(name)) {
      onFilterChange({...filters, [name]: value});
    }
    // Debounce search input
    else if (name === 'search') {
      setIsDebouncingSearch(true);
      setTimeout(() => {
        onFilterChange({...filters, [name]: value});
        setIsDebouncingSearch(false);
      }, 500);
    }
  };

  const handleSizeChange = (values: number[]): void => {
    setFilters(prev => ({
      ...prev,
      min_size: values[0],
      max_size: values[1]
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value ? value : undefined,
    }));
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    onFilterChange(filters);
  };

  const handleReset = (): void => {
    setFilters({});
    setActivePreset(null);
    onFilterChange({});
  };

  const getActiveFilters = (): [string, any][] => {
    return Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '');
  };

  const handleRemoveFilter = (key: string): void => {
    const newFilters = { ...filters };
    delete newFilters[key as keyof FileFilters];
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const formatFilterLabel = (key: string): string => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // JSX return with proper structure
  return (
    <div className="bg-white shadow-lg rounded-xl mb-6 border border-gray-100">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XMarkIcon className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      <div className="px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FunnelIcon className="h-5 w-5 mr-2 text-primary-500" />
            Search & Filter
          </h3>
          <div className="flex flex-wrap gap-3 md:justify-end">
            {filterPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  setFilters(preset.filters);
                  setActivePreset(preset.name);
                  onFilterChange(preset.filters);
                }}
                className={`inline-flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activePreset === preset.name
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-sm'
                }`}
              >
                <span className="mr-2">{preset.icon}</span>
                {preset.name}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-8 space-y-6">
          <div className="relative">
            <input
              type="text"
              name="search"
              value={filters.search || ''}
              onChange={handleInputChange}
              className="w-full pl-10 pr-4 py-3 border-gray-300 focus:ring-primary-500 focus:border-primary-500 rounded-lg shadow-sm text-sm transition-all duration-200 hover:border-gray-400 hover:shadow"
              placeholder="Search files by name, type, or content..."
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            {isDebouncingSearch && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
              </div>
            )}
          </div>
          
          {/* Additional search filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 col-span-1 sm:col-span-2 mb-3 flex items-center">
              <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2 text-primary-500" />
              Quick Filters
            </h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filename Contains
              </label>
              <input
                type="text"
                name="filename_contains"
                value={filters.filename_contains || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 shadow-sm text-sm transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
                placeholder="Filter by filename..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Hash
              </label>
              <input
                type="text"
                name="content_hash"
                value={filters.content_hash || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 shadow-sm text-sm transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
                placeholder="Search by content hash..."
              />
            </div>
            
            <div className="col-span-1 sm:col-span-2 flex items-center justify-start mt-4">
              <label className="inline-flex items-center bg-white px-4 py-2.5 border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:shadow transition-all duration-200 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_duplicate"
                  checked={!!filters.is_duplicate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setFilters(prev => ({
                      ...prev,
                      is_duplicate: e.target.checked
                    }));
                    onFilterChange({...filters, is_duplicate: e.target.checked});
                  }}
                  className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 h-4 w-4"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Show only duplicates</span>
              </label>
            </div>
          </div>
        </div>


        {/* Advanced Filters Toggle Button */}
        <div className="mt-4 mb-6">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 w-full sm:w-auto ${
              showFilters 
                ? 'bg-primary-50 text-primary-700 border border-primary-200 shadow-md' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-200 hover:shadow-sm'
            }`}
          >
            <ChevronDownIcon 
              className={`h-5 w-5 mr-2 transform ${showFilters ? 'rotate-180' : ''} transition-transform duration-300 ${showFilters ? 'text-primary-600' : 'text-gray-500'}`}
            />
            {showFilters ? 'Hide advanced filters' : 'Show advanced filters'}
          </button>
        </div>

        {/* Advanced Filters Section */}
        {showFilters && (
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 mb-6 transition-all duration-300 overflow-hidden filter-section-enter" 
               style={{ transformOrigin: 'top' }}>
            <h4 className="text-sm font-semibold text-gray-700 mb-5 flex items-center">
              <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2 text-primary-500" />
              Advanced Filters
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-x-6 gap-y-8">
              {/* File Type Select */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">File Type</label>
                <select
                  name="file_type"
                  value={filters.file_type || ''}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border-gray-300 px-4 py-2 bg-white shadow-sm focus:ring-primary-500 focus:border-primary-500 focus:ring-2 transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
                  disabled={isLoading}
                >
                  <option value="">All types</option>
                  {isLoading ? (
                    <option disabled>Loading file types...</option>
                  ) : (
                    fileTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))
                  )}
                </select>
              </div>

              {/* Date Range */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Date Range
                </label>
                <div className="flex space-x-3">
                  <input
                    type="date"
                    name="upload_date_after"
                    value={filters.upload_date_after || ''}
                    onChange={handleDateChange}
                    className="w-1/2 rounded-lg border-gray-300 px-3 py-2 bg-white shadow-sm focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
                    placeholder="From"
                  />
                  <input
                    type="date"
                    name="upload_date_before"
                    value={filters.upload_date_before || ''}
                    onChange={handleDateChange}
                    className="w-1/2 rounded-lg border-gray-300 px-3 py-2 bg-white shadow-sm focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
                    placeholder="To"
                  />
                </div>
              </div>

              {/* File Size Range */}
              <div className="mt-8 col-span-1 sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  File Size Range (KB)
                </label>
                <div className="px-4 py-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="group">
                    <ErrorBoundary fallback={<div className="text-red-500 text-sm">Error loading range slider</div>}>
                      <Range
                        values={[filters.min_size || 0, filters.max_size || 10000] as [number, number]}
                        step={100}
                        min={0}
                        max={10000}
                        onChange={handleSizeChange}
                        renderTrack={({ props, children }: RangeTrackProps) => (
                          <div
                            {...props}
                            className="h-3 w-full bg-gray-200 rounded-full shadow-inner"
                            style={{
                              background: `linear-gradient(to right, 
                                #e5e7eb 0%,
                                #e5e7eb ${(filters.min_size || 0) / 100}%,
                                #0ea5e9 ${(filters.min_size || 0) / 100}%,
                                #0ea5e9 ${(filters.max_size || 10000) / 100}%,
                                #e5e7eb ${(filters.max_size || 10000) / 100}%,
                                #e5e7eb 100%)`
                            }}
                          >
                            {children}
                          </div>
                        )}
                        renderThumb={({ props, index }: RangeThumbProps) => (
                          <div
                            {...props}
                            className="h-6 w-6 bg-white border-2 border-primary-500 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 relative"
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white px-2 py-1 rounded text-xs min-w-[50px] text-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md"
                                 style={{ opacity: props.dragging ? 1 : 0, transition: 'all 0.2s ease' }}>
                              {index === 0 ? (filters.min_size || 0) : (filters.max_size || 10000)} KB
                            </div>
                          </div>
                        )}
                      />
                    </ErrorBoundary>
                  </div>
                  <div className="mt-6 flex justify-between items-center px-1">
                    <div className="px-3 py-1.5 bg-white rounded-md shadow-sm border border-gray-200 text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200">
                      {filters.min_size || 0} KB
                    </div>
                    <div className="px-3 py-1.5 bg-white rounded-md shadow-sm border border-gray-200 text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200">
                      {filters.max_size || 10000} KB
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Submit Button Section - Always visible */}
        <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200 shadow-sm"
          >
            Reset Filters
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-sm hover:shadow transition-all duration-200"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center">
                <span className="mr-2 animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                Loading...
              </span>
            ) : (
              'Apply Filters'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
