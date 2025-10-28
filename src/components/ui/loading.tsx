'use client';



interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

export function LoadingSkeleton({ className, lines = 1 }: LoadingSkeletonProps) {
  return (
    <div className={cn('animate-pulse', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'bg-gray-200 rounded',
            i === 0 ? 'h-4' : 'h-3 mt-2',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

interface LoadingCardProps {
  className?: string;
}

export function LoadingCard({ className }: LoadingCardProps) {
  return (
    <div className={cn('p-6 bg-white rounded-lg shadow animate-pulse', className)}>
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-gray-200 rounded" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
      </div>
    </div>
  );
}

interface LoadingTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function LoadingTable({ rows = 5, columns = 4, className }: LoadingTableProps) {
  return (
    <div className={cn('animate-pulse', className)}>
      {/* Header */}
      <div className="flex space-x-4 mb-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="flex-1 h-4 bg-gray-200 rounded" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4 mb-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className={cn(
                'flex-1 h-3 bg-gray-200 rounded',
                colIndex === 0 ? 'w-1/4' : colIndex === columns - 1 ? 'w-1/6' : ''
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface LoadingPageProps {
  title?: string;
  description?: string;
}

export function LoadingPage({ title = 'Loading...', description }: LoadingPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="xl" className="mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
        {description && (
          <p className="text-gray-600 max-w-md">{description}</p>
        )}
      </div>
    </div>
  );
}

interface LoadingButtonProps {
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function LoadingButton({ 
  loading = false, 
  children, 
  className, 
  disabled,
  onClick 
}: LoadingButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && (
        <LoadingSpinner size="sm" className="mr-2" />
      )}
      {children}
    </button>
  );
}

// Utility function to create loading states
export function createLoadingState<T>(initialData?: T) {
  return {
    data: initialData || null,
    loading: true,
    error: null,
  };
}

// Hook for managing loading states
export function useLoadingState<T>(initialData?: T) {
  const [state, setState] = React.useState({
    data: initialData || null,
    loading: false,
    error: null as string | null,
  });

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, loading, error: null }));
  };

  const setData = (data: T) => {
    setState({ data, loading: false, error: null });
  };

  const setError = (error: string) => {
    setState(prev => ({ ...prev, loading: false, error }));
  };

  return {
    ...state,
    setLoading,
    setData,
    setError,
  };
}

import React from 'react';

// Create utils function if it doesn't exist
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}