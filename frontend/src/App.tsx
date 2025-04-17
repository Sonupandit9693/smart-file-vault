import React from 'react';
import { FileUpload } from './components/FileUpload';
import { FileList } from './components/FileList';
import { StorageStats } from './components/StorageStats';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000, // 10 seconds
      retry: 1,
    },
  },
});

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { 
  error: Error; 
  resetErrorBoundary: () => void 
}) => {
  return (
    <div role="alert" className="p-6 bg-red-50 border border-red-200 rounded-lg">
      <h2 className="text-lg font-semibold text-red-800">Something went wrong:</h2>
      <p className="text-red-700 mt-2">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
};

function App() {
  const handleUploadSuccess = () => {
    // Invalidate the files query to refresh the file list
    queryClient.invalidateQueries({ queryKey: ['files'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">Abnormal File Vault</h1>
            <p className="mt-1 text-sm text-gray-500">
              Intelligent file storage with deduplication and advanced search
            </p>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="space-y-6">
              <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                <FileUpload onUploadSuccess={handleUploadSuccess} />
              </div>
              
              <ErrorBoundary 
                FallbackComponent={ErrorFallback} 
                onReset={() => {
                  queryClient.invalidateQueries({ queryKey: ['files'] });
                  queryClient.invalidateQueries({ queryKey: ['stats'] });
                }}
              >
                {/* Analytics Section */}
                <StorageStats />
                
                {/* File List with Search and Filters */}
                <div className="bg-white shadow sm:rounded-lg overflow-hidden p-6">
                  <FileList />
                </div>
              </ErrorBoundary>
            </div>
          </div>
        </main>
        <footer className="bg-white shadow mt-8">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-500">
              © 2024 Abnormal File Vault. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  );
}

export default App;
