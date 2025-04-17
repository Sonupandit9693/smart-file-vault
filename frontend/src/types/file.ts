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
  reference_count?: number;
  actual_size?: number;
  duplicate_details?: {
    is_duplicate: boolean;
    original_file_id: string;
    original_filename: string;
    storage_saved: number;
    content_hash: string;
  };
}

export interface FileFilters {
  search?: string;
  file_type?: string;
  min_size?: number;
  max_size?: number;
  upload_date_after?: string;
  upload_date_before?: string;
  is_duplicate?: boolean;
  filename_contains?: string;
  content_hash?: string; 
  ordering?: string;
}

export interface StorageStats {
  total_files: number;
  unique_files: number;
  duplicate_files: number;
  total_size: number;
  actual_size: number;
  storage_saved: number;
  storage_saved_percentage: number;
  file_types: Array<{file_type: string; count: number; total_type_size?: number}>;
  size_range: {min: number; max: number};
  recent_uploads?: {
    today: number;
    this_week: number;
  };
  duplicate_trends?: Array<{
    date: string;
    count: number;
  }>;
}
