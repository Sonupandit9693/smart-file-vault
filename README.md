# Abnormal File Vault

A full-stack file management application built with React and Django, designed for efficient file handling and storage. Abnormal File Vault optimizes storage through file deduplication and provides powerful search and filtering capabilities.

## ✨ Key Features

### 1. File Deduplication System
- **SHA-256 Content Hashing**: Identifies duplicate files by comparing content hash values
- **Reference Counting**: Tracks references to original files, maintaining data integrity
- **Storage Optimization**: Only stores unique files physically, with metadata-only records for duplicates
- **Storage Statistics**: Real-time metrics on storage savings and deduplication efficiency

### 2. Advanced Search & Filtering
- **Filename Search**: Full-text search across filenames
- **Multi-criteria Filtering**: Filter by file type, size range, and upload dates
- **Combined Filters**: Apply multiple filters simultaneously
- **Sorting Options**: Order results by filename, size, type, or upload date

## 🚀 Technology Stack

### Backend
- Django 4.x (Python web framework)
- Django REST Framework (API development)
- SQLite (Development database)
- Gunicorn (WSGI HTTP Server)
- WhiteNoise (Static file serving)

### Frontend
- React 18 with TypeScript
- TanStack Query (React Query) for data fetching
- Axios for API communication
- Tailwind CSS for styling
- Heroicons for UI elements

### Infrastructure
- Docker and Docker Compose
- Local file storage with volume mounting

## 📋 Prerequisites

Before you begin, ensure you have installed:
- Docker (20.10.x or higher) and Docker Compose (2.x or higher)
- Node.js (18.x or higher) - for local development only
- Python (3.9 or higher) - for local development only

## 🛠️ Installation & Setup

### Using Docker (Recommended)

The entire application stack can be run with a single command:

```bash
# Build and start all containers
docker-compose up --build

# Run in background (detached mode)
docker-compose up --build -d

# View logs when running in detached mode
docker-compose logs -f
```

Docker Compose will:
1. Build the backend Django container
2. Build the frontend React container
3. Set up persistent volumes for media storage, static files, and SQLite database
4. Configure networking between containers
5. Map ports 8000 (backend) and 3000 (frontend) to your host

### Local Development Setup

For development purposes, you can run the backend and frontend separately.

#### Backend Setup
1. **Create and activate virtual environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Create necessary directories**
   ```bash
   mkdir -p media staticfiles data
   ```

4. **Run migrations**
   ```bash
   python manage.py migrate
   ```

5. **Start the development server**
   ```bash
   python manage.py runserver
   ```

#### Frontend Setup
1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Create environment file**
   Create `.env.local`:
   ```
   REACT_APP_API_URL=http://localhost:8000/api
   ```

3. **Start development server**
   ```bash
   npm start
   ```

## 🌐 Accessing the Application

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **Admin Interface**: http://localhost:8000/admin (create superuser first)

## 📝 API Documentation

### File Management Endpoints

#### List Files
- **GET** `/api/files/`
- Returns a list of all uploaded files
- Response includes file metadata (name, size, type, upload date)
- Supports filtering with query parameters:
  - `?search=` - Search in filenames
  - `?file_type=` - Filter by exact file type
  - `?min_size=` & `?max_size=` - Filter by size range (in bytes)
  - `?upload_date_after=` & `?upload_date_before=` - Filter by date range
  - `?ordering=` - Sort results (e.g., `ordering=size` or `ordering=-uploaded_at`)

#### Upload File
- **POST** `/api/files/`
- Upload a new file
- Request: Multipart form data with 'file' field
- During upload, file is hashed using SHA-256 to detect duplicates
- If a duplicate is found, creates a reference to the existing file
- Returns: File metadata including ID and deduplication status

#### Get File Details
- **GET** `/api/files/<file_id>/`
- Retrieve details of a specific file
- Returns: Complete file metadata including deduplication info

#### Delete File
- **DELETE** `/api/files/<file_id>/`
- Remove a file from the system
- For duplicates, decrements reference count on original file
- For originals with references, preserves physical file until all references are deleted
- Returns: 204 No Content on success

#### Storage Statistics
- **GET** `/api/files/stats/`
- Returns storage optimization metrics:
  - Total files count
  - Unique vs. duplicate files count
  - Total logical size vs. actual physical storage used
  - Storage space saved through deduplication
  - Percentage of storage saved
  - File type distribution

#### File Types
- **GET** `/api/files/file_types/`
- Returns a list of all file types in the system
- Used for populating filter dropdowns in the UI

## 🧪 Testing The Application

### Testing File Deduplication

1. **Upload an original file**:
   - Navigate to http://localhost:3000
   - Click the "Upload" button and select any file
   - Note the file details shown in the list

2. **Upload the same file again**:
   - Upload the exact same file with the same or different filename
   - Observe that it's marked as a duplicate in the UI
   - Check that the reference count increases on the original file

3. **Verify storage savings**:
   - View the Storage Stats widget on the dashboard
   - Confirm that "Storage Saved" increases after uploading duplicates
   - The "Actual Storage" should remain the same when duplicates are added

4. **Test reference handling**:
   - Delete a duplicate file and verify the reference count decreases
   - Delete an original file with duplicates and verify the references are maintained
   - Check the database integrity after deletions

### Testing Search & Filtering

1. **Upload diverse files**:
   - Upload files of different types (PDFs, images, documents)
   - Add files with varying sizes
   - Upload files on different days (if possible)

2. **Test filename search**:
   - Use the search box to search for partial filenames
   - Verify that results update in real-time

3. **Test individual filters**:
   - Filter by file type using the dropdown
   - Use the size slider to filter by file size
   - Use the date picker to filter by upload date

4. **Test combined filters**:
   - Apply multiple filters simultaneously (e.g., PDFs uploaded in the last week)
   - Verify that filters work correctly in combination
   - Clear filters and check that all files are shown again

5. **Test sorting**:
   - Sort files by different criteria (name, size, date)
   - Verify that ascending and descending order works

## ✅ Quick Verification Steps

The following steps will help you verify that the application is working correctly after deployment:

### 1. Check Container Status

```bash
docker-compose ps
```

You should see both containers running:
```
NAME                                IMAGE                             COMMAND                  STATUS          PORTS
abnormal-file-hub-main-backend-1    abnormal-file-hub-main-backend    "./start.sh"             Up              0.0.0.0:8000->8000/tcp
abnormal-file-hub-main-frontend-1   abnormal-file-hub-main-frontend   "docker-entrypoint.s…"   Up              0.0.0.0:3000->3000/tcp
```

### 2. Verify API Health

Test the backend API:
```bash
curl http://localhost:8000/api/files/
```

You should receive a JSON response with the list of files or an empty array if no files exist.

### 3. Check Storage Statistics

```bash
curl http://localhost:8000/api/files/stats/
```

Sample response showing deduplication in action:
```json
{
  "total_files": 7,
  "unique_files": 5,
  "duplicate_files": 2,
  "total_size": 4801886,
  "actual_size": 4428166,
  "storage_saved": 373720,
  "storage_saved_percentage": 7.78,
  "file_types": [
    {"file_type": "application/pdf", "count": 6},
    {"file_type": "application/octet-stream", "count": 1}
  ],
  "size_range": {"min": 6210, "max": 3832697}
}
```

This shows:
- 7 total files (5 unique, 2 duplicates)
- 373,720 bytes (~365 KB) saved through deduplication
- ~7.8% storage savings

### 4. Access the Web Interface

1. Open http://localhost:3000 in your browser
2. Verify that the file list loads correctly
3. Check that the storage stats widget shows the same values as the API
4. Test uploading a new file, then upload the same file again to verify deduplication

### 5. Visual Verification of Deduplication

When you upload a duplicate file through the web interface:
1. The file will appear in the list with a "Duplicate" indicator
2. The storage stats will update to show increased storage savings
3. The reference count on the original file will increase
4. The actual disk space used (visible in storage stats) will remain unchanged

### 6. Verify Search Functionality

1. With multiple files uploaded, try searching by partial filename
2. Apply file type filters (e.g., filter by "application/pdf")
3. Use the size range sliders to filter by file size
4. Combine multiple filters to narrow down results
