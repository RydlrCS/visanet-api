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
      return;
    }

    setLoading(true);

    try {
      // Check if mock auth is enabled for testing
      const enableMockAuth = import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';
      
      if (enableMockAuth) {
        // Mock authentication for UI testing
        logger.info('Login', 'Using mock authentication');
        
        // Validate test credentials
        if (formData.email === 'test@rydlr.com' && formData.password === 'Test123!@#') {
          setTimeout(() => {
            const mockAuthData = {
              user: {
                id: '1',
                email: 'test@rydlr.com',
                name: 'Test User',
              },
              token: 'mock_jwt_token_for_testing'
            };
            login(mockAuthData);
            navigate('/dashboard');
            setLoading(false);
          }, 500);
          return;
        } else {
          throw new Error('Invalid test credentials. Use: test@rydlr.com / Test123!@#');
        }
      }

      // Real API authentication
      logger.info('Login', 'Submitting login request');
      const response = await apiClient.post<AuthResponse>('/auth/login', formData);
      
      logger.info('Login', 'Login successful');
      login(response.data);
      navigate('/dashboard');
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Login', 'Login failed', message);
      setApiError(message);
    } finally {
      setLoading(false);
    }

    logger.exit('Login.handleSubmit');
  };

  logger.exit('Login');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <img
            src="/logo-with-text.png"
            alt="Rydlr"
            className="mx-auto h-16 w-auto mb-6"
            onError={(e) => {
              // Fallback if logo doesn't load
              e.currentTarget.style.display = 'none';
            }}
          />
          <h2 className="text-3xl font-bold text-neutral-900 mb-2">
            Welcome Back
          </h2>
          <p className="text-neutral-600">
            Sign in to your Visanet API account
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 p-8">
          {apiError && (
            <Alert 
              message={apiError}
              variant="error" 
              className="mb-6"
              dismissible
              onClose={() => setApiError('')}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="you@company.com"
              required
              autoComplete="email"
              className="w-full"
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-neutral-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              fullWidth
              loading={loading}
            >
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-neutral-500">New to Rydlr?</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => navigate('/register')}
                className="w-full flex justify-center py-3 px-4 border-2 border-primary-600 rounded-lg text-primary-600 font-semibold hover:bg-primary-50 transition-all transform hover:scale-[1.02]"
              >
                Create an account
              </button>
            </div>
          </div>

          {/* Test Credentials Info */}
          <div className="mt-6 p-4 bg-secondary-50 border border-secondary-200 rounded-lg">
            <p className="text-xs text-secondary-800 font-medium mb-2">🧪 Test Credentials</p>
            <p className="text-xs text-secondary-700 font-mono">
              Email: test@rydlr.com<br />
              Password: Test123!@#
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-neutral-500">
          © 2025 Rydlr. All rights reserved. | Secured by Visa Direct
        </p>
      </div>
    </div>
  );
};
