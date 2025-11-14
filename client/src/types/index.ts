/**
 * TypeScript Type Definitions for LocaPay Application
 * 
 * This file contains all TypeScript interfaces and types used throughout
 * the LocaPay payment processing application for type safety.
 * 
 * @module types
 */

/**
 * User authentication response from API
 */
export interface AuthResponse {
  token: string;
  user: User;
}

/**
 * User entity from database
 */
export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data
 */
export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/**
 * Card entity from database
 */
export interface Card {
  _id: string;
  userId: string;
  cardNumber: string; // Last 4 digits
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Full card data for adding new card
 */
export interface AddCardData {
  cardNumber: string;
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

/**
 * Transaction entity from database
 */
export interface Transaction {
  _id: string;
  userId: string;
  type: 'authorization' | 'void' | 'push' | 'pull' | 'reversal';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'voided';
  cardId?: string;
  transactionId: string;
  visaTransactionId?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create transaction request
 */
export interface CreateTransactionData {
  type: 'authorization' | 'push' | 'pull';
  amount: number;
  currency: string;
  cardId?: string;
}

/**
 * API error response
 */
export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalAmount: number;
  recentTransactions: Transaction[];
}
