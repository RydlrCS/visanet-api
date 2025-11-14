/**
 * Input Component
 * 
 * Reusable input component with label, error handling, and validation.
 * Supports text, email, password, and number input types.
 * 
 * @module components/common/Input
 */

import React from 'react';
import { logger } from '../../utils/logger';

/**
 * Input component props
 */
export interface InputProps {
  /** Input label text */
  label: string;
  /** Input name attribute */
  name: string;
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel';
  /** Input value */
  value: string;
  /** Change handler function */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Error message to display */
  error?: string;
  /** Required field */
  required?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Autocomplete attribute */
  autoComplete?: string;
}

/**
 * Input component for form fields
 * 
 * @param props - Input component props
 * @returns Input element with label
 */
export const Input: React.FC<InputProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  className = '',
  autoComplete,
}) => {
  logger.entry('Input', { name, type, hasError: !!error });

  /**
   * Handle input change event with logging
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    logger.debug('Input', `Input changed: ${name}`, { 
      value: type === 'password' ? '[HIDDEN]' : e.target.value 
    });
    onChange(e);
  };

  const baseInputClasses = 'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all';
  const errorClasses = error ? 'border-danger focus:ring-danger' : 'border-gray-300';
  const disabledClasses = disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white';
  const inputClasses = `${baseInputClasses} ${errorClasses} ${disabledClasses} ${className}`.trim();

  logger.exit('Input');

  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        className={inputClasses}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && (
        <p id={`${name}-error`} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
};
