/**
 * Authentication Context
 * 
 * Provides global authentication state and methods throughout the application.
 * Manages user login, logout, and authentication status.
 * 
 * @module contexts/AuthContext
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { logger } from '../utils/logger';
import { setToken, clearToken, getUser, setUser as saveUser, isAuthenticated as checkAuth } from '../utils/auth';
import type { User, AuthResponse } from '../types';

/**
 * Authentication context value interface
 */
interface AuthContextValue {
  /** Current authenticated user */
  user: User | null;
  /** Authentication status */
  isAuthenticated: boolean;
  /** Loading state */
  loading: boolean;
  /** Login function */
  login: (authData: AuthResponse) => void;
  /** Logout function */
  logout: () => void;
}

/**
 * Authentication context
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Auth provider props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication provider component
 * 
 * Wraps the application and provides authentication state
 * 
 * @param props - Provider props with children
 * @returns Provider component
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  logger.entry('AuthProvider');

  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Initialize authentication state from localStorage on mount
   */
  useEffect(() => {
    logger.debug('AuthProvider', 'Initializing auth state');
    
    const initAuth = () => {
      try {
        if (checkAuth()) {
          const savedUser = getUser() as User | null;
          if (savedUser) {
            setUserState(savedUser);
            logger.info('AuthProvider', 'User restored from storage', { userId: savedUser._id });
          }
        }
      } catch (error) {
        logger.error('AuthProvider', 'Failed to restore auth state', error);
        clearToken();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Login user and store credentials
   * 
   * @param authData - Authentication response with token and user
   */
  const login = (authData: AuthResponse) => {
    logger.entry('AuthProvider.login', { userId: authData.user._id });
    
    try {
      setToken(authData.token);
      saveUser(authData.user);
      setUserState(authData.user);
      logger.info('AuthProvider', 'User logged in successfully', { userId: authData.user._id });
    } catch (error) {
      logger.error('AuthProvider', 'Login failed', error);
      throw error;
    }
    
    logger.exit('AuthProvider.login');
  };

  /**
   * Logout user and clear credentials
   */
  const logout = () => {
    logger.entry('AuthProvider.logout');
    
    try {
      clearToken();
      setUserState(null);
      logger.info('AuthProvider', 'User logged out successfully');
    } catch (error) {
      logger.error('AuthProvider', 'Logout failed', error);
    }
    
    logger.exit('AuthProvider.logout');
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
  };

  logger.exit('AuthProvider');

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use authentication context
 * 
 * @returns Authentication context value
 * @throws Error if used outside AuthProvider
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    const error = 'useAuth must be used within an AuthProvider';
    logger.error('useAuth', error);
    throw new Error(error);
  }
  
  return context;
};
