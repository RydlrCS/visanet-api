/**
 * Dashboard Component
 * 
 * Main dashboard view showing overview statistics, recent transactions,
 * and quick action buttons for the LocaPay payment processing system.
 * 
 * User Journey: Landing page after login - shows account overview
 * 
 * @module components/Dashboard
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '../utils/logger';
import { apiClient, getErrorMessage } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { Loading, Alert, Button } from './common';
import type { DashboardStats, Transaction } from '../types';

/**
 * Dashboard component - main view after authentication
 * 
 * @returns Dashboard component
 */
export const Dashboard: React.FC = () => {
  logger.entry('Dashboard');

  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  /**
   * Fetch dashboard statistics from API
   */
  useEffect(() => {
    const fetchStats = async () => {
      logger.entry('Dashboard.fetchStats');
      setLoading(true);
      setError('');

      try {
        // Check if mock mode is enabled
        const enableMockAuth = import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';
        
        if (enableMockAuth) {
          // Use mock data for UI testing
          logger.info('Dashboard', 'Using mock dashboard data');
          setTimeout(() => {
            const mockStats: DashboardStats = {
              totalTransactions: 156,
              successfulTransactions: 142,
              failedTransactions: 8,
              pendingTransactions: 6,
              totalVolume: 245680.50,
              todayVolume: 12450.00,
              recentTransactions: [
                {
                  _id: '1',
                  userId: '1',
                  type: 'push',
                  amount: 1250.00,
                  currency: 'USD',
                  status: 'completed',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                {
                  _id: '2',
                  userId: '1',
                  type: 'pull',
                  amount: 850.00,
                  currency: 'USD',
                  status: 'completed',
                  createdAt: new Date(Date.now() - 3600000).toISOString(),
                  updatedAt: new Date(Date.now() - 3600000).toISOString(),
                },
                {
                  _id: '3',
                  userId: '1',
                  type: 'push',
                  amount: 2100.00,
                  currency: 'USD',
                  status: 'pending',
                  createdAt: new Date(Date.now() - 7200000).toISOString(),
                  updatedAt: new Date(Date.now() - 7200000).toISOString(),
                },
              ],
            };
            setStats(mockStats);
            setLoading(false);
          }, 300);
          return;
        }

        // Real API call
        const response = await apiClient.get<DashboardStats>('/dashboard/stats');
        setStats(response.data);
        logger.info('Dashboard', 'Stats loaded successfully', {
          totalTransactions: response.data.totalTransactions,
        });
        logger.exit('Dashboard.fetchStats', { success: true });
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        logger.error('Dashboard', 'Failed to load stats', { error: errorMessage });
        setError(errorMessage);
        logger.exit('Dashboard.fetchStats', { success: false });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  /**
   * Handle logout action
   */
  const handleLogout = () => {
    logger.info('Dashboard', 'User logging out');
    logout();
    navigate('/login');
  };

  /**
   * Format currency for display
   * 
   * @param amount - Amount to format
   * @returns Formatted currency string
   */
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  /**
   * Format date for display
   * 
   * @param dateString - ISO date string
   * @returns Formatted date string
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get status badge classes
   * 
   * @param status - Transaction status
   * @returns CSS classes for status badge
   */
  const getStatusClasses = (status: Transaction['status']): string => {
    const statusClasses = {
      completed: 'bg-success text-white',
      pending: 'bg-warning text-white',
      failed: 'bg-danger text-white',
      voided: 'bg-gray-500 text-white',
    };
    return statusClasses[status];
  };

  logger.exit('Dashboard');

  if (loading) {
    return <Loading fullScreen message="Loading dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">LocaPay Dashboard</h1>
              <p className="text-sm text-gray-600">
                Welcome back, {user?.firstName} {user?.lastName}
              </p>
            </div>
            <div className="flex space-x-4">
              <Button variant="secondary" onClick={() => navigate('/cards')}>
                Manage Cards
              </Button>
              <Button variant="secondary" onClick={() => navigate('/transactions')}>
                View Transactions
              </Button>
              <Button variant="danger" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert
            variant="error"
            message={error}
            dismissible
            onClose={() => setError('')}
            className="mb-6"
          />
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Transactions */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats?.totalTransactions || 0}
                </p>
              </div>
              <div className="bg-primary bg-opacity-10 p-3 rounded-full">
                <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          {/* Successful Transactions */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Successful</p>
                <p className="text-3xl font-bold text-success mt-2">
                  {stats?.successfulTransactions || 0}
                </p>
              </div>
              <div className="bg-success bg-opacity-10 p-3 rounded-full">
                <svg className="h-8 w-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Failed Transactions */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-3xl font-bold text-danger mt-2">
                  {stats?.failedTransactions || 0}
                </p>
              </div>
              <div className="bg-danger bg-opacity-10 p-3 rounded-full">
                <svg className="h-8 w-8 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Amount */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatCurrency(stats?.totalAmount || 0)}
                </p>
              </div>
              <div className="bg-secondary bg-opacity-10 p-3 rounded-full">
                <svg className="h-8 w-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="primary"
              onClick={() => navigate('/transactions/new')}
              fullWidth
            >
              New Transaction
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/cards/add')}
              fullWidth
            >
              Add Payment Card
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/settings')}
              fullWidth
            >
              Account Settings
            </Button>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
                  stats.recentTransactions.map((transaction) => (
                    <tr key={transaction._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.transactionId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                        {transaction.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(transaction.amount)} {transaction.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClasses(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(transaction.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => navigate(`/transactions/${transaction._id}`)}
                          className="text-primary hover:text-primary-dark"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No transactions yet. Create your first transaction to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {stats?.recentTransactions && stats.recentTransactions.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => navigate('/transactions')}
              >
                View All Transactions
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
