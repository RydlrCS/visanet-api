/**
 * Forgot Password Component
 * 
 * Multi-step password recovery flow:
 * 1. Email entry and verification
 * 2. Verification code validation
 * 3. New password entry
 * 
 * User Journey: Login → "Forgot Password?" → Email → Code → New Password → Login
 * 
 * @module components/auth/ForgotPassword
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '../../utils/logger';
import { apiClient, getErrorMessage } from '../../utils/api';
import { Button, Input, Alert } from '../common';

/**
 * Password recovery step enum
 */
type RecoveryStep = 'email' | 'code' | 'password';

/**
 * Forgot password component for account recovery
 * 
 * Implements a three-step recovery process with comprehensive validation
 * and error handling at each stage.
 * 
 * @returns Forgot password form component
 */
export const ForgotPassword: React.FC = () => {
  logger.entry('ForgotPassword');

  const navigate = useNavigate();
  
  // Step management
  const [currentStep, setCurrentStep] = useState<RecoveryStep>('email');
  
  // Form data
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Validate email format
   * 
   * @param email - Email address to validate
   * @returns true if valid email format
   */
  const isValidEmail = (email: string): boolean => {
    logger.debug('ForgotPassword', 'Validating email format', { email });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Handle email submission (Step 1)
   * Sends verification code to user's email
   */
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.entry('ForgotPassword.handleEmailSubmit', { email });
    
    setApiError('');
    setErrors({});

    // Validate email
    if (!email) {
      logger.warn('ForgotPassword', 'Email is required');
      setErrors({ email: 'Email is required' });
      logger.exit('ForgotPassword.handleEmailSubmit', { success: false });
      return;
    }

    if (!isValidEmail(email)) {
      logger.warn('ForgotPassword', 'Invalid email format');
      setErrors({ email: 'Please enter a valid email address' });
      logger.exit('ForgotPassword.handleEmailSubmit', { success: false });
      return;
    }

    setLoading(true);
    logger.info('ForgotPassword', 'Requesting password reset', { email });

    try {
      await apiClient.post('/auth/forgot-password', { email });
      logger.info('ForgotPassword', 'Verification code sent successfully');
      
      setSuccessMessage('Verification code sent to your email');
      setCurrentStep('code');
      
      logger.exit('ForgotPassword.handleEmailSubmit', { success: true, nextStep: 'code' });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('ForgotPassword', 'Failed to send verification code', { error: errorMessage });
      setApiError(errorMessage);
      logger.exit('ForgotPassword.handleEmailSubmit', { success: false });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle verification code submission (Step 2)
   * Validates the code sent to user's email
   */
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.entry('ForgotPassword.handleCodeSubmit');
    
    setApiError('');
    setErrors({});

    // Validate code
    if (!verificationCode) {
      logger.warn('ForgotPassword', 'Verification code is required');
      setErrors({ code: 'Verification code is required' });
      logger.exit('ForgotPassword.handleCodeSubmit', { success: false });
      return;
    }

    if (verificationCode.length !== 6) {
      logger.warn('ForgotPassword', 'Invalid code length');
      setErrors({ code: 'Verification code must be 6 digits' });
      logger.exit('ForgotPassword.handleCodeSubmit', { success: false });
      return;
    }

    setLoading(true);
    logger.info('ForgotPassword', 'Verifying code');

    try {
      await apiClient.post('/auth/verify-reset-code', { 
        email, 
        code: verificationCode 
      });
      logger.info('ForgotPassword', 'Code verified successfully');
      
      setSuccessMessage('Code verified! Please enter your new password');
      setCurrentStep('password');
      
      logger.exit('ForgotPassword.handleCodeSubmit', { success: true, nextStep: 'password' });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('ForgotPassword', 'Code verification failed', { error: errorMessage });
      setApiError(errorMessage);
      logger.exit('ForgotPassword.handleCodeSubmit', { success: false });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle new password submission (Step 3)
   * Resets the user's password and redirects to login
   */
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.entry('ForgotPassword.handlePasswordSubmit');
    
    setApiError('');
    setErrors({});

    // Validate password
    if (!newPassword) {
      logger.warn('ForgotPassword', 'Password is required');
      setErrors({ password: 'Password is required' });
      logger.exit('ForgotPassword.handlePasswordSubmit', { success: false });
      return;
    }

    if (newPassword.length < 6) {
      logger.warn('ForgotPassword', 'Password too short');
      setErrors({ password: 'Password must be at least 6 characters' });
      logger.exit('ForgotPassword.handlePasswordSubmit', { success: false });
      return;
    }

    if (newPassword !== confirmPassword) {
      logger.warn('ForgotPassword', 'Passwords do not match');
      setErrors({ confirmPassword: 'Passwords do not match' });
      logger.exit('ForgotPassword.handlePasswordSubmit', { success: false });
      return;
    }

    setLoading(true);
    logger.info('ForgotPassword', 'Resetting password');

    try {
      await apiClient.post('/auth/reset-password', {
        email,
        code: verificationCode,
        newPassword,
      });
      logger.info('ForgotPassword', 'Password reset successful');
      
      setSuccessMessage('Password reset successfully! Redirecting to login...');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        logger.info('ForgotPassword', 'Redirecting to login');
        navigate('/login');
      }, 2000);
      
      logger.exit('ForgotPassword.handlePasswordSubmit', { success: true });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('ForgotPassword', 'Password reset failed', { error: errorMessage });
      setApiError(errorMessage);
      logger.exit('ForgotPassword.handlePasswordSubmit', { success: false });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Render step 1: Email entry
   */
  const renderEmailStep = () => {
    logger.debug('ForgotPassword', 'Rendering email step');
    
    return (
      <form onSubmit={handleEmailSubmit} className="space-y-6">
        <Input
          label="Email Address"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="Enter your email address"
          autoComplete="email"
          required
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={loading}
          disabled={loading}
        >
          Send Verification Code
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-sm text-primary hover:text-primary-dark"
          >
            Back to Login
          </button>
        </div>
      </form>
    );
  };

  /**
   * Render step 2: Verification code entry
   */
  const renderCodeStep = () => {
    logger.debug('ForgotPassword', 'Rendering code step');
    
    return (
      <form onSubmit={handleCodeSubmit} className="space-y-6">
        <Input
          label="Verification Code"
          name="code"
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          error={errors.code}
          placeholder="Enter 6-digit code"
          maxLength={6}
          required
        />

        <p className="text-sm text-gray-600">
          We sent a verification code to <strong>{email}</strong>
        </p>

        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={loading}
          disabled={loading}
        >
          Verify Code
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setCurrentStep('email')}
            className="text-sm text-primary hover:text-primary-dark"
          >
            Use different email
          </button>
        </div>
      </form>
    );
  };

  /**
   * Render step 3: New password entry
   */
  const renderPasswordStep = () => {
    logger.debug('ForgotPassword', 'Rendering password step');
    
    return (
      <form onSubmit={handlePasswordSubmit} className="space-y-6">
        <Input
          label="New Password"
          name="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={errors.password}
          placeholder="Enter new password"
          autoComplete="new-password"
          required
        />

        <Input
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          placeholder="Confirm new password"
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
          Reset Password
        </Button>
      </form>
    );
  };

  /**
   * Get step title based on current step
   */
  const getStepTitle = (): string => {
    const titles = {
      email: 'Forgot Password',
      code: 'Verify Your Email',
      password: 'Create New Password',
    };
    return titles[currentStep];
  };

  /**
   * Get step description based on current step
   */
  const getStepDescription = (): string => {
    const descriptions = {
      email: 'Enter your email to receive a verification code',
      code: 'Enter the verification code sent to your email',
      password: 'Choose a strong password for your account',
    };
    return descriptions[currentStep];
  };

  logger.exit('ForgotPassword');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {getStepTitle()}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {getStepDescription()}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center space-x-2">
          <div className={`h-2 w-12 rounded ${currentStep === 'email' ? 'bg-primary' : 'bg-gray-300'}`} />
          <div className={`h-2 w-12 rounded ${currentStep === 'code' ? 'bg-primary' : 'bg-gray-300'}`} />
          <div className={`h-2 w-12 rounded ${currentStep === 'password' ? 'bg-primary' : 'bg-gray-300'}`} />
        </div>

        {/* Success Message */}
        {successMessage && (
          <Alert
            variant="success"
            message={successMessage}
            dismissible
            onClose={() => setSuccessMessage('')}
          />
        )}

        {/* Error Message */}
        {apiError && (
          <Alert
            variant="error"
            message={apiError}
            dismissible
            onClose={() => setApiError('')}
          />
        )}

        {/* Form Content */}
        <div className="mt-8">
          {currentStep === 'email' && renderEmailStep()}
          {currentStep === 'code' && renderCodeStep()}
          {currentStep === 'password' && renderPasswordStep()}
        </div>
      </div>
    </div>
  );
};
