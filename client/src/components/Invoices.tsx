import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './common';
import { apiClient } from '../utils/api';
import { logger } from '../utils/logger';

/**
 * Interface for invoice data
 * @interface Invoice
 */
interface Invoice {
  _id: string;
  invoiceNumber: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  description?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  customer?: {
    name: string;
    email: string;
    address?: string;
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
 * Interface for date range filter
 * @interface DateRange
 */
interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * Status filter options for invoices
 * @type {InvoiceStatus}
 */
type InvoiceStatus = 'all' | 'pending' | 'paid' | 'overdue' | 'cancelled';

/**
 * Invoices component for managing and viewing invoices
 * 
 * Features:
 * - List all invoices with pagination
 * - Filter by status (all, pending, paid, overdue, cancelled)
 * - Filter by date range (issue date)
 * - View invoice details in modal
 * - Download invoice as PDF
 * - Status badges with color coding
 * - Amount and date formatting
 * - Empty state handling
 * - Loading and error states
 * 
 * @component
 * @returns {JSX.Element} Invoices management page
 */
export const Invoices: React.FC = () => {
  logger.entry('Invoices component');

  const navigate = useNavigate();

  // State management
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState<InvoiceStatus>('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: '',
  });
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  });
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  /**
   * Fetch invoices from API with pagination and filters
   * 
   * @async
   * @function fetchInvoices
   * @param {number} page - Page number to fetch
   * @returns {Promise<void>}
   */
  const fetchInvoices = async (page: number = 1): Promise<void> => {
    logger.entry('Invoices.fetchInvoices', { page });
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        page,
        limit: pagination.limit,
      };

      // Add status filter if not 'all'
      if (activeStatusFilter !== 'all') {
        params.status = activeStatusFilter;
      }

      // Add date range filter if set
      if (dateRange.startDate) {
        params.startDate = dateRange.startDate;
      }
      if (dateRange.endDate) {
        params.endDate = dateRange.endDate;
      }

      const response = await apiClient.get('/invoices', { params });

      setInvoices(response.data.invoices || []);
      setPagination(response.data.pagination || { total: 0, page: 1, limit: 20, pages: 1 });
      logger.exit('Invoices.fetchInvoices', { success: true, count: response.data.invoices?.length || 0 });
    } catch (err: any) {
      logger.error('Invoices.fetchInvoices', err?.message || 'Unknown error');
      setError('Failed to load invoices. Please try again.');
      logger.exit('Invoices.fetchInvoices', { success: false });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch invoice details by ID
   * 
   * @async
   * @function fetchInvoiceDetails
   * @param {string} id - Invoice ID to fetch
   * @returns {Promise<void>}
   */
  const fetchInvoiceDetails = async (id: string): Promise<void> => {
    logger.entry('Invoices.fetchInvoiceDetails', { id });

    try {
      const response = await apiClient.get(`/invoices/${id}`);
      setSelectedInvoice(response.data);
      setShowDetailModal(true);
      logger.exit('Invoices.fetchInvoiceDetails', { success: true });
    } catch (err: any) {
      logger.error('Invoices.fetchInvoiceDetails', err?.message || 'Unknown error');
      setError('Failed to load invoice details. Please try again.');
      logger.exit('Invoices.fetchInvoiceDetails', { success: false });
    }
  };

  /**
   * Download invoice as PDF
   * 
   * @async
   * @function downloadInvoice
   * @param {string} id - Invoice ID to download
   * @param {string} invoiceNumber - Invoice number for filename
   * @returns {Promise<void>}
   */
  const downloadInvoice = async (id: string, invoiceNumber: string): Promise<void> => {
    logger.entry('Invoices.downloadInvoice', { id, invoiceNumber });
    setDownloading(id);

    try {
      const response = await apiClient.get(`/invoices/${id}/download`, {
        responseType: 'blob',
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      logger.exit('Invoices.downloadInvoice', { success: true });
    } catch (err: any) {
      logger.error('Invoices.downloadInvoice', err?.message || 'Unknown error');
      setError('Failed to download invoice. Please try again.');
      logger.exit('Invoices.downloadInvoice', { success: false });
    } finally {
      setDownloading(null);
    }
  };

  /**
   * Apply filters to invoices list
   * 
   * @function applyFilters
   * @returns {void}
   */
  const applyFilters = (): void => {
    logger.entry('Invoices.applyFilters', { status: activeStatusFilter, dateRange });
    
    let filtered = [...invoices];

    // Filter by status
    if (activeStatusFilter !== 'all') {
      filtered = filtered.filter(inv => inv.status === activeStatusFilter);
    }

    // Filter by date range
    if (dateRange.startDate) {
      filtered = filtered.filter(inv => new Date(inv.issueDate) >= new Date(dateRange.startDate));
    }
    if (dateRange.endDate) {
      filtered = filtered.filter(inv => new Date(inv.issueDate) <= new Date(dateRange.endDate));
    }

    setFilteredInvoices(filtered);
    logger.exit('Invoices.applyFilters', { count: filtered.length });
  };

  /**
   * Get status badge color based on invoice status
   * 
   * @function getStatusBadgeColor
   * @param {string} status - Invoice status
   * @returns {string} Tailwind CSS classes for badge color
   */
  const getStatusBadgeColor = (status: string): string => {
    logger.entry('Invoices.getStatusBadgeColor', { status });
    
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    
    const result = colors[status] || 'bg-gray-100 text-gray-800';
    logger.exit('Invoices.getStatusBadgeColor', { result });
    return result;
  };

  /**
   * Format currency amount
   * 
   * @function formatCurrency
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code
   * @returns {string} Formatted currency string
   */
  const formatCurrency = (amount: number, currency: string): string => {
    logger.entry('Invoices.formatCurrency', { amount, currency });
    const result = `${currency} ${amount.toFixed(2)}`;
    logger.exit('Invoices.formatCurrency', { result });
    return result;
  };

  /**
   * Format date to readable string
   * 
   * @function formatDate
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date string
   */
  const formatDate = (dateString: string): string => {
    logger.entry('Invoices.formatDate', { dateString });
    const result = new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    logger.exit('Invoices.formatDate', { result });
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
    logger.entry('Invoices.handlePageChange', { newPage });
    fetchInvoices(newPage);
    logger.exit('Invoices.handlePageChange');
  };

  /**
   * Handle status filter change
   * 
   * @function handleStatusFilterChange
   * @param {InvoiceStatus} status - New status filter
   * @returns {void}
   */
  const handleStatusFilterChange = (status: InvoiceStatus): void => {
    logger.entry('Invoices.handleStatusFilterChange', { status });
    setActiveStatusFilter(status);
    setPagination(prev => ({ ...prev, page: 1 }));
    logger.exit('Invoices.handleStatusFilterChange');
  };

  /**
   * Handle date range filter change
   * 
   * @function handleDateRangeChange
   * @returns {void}
   */
  const handleDateRangeChange = (): void => {
    logger.entry('Invoices.handleDateRangeChange', { dateRange });
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchInvoices(1);
    logger.exit('Invoices.handleDateRangeChange');
  };

  /**
   * Clear all filters
   * 
   * @function clearFilters
   * @returns {void}
   */
  const clearFilters = (): void => {
    logger.entry('Invoices.clearFilters');
    setActiveStatusFilter('all');
    setDateRange({ startDate: '', endDate: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
    logger.exit('Invoices.clearFilters');
  };

  // Fetch invoices on component mount and when filters change
  useEffect(() => {
    fetchInvoices(pagination.page);
  }, [activeStatusFilter]);

  // Apply local filters when invoices change
  useEffect(() => {
    applyFilters();
  }, [invoices, activeStatusFilter, dateRange]);

  // Render loading state
  if (loading && invoices.length === 0) {
    logger.exit('Invoices component', { state: 'loading' });
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading invoices...</div>
      </div>
    );
  }

  logger.exit('Invoices component', { state: 'rendered', count: filteredInvoices.length });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
        <Button
          variant="secondary"
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Status
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleStatusFilterChange('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeStatusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleStatusFilterChange('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeStatusFilter === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => handleStatusFilterChange('paid')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeStatusFilter === 'paid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => handleStatusFilterChange('overdue')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeStatusFilter === 'overdue'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Overdue
            </button>
            <button
              onClick={() => handleStatusFilterChange('cancelled')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeStatusFilter === 'cancelled'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancelled
            </button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Date Range
          </label>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleDateRangeChange} disabled={!dateRange.startDate && !dateRange.endDate}>
                Apply Date Filter
              </Button>
              <Button variant="secondary" onClick={clearFilters}>
                Clear All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      {filteredInvoices.length === 0 ? (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No invoices found</h3>
          <p className="text-gray-600">
            {activeStatusFilter !== 'all' || dateRange.startDate || dateRange.endDate
              ? 'Try adjusting your filters to see more results.'
              : "You don't have any invoices yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issue Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                          invoice.status
                        )}`}
                      >
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(invoice.issueDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => fetchInvoiceDetails(invoice._id)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => downloadInvoice(invoice._id, invoice.invoiceNumber)}
                        disabled={downloading === invoice._id}
                        className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                      >
                        {downloading === invoice._id ? 'Downloading...' : 'Download'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {/* Invoice Detail Modal */}
      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Invoice {selectedInvoice.invoiceNumber}
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                      selectedInvoice.status
                    )}`}
                  >
                    {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Issue Date</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(selectedInvoice.issueDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(selectedInvoice.dueDate)}</p>
                </div>
                {selectedInvoice.paidDate && (
                  <div>
                    <p className="text-sm text-gray-600">Paid Date</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedInvoice.paidDate)}</p>
                  </div>
                )}
              </div>

              {/* Customer Information */}
              {selectedInvoice.customer && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Customer Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-1">
                    <p className="text-sm"><span className="font-medium">Name:</span> {selectedInvoice.customer.name}</p>
                    <p className="text-sm"><span className="font-medium">Email:</span> {selectedInvoice.customer.email}</p>
                    {selectedInvoice.customer.address && (
                      <p className="text-sm"><span className="font-medium">Address:</span> {selectedInvoice.customer.address}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Line Items */}
              {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Line Items</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Unit Price</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedInvoice.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              {formatCurrency(item.unitPrice, selectedInvoice.currency)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              {formatCurrency(item.total, selectedInvoice.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedInvoice.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedInvoice.description}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  variant="secondary"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => downloadInvoice(selectedInvoice._id, selectedInvoice.invoiceNumber)}
                  disabled={downloading === selectedInvoice._id}
                >
                  {downloading === selectedInvoice._id ? 'Downloading...' : 'Download PDF'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
