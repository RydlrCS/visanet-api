/**
 * Authentication Utility for LocaPay Application
 * 
 * Handles JWT token storage, retrieval, and validation in localStorage.
 * Provides helper functions for authentication state management.
 * 
 * @module utils/auth
 */

import { logger } from './logger';

/**
 * Local storage key for JWT token
 */
const TOKEN_KEY = 'locapay_auth_token';

/**
 * Local storage key for user data
 */
const USER_KEY = 'locapay_user';

/**
 * Store authentication token in localStorage
 * @param token - JWT authentication token
 */
export const setToken = (token: string): void => {
  logger.entry('setToken');
  try {
    localStorage.setItem(TOKEN_KEY, token);
    logger.info('Auth', 'Token stored successfully');
  } catch (error) {
    logger.error('Auth', 'Failed to store token', error);
  }
  logger.exit('setToken');
};

/**
 * Retrieve authentication token from localStorage
 * @returns JWT token or null if not found
 */
export const getToken = (): string | null => {
  logger.entry('getToken');
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    logger.debug('Auth', 'Token retrieved', { hasToken: !!token });
    logger.exit('getToken', { hasToken: !!token });
    return token;
  } catch (error) {
    logger.error('Auth', 'Failed to retrieve token', error);
    logger.exit('getToken', { hasToken: false });
    return null;
  }
};

/**
 * Clear authentication token from localStorage
 */
export const clearToken = (): void => {
  logger.entry('clearToken');
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    logger.info('Auth', 'Token and user data cleared');
  } catch (error) {
    logger.error('Auth', 'Failed to clear token', error);
  }
  logger.exit('clearToken');
};

/**
 * Check if user is authenticated
 * @returns true if user has valid token
 */
export const isAuthenticated = (): boolean => {
  logger.entry('isAuthenticated');
  const token = getToken();
  const authenticated = !!token;
  logger.debug('Auth', 'Authentication check', { authenticated });
  logger.exit('isAuthenticated', { authenticated });
  return authenticated;
};

/**
 * Store user data in localStorage
 * @param user - User data object
 */
export const setUser = (user: unknown): void => {
  logger.entry('setUser', { user });
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    logger.info('Auth', 'User data stored successfully');
  } catch (error) {
    logger.error('Auth', 'Failed to store user data', error);
  }
  logger.exit('setUser');
};

/**
 * Retrieve user data from localStorage
 * @returns User data object or null if not found
 */
export const getUser = (): unknown | null => {
  logger.entry('getUser');
  try {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) {
      logger.debug('Auth', 'No user data found');
      logger.exit('getUser', { user: null });
      return null;
    }
    const user = JSON.parse(userStr);
    logger.debug('Auth', 'User data retrieved');
    logger.exit('getUser', { hasUser: true });
    return user;
  } catch (error) {
    logger.error('Auth', 'Failed to retrieve user data', error);
    logger.exit('getUser', { user: null });
    return null;
  }
};
