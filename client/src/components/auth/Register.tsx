/**
 * Register Component
 * 
 * User registration form with validation and account creation.
 * Handles form validation, API calls, and error display.
 * 
 * @module components/auth/Register
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '../../utils/logger';
import { apiClient, getErrorMessage } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Alert } from '../common';
import type { AuthResponse, RegisterData } from '../../types';

/**
 * Register component for creating new user accounts
 * 
 * @returns Register form component
 */
export const Register: React.FC = () => {
  logger.entry('Register');

  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Partial<RegisterData & { confirmPassword: string }>>({});
  const [apiError, setApiError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  /**
   * Handle input change events
   * 
   * @param e - Change event from input
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    logger.debug('Register', `Form field changed: ${name}`);
    
    if (name === 'confirmPassword') {
      setConfirmPassword(value);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
    
    // Clear field error when user types
    setErrors(prev => ({
      ...prev,
      [name]: undefined,
    }));
  };

  /**
   * Validate registration form data
   * 
   * @returns true if form is valid, false otherwise
   */
  const validateForm = (): boolean => {
    logger.debug('Register', 'Validating form');
    const newErrors: Partial<RegisterData & { confirmPassword: string }> = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // First name validation
    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    }

    // Last name validation
    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    logger.debug('Register', 'Form validation result', { isValid });
    return isValid;
  };

  /**
   * Handle form submission
   * 
   * @param e - Form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.entry('Register.handleSubmit');
    
    setApiError('');

    if (!validateForm()) {
      logger.warn('Register', 'Form validation failed');
      logger.exit('Register.handleSubmit', { success: false });
      return;
    }

    setLoading(true);
    logger.info('Register', 'Attempting registration', { email: formData.email });

    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', formData);
      logger.info('Register', 'Registration successful', { userId: response.data.user._id });
      
      login(response.data);
      navigate('/dashboard');
      
      logger.exit('Register.handleSubmit', { success: true });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('Register', 'Registration failed', { error: errorMessage });
      setApiError(errorMessage);
      logger.exit('Register.handleSubmit', { success: false, error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  logger.exit('Register');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Register for a new LocaPay account
          </p>
        </div>

        {apiError && (
          <Alert
            variant="error"
            message={apiError}
            dismissible
            onClose={() => setApiError('')}
          />
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <Input
            label="First Name"
            name="firstName"
            type="text"
            value={formData.firstName}
            onChange={handleChange}
            error={errors.firstName}
            placeholder="Enter your first name"
            autoComplete="given-name"
            required
          />

          <Input
            label="Last Name"
            name="lastName"
            type="text"
            value={formData.lastName}
            onChange={handleChange}
            error={errors.lastName}
            placeholder="Enter your last name"
            autoComplete="family-name"
            required
          />

          <Input
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="Enter your email"
            autoComplete="email"
            required
          />

          <Input
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            placeholder="Create a password"
            autoComplete="new-password"
            required
          />

          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            placeholder="Confirm your password"
            autoComplete="new-password"
            required
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            disabled={loading}
          >
            Create Account
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="font-medium text-primary hover:text-primary-dark"
              >
                Sign in here
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
