/**
 * Loading Component
 * 
 * Displays a loading spinner with optional message.
 * Can be used as full-page or inline loading indicator.
 * 
 * @module components/common/Loading
 */

import React from 'react';
import { logger } from '../../utils/logger';

/**
 * Loading component props
 */
export interface LoadingProps {
  /** Loading message to display */
  message?: string;
  /** Full screen overlay */
  fullScreen?: boolean;
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Loading spinner component
 * 
 * @param props - Loading component props
 * @returns Loading indicator element
 */
export const Loading: React.FC<LoadingProps> = ({
  message = 'Loading...',
  fullScreen = false,
  size = 'md',
}) => {
  logger.entry('Loading', { message, fullScreen, size });

  /**
   * Get spinner size classes
   */
  const getSizeClasses = (): string => {
    const sizes = {
      sm: 'h-6 w-6',
      md: 'h-12 w-12',
      lg: 'h-16 w-16',
    };
    return sizes[size];
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    : 'flex items-center justify-center py-8';

  const spinnerClasses = getSizeClasses();

  logger.exit('Loading');

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <svg
          className={`animate-spin ${spinnerClasses} text-primary mx-auto`}
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
        {message && (
          <p className={`mt-4 text-sm ${fullScreen ? 'text-white' : 'text-gray-600'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};
