import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './common';
import { apiClient } from '../utils/api';
import { logger } from '../utils/logger';

/**
 * Interface for notification data
 * @interface Notification
 */
interface Notification {
  _id: string;
  type: 'transaction' | 'system' | 'security';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: {
    transactionId?: string;
    amount?: number;
    currency?: string;
    [key: string]: any;
  };
}

/**
 * Interface for pagination metadata
 * @interface PaginationMeta
 */
interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/**
 * Type filter options for notifications
 * @type {NotificationType}
 */
type NotificationType = 'all' | 'transaction' | 'system' | 'security';

/**
 * Notifications component for managing user notifications
 * 
 * Features:
 * - List all notifications with pagination
 * - Filter notifications by type (all, transaction, system, security)
 * - Mark individual notifications as read
 * - Mark all notifications as read
 * - Visual distinction between read/unread notifications
 * - Notification type badges with color coding
 * - Click notification to navigate to related resource
 * - Empty state handling
 * - Loading and error states
 * 
 * @component
 * @returns {JSX.Element} Notifications center page
 */
export const Notifications: React.FC = () => {
  logger.entry('Notifications component');

  const navigate = useNavigate();

  // State management
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<NotificationType>('all');
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  });
  const [markingRead, setMarkingRead] = useState<string | null>(null);

  /**
   * Fetch notifications from API with pagination
   * 
   * @async
   * @function fetchNotifications
   * @param {number} page - Page number to fetch
   * @returns {Promise<void>}
   */
  const fetchNotifications = async (page: number = 1): Promise<void> => {
    logger.entry('Notifications.fetchNotifications', { page });
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/notifications', {
        params: {
          page,
          limit: pagination.limit,
        },
      });

      setNotifications(response.data.notifications || []);
      setPagination(response.data.pagination || { total: 0, page: 1, limit: 20, pages: 1 });
      logger.exit('Notifications.fetchNotifications', { success: true, count: response.data.notifications?.length || 0 });
    } catch (err: any) {
      logger.error('Notifications.fetchNotifications', err?.message || 'Unknown error');
      setError('Failed to load notifications. Please try again.');
      logger.exit('Notifications.fetchNotifications', { success: false });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mark a notification as read
   * 
   * @async
   * @function markAsRead
   * @param {string} id - Notification ID to mark as read
   * @returns {Promise<void>}
   */
  const markAsRead = async (id: string): Promise<void> => {
    logger.entry('Notifications.markAsRead', { id });
    
    // Don't mark if already read
    const notification = notifications.find(n => n._id === id);
    if (notification?.read) {
      logger.exit('Notifications.markAsRead', { alreadyRead: true });
      return;
    }

    setMarkingRead(id);

    try {
      await apiClient.put(`/notifications/${id}/read`);
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, read: true } : n))
      );
      
      logger.exit('Notifications.markAsRead', { success: true });
    } catch (err: any) {
      logger.error('Notifications.markAsRead', err?.message || 'Unknown error');
      logger.exit('Notifications.markAsRead', { success: false });
    } finally {
      setMarkingRead(null);
    }
  };

  /**
   * Mark all notifications as read
   * 
   * @async
   * @function markAllAsRead
   * @returns {Promise<void>}
   */
  const markAllAsRead = async (): Promise<void> => {
    logger.entry('Notifications.markAllAsRead');
    
    const unreadIds = notifications.filter(n => !n.read).map(n => n._id);
    if (unreadIds.length === 0) {
      logger.exit('Notifications.markAllAsRead', { noneToMark: true });
      return;
    }

    setMarkingRead('all');

    try {
      // Mark all as read via API (assuming bulk endpoint)
      await Promise.all(
        unreadIds.map(id => apiClient.put(`/notifications/${id}/read`))
      );
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      
      logger.exit('Notifications.markAllAsRead', { success: true, count: unreadIds.length });
    } catch (err: any) {
      logger.error('Notifications.markAllAsRead', err?.message || 'Unknown error');
      setError('Failed to mark all as read. Please try again.');
      logger.exit('Notifications.markAllAsRead', { success: false });
    } finally {
      setMarkingRead(null);
    }
  };

  /**
   * Handle notification click - mark as read and navigate if applicable
   * 
   * @function handleNotificationClick
   * @param {Notification} notification - Notification to handle
   * @returns {void}
   */
  const handleNotificationClick = (notification: Notification): void => {
    logger.entry('Notifications.handleNotificationClick', { id: notification._id, type: notification.type });
    
    // Mark as read
    if (!notification.read) {
      markAsRead(notification._id);
    }

    // Navigate to related resource if applicable
    if (notification.type === 'transaction' && notification.metadata?.transactionId) {
      navigate(`/transactions/${notification.metadata.transactionId}`);
    }
    
    logger.exit('Notifications.handleNotificationClick');
  };

  /**
   * Filter notifications by type
   * 
   * @function filterNotifications
   * @param {NotificationType} type - Filter type to apply
   * @returns {void}
   */
  const filterNotifications = (type: NotificationType): void => {
    logger.entry('Notifications.filterNotifications', { type });
    
    setActiveFilter(type);
    
    if (type === 'all') {
      setFilteredNotifications(notifications);
    } else {
      setFilteredNotifications(notifications.filter(n => n.type === type));
    }
    
    logger.exit('Notifications.filterNotifications', { count: filteredNotifications.length });
  };

  /**
   * Get badge color based on notification type
   * 
   * @function getTypeBadgeColor
   * @param {string} type - Notification type
   * @returns {string} Tailwind CSS classes for badge color
   */
  const getTypeBadgeColor = (type: string): string => {
    logger.entry('Notifications.getTypeBadgeColor', { type });
    
    const colors: Record<string, string> = {
      transaction: 'bg-blue-100 text-blue-800',
      system: 'bg-gray-100 text-gray-800',
      security: 'bg-red-100 text-red-800',
    };
    
    const result = colors[type] || 'bg-gray-100 text-gray-800';
    logger.exit('Notifications.getTypeBadgeColor', { result });
    return result;
  };

  /**
   * Format date to relative time (e.g., "2 hours ago")
   * 
   * @function formatRelativeTime
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted relative time
   */
  const formatRelativeTime = (dateString: string): string => {
    logger.entry('Notifications.formatRelativeTime', { dateString });
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let result: string;
    if (diffMins < 1) {
      result = 'Just now';
    } else if (diffMins < 60) {
      result = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      result = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      result = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      result = date.toLocaleDateString();
    }
    
    logger.exit('Notifications.formatRelativeTime', { result });
    return result;
  };

  /**
   * Handle page change for pagination
   * 
   * @function handlePageChange
   * @param {number} newPage - New page number
   * @returns {void}
   */
  const handlePageChange = (newPage: number): void => {
    logger.entry('Notifications.handlePageChange', { newPage });
    fetchNotifications(newPage);
    logger.exit('Notifications.handlePageChange');
  };

  // Fetch notifications on component mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Apply filter whenever notifications change
  useEffect(() => {
    filterNotifications(activeFilter);
  }, [notifications, activeFilter]);

  // Render loading state
  if (loading) {
    logger.exit('Notifications component', { state: 'loading' });
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading notifications...</div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  logger.exit('Notifications component', { state: 'rendered', count: filteredNotifications.length });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex space-x-3">
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              onClick={markAllAsRead}
              disabled={markingRead === 'all'}
            >
              {markingRead === 'all' ? 'Marking...' : 'Mark All Read'}
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setActiveFilter('transaction')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeFilter === 'transaction'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Transactions ({notifications.filter(n => n.type === 'transaction').length})
          </button>
          <button
            onClick={() => setActiveFilter('system')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeFilter === 'system'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            System ({notifications.filter(n => n.type === 'system').length})
          </button>
          <button
            onClick={() => setActiveFilter('security')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeFilter === 'security'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Security ({notifications.filter(n => n.type === 'security').length})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications</h3>
          <p className="text-gray-600">
            {activeFilter === 'all'
              ? "You're all caught up!"
              : `No ${activeFilter} notifications at this time.`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md divide-y divide-gray-200">
          {filteredNotifications.map((notification) => (
            <div
              key={notification._id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                !notification.read ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(
                        notification.type
                      )}`}
                    >
                      {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                    </span>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    {notification.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                  {notification.metadata?.amount && (
                    <p className="text-sm font-medium text-gray-900">
                      Amount: {notification.metadata.currency || 'USD'}{' '}
                      {notification.metadata.amount.toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex-shrink-0 text-right">
                  <p className="text-xs text-gray-500">
                    {formatRelativeTime(notification.createdAt)}
                  </p>
                  {!notification.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification._id);
                      }}
                      disabled={markingRead === notification._id}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                    >
                      {markingRead === notification._id ? 'Marking...' : 'Mark read'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="secondary"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1 || loading}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="secondary"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages || loading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
