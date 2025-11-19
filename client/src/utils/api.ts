/**
 * API Client Utility for LocaPay Application
 * 
 * Provides a configured axios instance with request/response interceptors
 * for authentication, error handling, and logging.
 * 
 * @module utils/api
 */

import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from './logger';
import { getToken, clearToken } from './auth';
import type { ApiError } from '../types';

/**
 * Base API URL from environment variables
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Create and configure axios instance
 */
const createApiClient = (): AxiosInstance => {
  logger.entry('createApiClient');

  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  /**
   * Request interceptor to add authentication token
   */
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      logger.debug('ApiClient', 'Request interceptor', {
        method: config.method,
        url: config.url,
      });

      const token = getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        logger.debug('ApiClient', 'Added auth token to request');
      }

      return config;
    },
    (error: AxiosError) => {
      logger.error('ApiClient', 'Request interceptor error', error);
      return Promise.reject(error);
    }
  );

  /**
   * Response interceptor for error handling and logging
   */
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      logger.debug('ApiClient', 'Response received', {
        status: response.status,
        url: response.config.url,
      });
      return response;
    },
    (error: AxiosError<ApiError>) => {
      logger.error('ApiClient', 'Response error', {
        status: error.response?.status,
        url: error.config?.url,
        message: error.response?.data?.message || error.message,
      });

      // Handle 401 Unauthorized - clear token and redirect to login
      if (error.response?.status === 401) {
        logger.warn('ApiClient', 'Unauthorized request - clearing token');
        clearToken();
        window.location.href = '/login';
      }

      return Promise.reject(error);
    }
  );

  logger.exit('createApiClient');
  return instance;
};

/**
 * API client instance
 */
export const apiClient = createApiClient();

/**
 * Extract error message from API error response
 * @param error - Axios error or unknown error
 * @returns User-friendly error message
 */
export const getErrorMessage = (error: unknown): string => {
  logger.entry('getErrorMessage', { error });

  let message = 'An unexpected error occurred';

  if (axios.isAxiosError(error)) {
    // Network error (backend not running)
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      message = 'Unable to connect to server. Please ensure the backend is running on port 3000.';
    } else {
      const apiError = error.response?.data as ApiError | undefined;
      message = apiError?.message || error.message;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  logger.exit('getErrorMessage', { message });
  return message;
};
