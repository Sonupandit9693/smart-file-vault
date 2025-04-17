import React, { useState, useEffect } from 'react';
import { FileFilters } from '../types/file';
import { fileService } from '../services/fileService';
import { format } from 'date-fns';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  XMarkIcon 
} from '@heroicons/react/24/outline';

interface SearchFiltersProps {
  onFilterChange: (filters: FileFilters) => void;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState<FileFilters>({});
  const [fileTypes, setFileTypes] = useState<string[]>([]);
  const [sizeRange, setSizeRange] = useState<{ min: number; max: number }>({ min: 0, max: 10000 });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchFileTypes = async () => {
      try {
        const types = await fileService.getFileTypes();
        setFileTypes(types);
      } catch (error) {
        console.error('Error fetching file types:', error);
      }
    };

    fetchFileTypes();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: parseInt(value),
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value ? value : undefined,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange(filters);
  };

  const handleReset = () => {
    setFilters({});
    onFilterChange({});
  };

  return (
    <div className="bg-white shadow rounded-lg mb-6">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Search & Filter Files</h3>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="search"
                value={filters.search || ''}
                onChange={handleInputChange}
                className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="Search by filename..."
              />
            </div>
          </div>

          {showFilters && (
            <div className="space-y-4 mb-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="file_type" className="block text-sm font-medium text-gray-700">
                    File Type
                  </label>
                  <select
                    id="file_type"
                    name="file_type"
                    value={filters.file_type || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  >
                    <option value="">All file types</option>
                    {fileTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="upload_date_after" className="block text-sm font-medium text-gray-700">
                    Uploaded After
                  </label>
                  <input
                    type="date"
                    name="upload_date_after"
                    id="upload_date_after"
                    value={filters.upload_date_after || ''}
                    onChange={handleDateChange}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="min_size" className="block text-sm font-medium text-gray-700">
                    Min Size (KB)
                  </label>
                  <input
                    type="range"
                    name="min_size"
                    id="min_size"
                    min={sizeRange.min}
                    max={sizeRange.max}
                    value={filters.min_size || sizeRange.min}
                    onChange={handleSizeChange}
                    className="mt-1 w-full"
                  />
                  <span className="text-xs text-gray-500">
                    {filters.min_size ? `${filters.min_size} KB` : `${sizeRange.min} KB`}
                  </span>
                </div>

                <div>
                  <label htmlFor="max_size" className="block text-sm font-medium text-gray-700">
                    Max Size (KB)
                  </label>
                  <input
                    type="range"
                    name="max_size"
                    id="max_size"
                    min={sizeRange.min}
                    max={sizeRange.max}
                    value={filters.max_size || sizeRange.max}
                    onChange={handleSizeChange}
                    className="mt-1 w-full"
                  />
                  <span className="text-xs text-gray-500">
                    {filters.max_size ? `${filters.max_size} KB` : `${sizeRange.max} KB`}
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="upload_date_before" className="block text-sm font-medium text-gray-700">
                  Uploaded Before
                </label>
                <input
                  type="date"
                  name="upload_date_before"
                  id="upload_date_before"
                  value={filters.upload_date_before || ''}
                  onChange={handleDateChange}
                  className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <XMarkIcon className="h-4 w-4 mr-2" />
              Reset Filters
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

