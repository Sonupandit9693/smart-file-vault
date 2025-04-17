export interface File {
  id: string;
  original_filename: string;
  file_type: string;
  size: number;
  uploaded_at: string;
  file: string;
  content_hash?: string;
  is_duplicate: boolean;
  storage_saved: number;
}

export interface FileFilters {
  search?: string;
  file_type?: string;
  min_size?: number;
  max_size?: number;
  upload_date_after?: string;
  upload_date_before?: string;
}

export interface StorageStats {
  total_files: number;
  unique_files: number;
  duplicate_files: number;
  total_size: number;
  actual_size: number;
  storage_saved: number;
  storage_saved_percentage: number;
  file_types: Array<{file_type: string; count: number}>;
  size_range: {min: number; max: number};
}
