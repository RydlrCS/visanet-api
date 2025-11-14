/**
 * Transaction Detail Component
 * 
 * Displays comprehensive transaction information including:
 * - Transaction metadata (ID, type, status, amount, currency)
 * - Timestamps (created, updated, completed)
 * - Visa API fields (approval code, network reference, retrieval reference)
 * - Card information (sender and recipient)
 * - Transaction actions (Void for authorization, Reverse for push/pull)
 * 
 * User Journey: Transactions List → Click Transaction → View Details → 
 *               Perform Actions (Void/Reverse) → Updated Status
 * 
 * @module components/Transactions/TransactionDetail
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { logger } from '../../utils/logger';
import { apiClient, getErrorMessage } from '../../utils/api';
import { Loading, Alert, Button } from '../common';
import type { Transaction } from '../../types';

/**
 * Status badge color mapping
 */
const STATUS_COLORS: Record<Transaction['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  voided: 'bg-gray-100 text-gray-800',
};

/**
 * Transaction type display mapping
 */
const TYPE_LABELS: Record<Transaction['type'], string> = {
  authorization: 'Authorization',
  void: 'Void',
  push: 'Push (Transfer)',
  pull: 'Pull (Debit)',
  reversal: 'Reversal',
};

/**
 * Transaction detail component for viewing complete transaction information
 * 
 * Fetches and displays detailed transaction data including Visa API fields
 * and provides action buttons for void/reverse operations based on transaction
 * type and status.
 * 
 * @returns Transaction detail page component
 */
export const TransactionDetail: React.FC = () => {
  logger.entry('TransactionDetail');

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  /**
   * Fetch transaction details on component mount
   */
  useEffect(() => {
    if (id) {
      fetchTransaction();
    }
  }, [id]);

  /**
   * Fetch transaction details from API
   */
  const fetchTransaction = async () => {
    logger.entry('TransactionDetail.fetchTransaction', { id });
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.get<Transaction>(`/transactions/${id}`);
      setTransaction(response.data);
      logger.info('TransactionDetail', 'Transaction loaded', {
        transactionId: response.data._id,
        type: response.data.type,
        status: response.data.status,
      });
      logger.exit('TransactionDetail.fetchTransaction', { success: true });
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      logger.error('TransactionDetail', 'Failed to load transaction', { error: errorMessage });
      setError(errorMessage);
      logger.exit('TransactionDetail.fetchTransaction', { success: false });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if transaction can be voided
   * 
   * Authorization transactions can only be voided when status is 'completed'
   * 
   * @returns true if transaction can be voided
   */
  const canVoid = (): boolean => {
    if (!transaction) return false;
    
    const canPerformVoid = transaction.type === 'authorization' && 
                           transaction.status === 'completed';
    
    logger.debug('TransactionDetail', 'Checking void eligibility', { 
      canVoid: canPerformVoid,
      type: transaction.type,
      status: transaction.status,
    });
    
    return canPerformVoid;
  };

  /**
   * Check if transaction can be reversed
   * 
   * Push and Pull transactions can be reversed when status is 'completed'
   * 
   * @returns true if transaction can be reversed
   */
  const canReverse = (): boolean => {
    if (!transaction) return false;
    
    const canPerformReverse = (transaction.type === 'push' || transaction.type === 'pull') && 
                              transaction.status === 'completed';
    
    logger.debug('TransactionDetail', 'Checking reverse eligibility', { 
      canReverse: canPerformReverse,
      type: transaction.type,
      status: transaction.status,
    });
    
    return canPerformReverse;
  };

  /**
   * Handle void transaction action
   * 
   * Voids a completed authorization transaction
   */
  const handleVoid = async () => {
    logger.entry('TransactionDetail.handleVoid', { transactionId: id });
    
    if (!confirm('Are you sure you want to void this authorization? This action cannot be undone.')) {
      logger.info('TransactionDetail', 'Void cancelled by user');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await apiClient.post(`/transactions/${id}/void`);
      logger.info('TransactionDetail', 'Transaction voided successfully');
      setSuccessMessage('Transaction voided successfully');
      
      // Refresh transaction data
      await fetchTransaction();
      
      logger.exit('TransactionDetail.handleVoid', { success: true });
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      logger.error('TransactionDetail', 'Failed to void transaction', { error: errorMessage });
      setError(errorMessage);
      logger.exit('TransactionDetail.handleVoid', { success: false });
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Handle reverse transaction action
   * 
   * Reverses a completed push or pull transaction
   */
  const handleReverse = async () => {
    logger.entry('TransactionDetail.handleReverse', { transactionId: id });
    
    if (!confirm('Are you sure you want to reverse this transaction? This will refund the amount.')) {
      logger.info('TransactionDetail', 'Reverse cancelled by user');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await apiClient.post(`/transactions/${id}/reverse`);
      logger.info('TransactionDetail', 'Transaction reversed successfully');
      setSuccessMessage('Transaction reversed successfully');
      
      // Refresh transaction data
      await fetchTransaction();
      
      logger.exit('TransactionDetail.handleReverse', { success: true });
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      logger.error('TransactionDetail', 'Failed to reverse transaction', { error: errorMessage });
      setError(errorMessage);
      logger.exit('TransactionDetail.handleReverse', { success: false });
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Format currency for display
   * 
   * @param amount - Amount to format
   * @param currency - Currency code (ISO 4217)
   * @returns Formatted currency string
   */
  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  /**
   * Format date for display
   * 
   * @param dateString - ISO date string
   * @returns Formatted date string
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  /**
   * Render detail row component
   * 
   * @param label - Field label
   * @param value - Field value
   * @param monospace - Use monospace font for value
   * @returns Detail row JSX
   */
  const DetailRow: React.FC<{ label: string; value: React.ReactNode; monospace?: boolean }> = ({ 
    label, 
    value, 
    monospace = false 
  }) => (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className={`mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 ${monospace ? 'font-mono' : ''}`}>
        {value || <span className="text-gray-400">N/A</span>}
      </dd>
    </div>
  );

  logger.exit('TransactionDetail');

  // Loading state
  if (loading) {
    return <Loading fullScreen message="Loading transaction details..." />;
  }

  // Error state - transaction not found
  if (!transaction) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Alert
            variant="error"
            message={error || 'Transaction not found'}
          />
          <div className="mt-6">
            <Button onClick={() => navigate('/transactions')}>
              Back to Transactions
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/transactions')}
            className="text-primary hover:text-primary-dark mb-4 flex items-center"
          >
            ← Back to Transactions
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Transaction Details</h1>
              <p className="mt-2 text-sm text-gray-600">
                View complete transaction information and perform actions
              </p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[transaction.status]}`}>
              {transaction.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <Alert
            variant="success"
            message={successMessage}
            dismissible
            onClose={() => setSuccessMessage('')}
            className="mb-6"
          />
        )}

        {/* Error Message */}
        {error && (
          <Alert
            variant="error"
            message={error}
            dismissible
            onClose={() => setError('')}
            className="mb-6"
          />
        )}

        {/* Transaction Overview Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="text-center pb-6 border-b border-gray-200">
            <div className="text-sm text-gray-600 mb-2">{TYPE_LABELS[transaction.type]}</div>
            <div className="text-4xl font-bold text-gray-900">
              {formatCurrency(transaction.amount, transaction.currency)}
            </div>
            <div className="text-sm text-gray-600 mt-2">{transaction.currency}</div>
          </div>

          {/* Transaction Metadata */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Transaction Information</h2>
            <dl className="divide-y divide-gray-200">
              <DetailRow label="Transaction ID" value={transaction.transactionId} monospace />
              <DetailRow label="Database ID" value={transaction._id} monospace />
              <DetailRow label="Type" value={TYPE_LABELS[transaction.type]} />
              <DetailRow label="Status" value={transaction.status.toUpperCase()} />
              <DetailRow label="Amount" value={formatCurrency(transaction.amount, transaction.currency)} />
              <DetailRow label="Currency" value={transaction.currency} />
            </dl>
          </div>
        </div>

        {/* Visa API Fields */}
        {transaction.visaTransactionId && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Visa Network Information</h2>
            <dl className="divide-y divide-gray-200">
              <DetailRow label="Visa Transaction ID" value={transaction.visaTransactionId} monospace />
              {transaction.metadata?.approvalCode !== undefined && (
                <DetailRow label="Approval Code" value={String(transaction.metadata.approvalCode)} monospace />
              )}
              {transaction.metadata?.networkReferenceNumber !== undefined && (
                <DetailRow label="Network Reference" value={String(transaction.metadata.networkReferenceNumber)} monospace />
              )}
              {transaction.metadata?.retrievalReferenceNumber !== undefined && (
                <DetailRow label="Retrieval Reference" value={String(transaction.metadata.retrievalReferenceNumber)} monospace />
              )}
              {transaction.metadata?.systemTraceAuditNumber !== undefined && (
                <DetailRow label="System Trace Audit Number" value={String(transaction.metadata.systemTraceAuditNumber)} monospace />
              )}
            </dl>
          </div>
        )}

        {/* Card Information */}
        {transaction.cardId && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Card Information</h2>
            <dl className="divide-y divide-gray-200">
              <DetailRow label="Card ID" value={transaction.cardId} monospace />
              {transaction.metadata?.senderCard !== undefined && (
                <>
                  <DetailRow 
                    label="Sender Card" 
                    value={`**** **** **** ${String(transaction.metadata.senderCard)}`} 
                  />
                </>
              )}
              {transaction.metadata?.recipientCard !== undefined && (
                <>
                  <DetailRow 
                    label="Recipient Card" 
                    value={`**** **** **** ${String(transaction.metadata.recipientCard)}`} 
                  />
                </>
              )}
            </dl>
          </div>
        )}

        {/* Timestamps */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
          <dl className="divide-y divide-gray-200">
            <DetailRow label="Created At" value={formatDate(transaction.createdAt)} />
            <DetailRow label="Updated At" value={formatDate(transaction.updatedAt)} />
            {transaction.metadata?.completedAt !== undefined && (
              <DetailRow label="Completed At" value={formatDate(String(transaction.metadata.completedAt))} />
            )}
          </dl>
        </div>

        {/* Error Information */}
        {transaction.errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Error Details</h2>
            <p className="text-sm text-red-800">{transaction.errorMessage}</p>
          </div>
        )}

        {/* Additional Metadata */}
        {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
            <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto">
              {JSON.stringify(transaction.metadata, null, 2)}
            </pre>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
          <div className="flex flex-wrap gap-4">
            {canVoid() && (
              <Button
                variant="danger"
                onClick={handleVoid}
                loading={actionLoading}
                disabled={actionLoading}
              >
                Void Transaction
              </Button>
            )}
            {canReverse() && (
              <Button
                variant="danger"
                onClick={handleReverse}
                loading={actionLoading}
                disabled={actionLoading}
              >
                Reverse Transaction
              </Button>
            )}
            {!canVoid() && !canReverse() && (
              <p className="text-sm text-gray-600">
                No actions available for this transaction.
                {transaction.status === 'voided' && ' (Transaction has been voided)'}
                {transaction.status === 'failed' && ' (Transaction failed)'}
                {transaction.status === 'pending' && ' (Transaction is still pending)'}
              </p>
            )}
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6">
          <Button
            variant="secondary"
            onClick={() => navigate('/transactions')}
          >
            Back to Transactions List
          </Button>
        </div>
      </div>
    </div>
  );
};
