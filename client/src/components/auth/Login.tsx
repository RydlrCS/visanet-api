/**
 * Login Component
 * 
 * User login form with email and password authentication.
 * Handles form validation, API calls, and error display.
 * 
 * @module components/auth/Login
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '../../utils/logger';
import { apiClient, getErrorMessage } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Alert } from '../common';
import type { AuthResponse, LoginCredentials } from '../../types';

/**
 * Login component for user authentication
 * 
 * @returns Login form component
 */
export const Login: React.FC = () => {
  logger.entry('Login');

  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginCredentials>>({});
  const [apiError, setApiError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  /**
   * Handle input change events
   * 
   * @param e - Change event from input
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    logger.debug('Login', `Form field changed: ${name}`);
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear field error when user types
    if (errors[name as keyof LoginCredentials]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  /**
   * Validate login form data
   * 
   * @returns true if form is valid, false otherwise
   */
  const validateForm = (): boolean => {
    logger.debug('Login', 'Validating form');
    const newErrors: Partial<LoginCredentials> = {};

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

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    logger.debug('Login', 'Form validation result', { isValid });
    return isValid;
  };

  /**
   * Handle form submission
   * 
   * @param e - Form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.entry('Login.handleSubmit');
    
    setApiError('');

    if (!validateForm()) {
      logger.warn('Login', 'Form validation failed');
      logger.exit('Login.handleSubmit', { success: false });
      return;
    }

    setLoading(true);
    logger.info('Login', 'Attempting login', { email: formData.email });

    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', formData);
      logger.info('Login', 'Login successful', { userId: response.data.user._id });
      
      login(response.data);
      navigate('/dashboard');
      
      logger.exit('Login.handleSubmit', { success: true });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('Login', 'Login failed', { error: errorMessage });
      setApiError(errorMessage);
      logger.exit('Login.handleSubmit', { success: false, error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  logger.exit('Login');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            LocaPay Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account to continue
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
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            disabled={loading}
          >
            Sign In
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="font-medium text-primary hover:text-primary-dark"
              >
                Register here
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
