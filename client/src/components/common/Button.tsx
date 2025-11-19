/**
 * Button Component
 * 
 * Reusable button component with variants and loading states.
 * Supports primary, secondary, danger, and success variants.
 * 
 * @module components/common/Button
 */

import React from 'react';
import { logger } from '../../utils/logger';

/**
 * Button component props
 */
export interface ButtonProps {
  /** Button text or children elements */
  children: React.ReactNode;
  /** Click handler function */
  onClick?: () => void;
  /** Button variant style */
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  /** Button type attribute */
  type?: 'button' | 'submit' | 'reset';
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Button component for user interactions
 * 
 * @param props - Button component props
 * @returns Button element
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = false,
  className = '',
}) => {
  logger.entry('Button', { variant, disabled, loading });

  /**
   * Handle button click event
   */
  const handleClick = () => {
    logger.debug('Button', 'Button clicked', { variant });
    if (onClick && !disabled && !loading) {
      onClick();
    }
  };

  /**
   * Get variant-specific CSS classes
   */
  const getVariantClasses = (): string => {
    const variants = {
      primary: 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500',
      secondary: 'bg-secondary-500 hover:bg-secondary-600 text-white focus:ring-secondary-400',
      danger: 'bg-danger hover:bg-danger-dark text-white focus:ring-danger',
      success: 'bg-success hover:bg-success-dark text-white focus:ring-success',
    };
    return variants[variant];
  };

  const baseClasses = 'px-4 py-3 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 transform hover:scale-[1.02] active:scale-[0.98]';
  const widthClasses = fullWidth ? 'w-full' : '';
  const disabledClasses = disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  const variantClasses = getVariantClasses();

  const buttonClasses = `${baseClasses} ${variantClasses} ${widthClasses} ${disabledClasses} ${className}`.trim();

  logger.exit('Button');

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
};
