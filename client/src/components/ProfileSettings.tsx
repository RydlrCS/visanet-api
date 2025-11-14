import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button } from './common';
import { apiClient } from '../utils/api';
import { logger } from '../utils/logger';

/**
 * Interface for user profile data
 * @interface ProfileData
 */
interface ProfileData {
  name: string;
  email: string;
  businessName?: string;
  businessAddress?: string;
  phoneNumber?: string;
  timezone?: string;
  notifications?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

/**
 * Interface for password change data
 * @interface PasswordData
 */
interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Interface for form validation errors
 * @interface ValidationErrors
 */
interface ValidationErrors {
  [key: string]: string;
}

/**
 * ProfileSettings component for managing user profile, password, and preferences
 * 
 * Features:
 * - Profile information update (name, email, phone)
 * - Password change with strength validation
 * - Business information management
 * - Account preferences (timezone, notifications)
 * - Real-time validation and error feedback
 * - Separate save actions for each section
 * 
 * @component
 * @returns {JSX.Element} ProfileSettings page with multiple editable sections
 */
export const ProfileSettings: React.FC = () => {
  logger.entry('ProfileSettings component');

  const navigate = useNavigate();

  // Profile state
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    email: '',
    businessName: '',
    businessAddress: '',
    phoneNumber: '',
    timezone: 'America/New_York',
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
  });

  // Password state
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // Track which section is being saved
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * Fetch user profile data on component mount
   * 
   * @async
   * @function fetchProfile
   * @returns {Promise<void>}
   */
  const fetchProfile = async (): Promise<void> => {
    logger.entry('ProfileSettings.fetchProfile');
    
    try {
      const response = await apiClient.get('/profile');
      setProfileData(response.data);
      logger.exit('ProfileSettings.fetchProfile', { success: true });
    } catch (error: any) {
      logger.error('ProfileSettings.fetchProfile', error?.message || 'Unknown error');
      setErrors({ fetch: 'Failed to load profile data. Please refresh the page.' });
      logger.exit('ProfileSettings.fetchProfile', { success: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  /**
   * Validate email format using regex
   * 
   * @function validateEmail
   * @param {string} email - Email address to validate
   * @returns {boolean} True if valid email format
   */
  const validateEmail = (email: string): boolean => {
    logger.entry('ProfileSettings.validateEmail', { email });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    logger.exit('ProfileSettings.validateEmail', { isValid });
    return isValid;
  };

  /**
   * Validate phone number format (basic validation)
   * 
   * @function validatePhoneNumber
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if valid phone format
   */
  const validatePhoneNumber = (phone: string): boolean => {
    logger.entry('ProfileSettings.validatePhoneNumber', { phone });
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
    const isValid = !phone || phoneRegex.test(phone);
    logger.exit('ProfileSettings.validatePhoneNumber', { isValid });
    return isValid;
  };

  /**
   * Validate password strength
   * Requirements: min 8 chars, uppercase, lowercase, number, special char
   * 
   * @function validatePasswordStrength
   * @param {string} password - Password to validate
   * @returns {string | null} Error message or null if valid
   */
  const validatePasswordStrength = (password: string): string | null => {
    logger.entry('ProfileSettings.validatePasswordStrength');
    
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    
    logger.exit('ProfileSettings.validatePasswordStrength', { valid: true });
    return null;
  };

  /**
   * Validate profile form data
   * 
   * @function validateProfileForm
   * @returns {ValidationErrors} Object with field-level errors
   */
  const validateProfileForm = (): ValidationErrors => {
    logger.entry('ProfileSettings.validateProfileForm');
    const newErrors: ValidationErrors = {};

    if (!profileData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!profileData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(profileData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (profileData.phoneNumber && !validatePhoneNumber(profileData.phoneNumber)) {
      newErrors.phoneNumber = 'Invalid phone number format';
    }

    logger.exit('ProfileSettings.validateProfileForm', { errorCount: Object.keys(newErrors).length });
    return newErrors;
  };

  /**
   * Validate password change form data
   * 
   * @function validatePasswordForm
   * @returns {ValidationErrors} Object with field-level errors
   */
  const validatePasswordForm = (): ValidationErrors => {
    logger.entry('ProfileSettings.validatePasswordForm');
    const newErrors: ValidationErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else {
      const strengthError = validatePasswordStrength(passwordData.newPassword);
      if (strengthError) {
        newErrors.newPassword = strengthError;
      }
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    logger.exit('ProfileSettings.validatePasswordForm', { errorCount: Object.keys(newErrors).length });
    return newErrors;
  };

  /**
   * Handle profile data update
   * 
   * @async
   * @function handleProfileUpdate
   * @param {React.FormEvent} e - Form submit event
   * @returns {Promise<void>}
   */
  const handleProfileUpdate = async (e: React.FormEvent): Promise<void> => {
    logger.entry('ProfileSettings.handleProfileUpdate');
    e.preventDefault();

    const validationErrors = validateProfileForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      logger.exit('ProfileSettings.handleProfileUpdate', { success: false, reason: 'validation' });
      return;
    }

    setSaving('profile');
    setErrors({});
    setSuccessMessage(null);

    try {
      await apiClient.put('/profile', {
        name: profileData.name,
        email: profileData.email,
        businessName: profileData.businessName,
        businessAddress: profileData.businessAddress,
        phoneNumber: profileData.phoneNumber,
        timezone: profileData.timezone,
        notifications: profileData.notifications,
      });

      setSuccessMessage('Profile updated successfully');
      logger.exit('ProfileSettings.handleProfileUpdate', { success: true });
    } catch (error: any) {
      logger.error('ProfileSettings.handleProfileUpdate', error?.message || 'Unknown error');
      setErrors({ 
        profile: error.response?.data?.message || 'Failed to update profile. Please try again.' 
      });
      logger.exit('ProfileSettings.handleProfileUpdate', { success: false });
    } finally {
      setSaving(null);
    }
  };

  /**
   * Handle password change
   * 
   * @async
   * @function handlePasswordChange
   * @param {React.FormEvent} e - Form submit event
   * @returns {Promise<void>}
   */
  const handlePasswordChange = async (e: React.FormEvent): Promise<void> => {
    logger.entry('ProfileSettings.handlePasswordChange');
    e.preventDefault();

    const validationErrors = validatePasswordForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      logger.exit('ProfileSettings.handlePasswordChange', { success: false, reason: 'validation' });
      return;
    }

    setSaving('password');
    setErrors({});
    setSuccessMessage(null);

    try {
      await apiClient.put('/profile/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setSuccessMessage('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      logger.exit('ProfileSettings.handlePasswordChange', { success: true });
    } catch (error: any) {
      logger.error('ProfileSettings.handlePasswordChange', error?.message || 'Unknown error');
      setErrors({ 
        password: error.response?.data?.message || 'Failed to change password. Please check your current password.' 
      });
      logger.exit('ProfileSettings.handlePasswordChange', { success: false });
    } finally {
      setSaving(null);
    }
  };

  /**
   * Handle notification preference toggle
   * 
   * @function handleNotificationToggle
   * @param {keyof ProfileData['notifications']} type - Notification type to toggle
   * @returns {void}
   */
  const handleNotificationToggle = (type: keyof NonNullable<ProfileData['notifications']>): void => {
    logger.entry('ProfileSettings.handleNotificationToggle', { type });
    
    setProfileData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications!,
        [type]: !prev.notifications![type],
      },
    }));
    
    logger.exit('ProfileSettings.handleNotificationToggle');
  };

  if (loading) {
    logger.exit('ProfileSettings component', { state: 'loading' });
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    );
  }

  logger.exit('ProfileSettings component', { state: 'rendered' });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <Button
          variant="secondary"
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {successMessage}
        </div>
      )}

      {/* General Error */}
      {errors.fetch && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {errors.fetch}
        </div>
      )}

      {/* Profile Information Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleProfileUpdate} className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
            
            <div className="space-y-4">
              <Input
                label="Full Name"
                name="name"
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                error={errors.name}
                required
              />

              <Input
                label="Email Address"
                name="email"
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                error={errors.email}
                required
              />

              <Input
                label="Phone Number"
                name="phoneNumber"
                type="tel"
                value={profileData.phoneNumber || ''}
                onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                error={errors.phoneNumber}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          {errors.profile && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {errors.profile}
            </div>
          )}

          <Button
            type="submit"
            disabled={saving === 'profile'}
            className="w-full sm:w-auto"
          >
            {saving === 'profile' ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>
      </div>

      {/* Business Information Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleProfileUpdate} className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Business Information</h2>
            
            <div className="space-y-4">
              <Input
                label="Business Name"
                name="businessName"
                type="text"
                value={profileData.businessName || ''}
                onChange={(e) => setProfileData({ ...profileData, businessName: e.target.value })}
                placeholder="Optional"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Address
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  value={profileData.businessAddress || ''}
                  onChange={(e) => setProfileData({ ...profileData, businessAddress: e.target.value })}
                  placeholder="Street address, city, state, ZIP code"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={saving === 'profile'}
            className="w-full sm:w-auto"
          >
            {saving === 'profile' ? 'Saving...' : 'Save Business Info'}
          </Button>
        </form>
      </div>

      {/* Password Change Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handlePasswordChange} className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Password</h2>
            
            <div className="space-y-4">
              <Input
                label="Current Password"
                name="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                error={errors.currentPassword}
                required
              />

              <Input
                label="New Password"
                name="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                error={errors.newPassword}
                required
              />

              <Input
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                error={errors.confirmPassword}
                required
              />

              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <p className="font-medium mb-1">Password Requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>At least 8 characters long</li>
                  <li>Contains uppercase and lowercase letters</li>
                  <li>Contains at least one number</li>
                  <li>Contains at least one special character</li>
                </ul>
              </div>
            </div>
          </div>

          {errors.password && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {errors.password}
            </div>
          )}

          <Button
            type="submit"
            disabled={saving === 'password'}
            className="w-full sm:w-auto"
          >
            {saving === 'password' ? 'Changing...' : 'Change Password'}
          </Button>
        </form>
      </div>

      {/* Account Preferences Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleProfileUpdate} className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Preferences</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={profileData.timezone}
                  onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="America/Anchorage">Alaska Time (AKT)</option>
                  <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Notification Preferences
                </label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={profileData.notifications?.email || false}
                      onChange={() => handleNotificationToggle('email')}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Email Notifications</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={profileData.notifications?.sms || false}
                      onChange={() => handleNotificationToggle('sms')}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">SMS Notifications</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={profileData.notifications?.push || false}
                      onChange={() => handleNotificationToggle('push')}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Push Notifications</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={saving === 'profile'}
            className="w-full sm:w-auto"
          >
            {saving === 'profile' ? 'Saving...' : 'Save Preferences'}
          </Button>
        </form>
      </div>
    </div>
  );
};
