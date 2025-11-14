/**
 * New Transaction Component
 * 
 * Form for creating new payment transactions with support for:
 * - Authorization: Pre-authorize a payment amount on a card
 * - Push (Transfer): Send money to a recipient card
 * - Pull (Debit): Request money from a card
 * 
 * User Journey: Dashboard/Transactions → New Transaction → Select Type → 
 *               Enter Details → Submit → Transaction Detail
 * 
 * @module components/Transactions/NewTransaction
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '../../utils/logger';
import { apiClient, getErrorMessage } from '../../utils/api';
import { Button, Input, Alert } from '../common';
import type { Card } from '../../types';

/**
 * Transaction form data interface
 */
interface TransactionFormData {
  /** Transaction type */
  type: 'authorization' | 'push' | 'pull';
  /** Transaction amount */
  amount: string;
  /** Currency code (ISO 4217) */
  currency: string;
  /** Sender card ID (for authorization and pull) */
  senderCardId: string;
  /** Recipient card number (for push/pull) */
  recipientCardNumber: string;
  /** Recipient name (for push/pull) */
  recipientName: string;
  /** Recipient expiry month (for push/pull) */
  recipientExpiryMonth: string;
  /** Recipient expiry year (for push/pull) */
  recipientExpiryYear: string;
  /** Transaction description/memo */
  description: string;
}

/**
 * Supported currencies
 */
const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
];

/**
 * New transaction component for initiating payments
 * 
 * Provides a comprehensive form for creating different types of transactions
 * with dynamic field display based on transaction type and real-time validation.
 * 
 * @returns New transaction form component
 */
export const NewTransaction: React.FC = () => {
  logger.entry('NewTransaction');

  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'authorization',
    amount: '',
    currency: 'USD',
    senderCardId: '',
    recipientCardNumber: '',
    recipientName: '',
    recipientExpiryMonth: '',
    recipientExpiryYear: '',
    description: '',
  });

  // UI state
  const [errors, setErrors] = useState<Partial<Record<keyof TransactionFormData, string>>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);

  /**
   * Fetch user's saved cards on component mount
   */
  useEffect(() => {
    fetchCards();
  }, []);

  /**
   * Fetch saved cards from API
   */
  const fetchCards = async () => {
    logger.entry('NewTransaction.fetchCards');
    setLoadingCards(true);

    try {
      const response = await apiClient.get<Card[]>('/cards');
      setCards(response.data);
      
      // Auto-select default card or first card
      if (response.data.length > 0) {
        const defaultCard = response.data.find(card => card.isDefault);
        const selectedCardId = defaultCard?._id || response.data[0]._id;
        setFormData(prev => ({ ...prev, senderCardId: selectedCardId }));
        logger.info('NewTransaction', 'Auto-selected card', { cardId: selectedCardId });
      }
      
      logger.info('NewTransaction', 'Cards loaded', { count: response.data.length });
      logger.exit('NewTransaction.fetchCards', { success: true });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('NewTransaction', 'Failed to load cards', { error: errorMessage });
      setApiError(`Failed to load cards: ${errorMessage}`);
      logger.exit('NewTransaction.fetchCards', { success: false });
    } finally {
      setLoadingCards(false);
    }
  };

  /**
   * Get transaction type display information
   * 
   * @param type - Transaction type
   * @returns Display information for the transaction type
   */
  const getTypeInfo = (type: TransactionFormData['type']): { 
    title: string; 
    description: string; 
    icon: string;
  } => {
    const info = {
      authorization: {
        title: 'Authorization',
        description: 'Pre-authorize a payment amount on a card (can be voided later)',
        icon: '🔒',
      },
      push: {
        title: 'Push (Transfer)',
        description: 'Send money to a recipient card (instant transfer)',
        icon: '💸',
      },
      pull: {
        title: 'Pull (Debit)',
        description: 'Request/debit money from a card',
        icon: '🔄',
      },
    };
    
    return info[type];
  };

  /**
   * Check if recipient fields are required based on transaction type
   * 
   * @returns true if recipient fields should be shown
   */
  const requiresRecipient = (): boolean => {
    return formData.type === 'push' || formData.type === 'pull';
  };

  /**
   * Validate amount input
   * 
   * @param amount - Amount string to validate
   * @returns Error message if invalid, undefined if valid
   */
  const validateAmount = (amount: string): string | undefined => {
    logger.debug('NewTransaction', 'Validating amount', { amount });
    
    if (!amount) {
      return 'Amount is required';
    }
    
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount)) {
      return 'Amount must be a valid number';
    }
    
    if (numAmount <= 0) {
      return 'Amount must be greater than 0';
    }
    
    if (numAmount > 999999.99) {
      return 'Amount cannot exceed $999,999.99';
    }
    
    // Check decimal places (max 2)
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      return 'Amount can have at most 2 decimal places';
    }
    
    return undefined;
  };

  /**
   * Format amount input to 2 decimal places
   * 
   * @param value - Raw amount input
   * @returns Formatted amount string
   */
  const formatAmount = (value: string): string => {
    // Remove non-numeric except decimal point
    let formatted = value.replace(/[^\d.]/g, '');
    
    // Allow only one decimal point
    const parts = formatted.split('.');
    if (parts.length > 2) {
      formatted = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts[1]?.length > 2) {
      formatted = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    return formatted;
  };

  /**
   * Validate card number format
   * 
   * @param cardNumber - Card number to validate
   * @returns Error message if invalid, undefined if valid
   */
  const validateCardNumber = (cardNumber: string): string | undefined => {
    logger.debug('NewTransaction', 'Validating card number');
    
    const digits = cardNumber.replace(/\s/g, '');
    
    if (!digits) {
      return 'Card number is required';
    }
    
    if (!/^\d+$/.test(digits)) {
      return 'Card number must contain only digits';
    }
    
    if (digits.length < 13 || digits.length > 19) {
      return 'Card number must be 13-19 digits';
    }
    
    return undefined;
  };

  /**
   * Validate expiry date
   * 
   * @param month - Expiry month
   * @param year - Expiry year
   * @returns Error message if invalid, undefined if valid
   */
  const validateExpiry = (month: string, year: string): string | undefined => {
    logger.debug('NewTransaction', 'Validating expiry date', { month, year });
    
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    if (!month || !year) {
      return 'Expiry date is required';
    }
    
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return 'Invalid expiry month (01-12)';
    }
    
    if (isNaN(yearNum) || year.length !== 2) {
      return 'Invalid expiry year (YY format)';
    }
    
    return undefined;
  };

  /**
   * Handle input change
   * 
   * @param field - Field name
   * @param value - New value
   */
  const handleInputChange = (field: keyof TransactionFormData, value: string) => {
    logger.debug('NewTransaction', `Input changed: ${field}`, { value: field === 'recipientCardNumber' ? '****' : value });
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  /**
   * Handle transaction type change
   * 
   * @param type - New transaction type
   */
  const handleTypeChange = (type: TransactionFormData['type']) => {
    logger.info('NewTransaction', 'Transaction type changed', { type });
    
    setFormData(prev => ({
      ...prev,
      type,
      // Clear recipient fields if switching to authorization
      recipientCardNumber: type === 'authorization' ? '' : prev.recipientCardNumber,
      recipientName: type === 'authorization' ? '' : prev.recipientName,
      recipientExpiryMonth: type === 'authorization' ? '' : prev.recipientExpiryMonth,
      recipientExpiryYear: type === 'authorization' ? '' : prev.recipientExpiryYear,
    }));
    
    // Clear errors when switching types
    setErrors({});
  };

  /**
   * Validate entire form
   * 
   * @returns true if form is valid
   */
  const validateForm = (): boolean => {
    logger.entry('NewTransaction.validateForm');
    
    const newErrors: Partial<Record<keyof TransactionFormData, string>> = {};

    // Amount validation
    const amountError = validateAmount(formData.amount);
    if (amountError) {
      newErrors.amount = amountError;
    }

    // Sender card validation (required for all types)
    if (!formData.senderCardId) {
      newErrors.senderCardId = 'Please select a card';
    }

    // Recipient validation (for push and pull)
    if (requiresRecipient()) {
      const cardError = validateCardNumber(formData.recipientCardNumber);
      if (cardError) {
        newErrors.recipientCardNumber = cardError;
      }

      if (!formData.recipientName.trim()) {
        newErrors.recipientName = 'Recipient name is required';
      }

      const expiryError = validateExpiry(formData.recipientExpiryMonth, formData.recipientExpiryYear);
      if (expiryError) {
        newErrors.recipientExpiryMonth = expiryError;
      }
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    
    logger.info('NewTransaction', 'Form validation result', { isValid, errorCount: Object.keys(newErrors).length });
    logger.exit('NewTransaction.validateForm', { isValid });
    
    return isValid;
  };

  /**
   * Handle form submission
   * 
   * @param e - Form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.entry('NewTransaction.handleSubmit', { type: formData.type });
    
    setApiError('');

    if (!validateForm()) {
      logger.warn('NewTransaction', 'Form validation failed');
      logger.exit('NewTransaction.handleSubmit', { success: false });
      return;
    }

    setLoading(true);
    logger.info('NewTransaction', 'Submitting transaction', { 
      type: formData.type, 
      amount: formData.amount,
      currency: formData.currency,
    });

    try {
      // Prepare transaction data based on type
      const transactionData: any = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        cardId: formData.senderCardId,
        description: formData.description || undefined,
      };

      // Add recipient details for push/pull
      if (requiresRecipient()) {
        transactionData.recipient = {
          cardNumber: formData.recipientCardNumber.replace(/\s/g, ''),
          cardholderName: formData.recipientName,
          expiryMonth: formData.recipientExpiryMonth,
          expiryYear: formData.recipientExpiryYear,
        };
      }

      logger.debug('NewTransaction', 'Sending transaction data to API', { type: formData.type });

      const response = await apiClient.post('/transactions', transactionData);
      
      logger.info('NewTransaction', 'Transaction created successfully', { 
        transactionId: response.data._id 
      });
      logger.exit('NewTransaction.handleSubmit', { success: true });
      
      // Navigate to transaction detail page
      navigate(`/transactions/${response.data._id}`);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('NewTransaction', 'Failed to create transaction', { error: errorMessage });
      setApiError(errorMessage);
      logger.exit('NewTransaction.handleSubmit', { success: false });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get selected card display info
   * 
   * @returns Selected card or null
   */
  const getSelectedCard = (): Card | null => {
    return cards.find(card => card._id === formData.senderCardId) || null;
  };

  logger.exit('NewTransaction');

  if (loadingCards) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading cards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/transactions')}
            className="text-primary hover:text-primary-dark mb-4 flex items-center"
          >
            ← Back to Transactions
          </button>
          <h1 className="text-3xl font-bold text-gray-900">New Transaction</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create a new payment transaction
          </p>
        </div>

        {/* No Cards Warning */}
        {cards.length === 0 && (
          <Alert
            variant="warning"
            message="You need to add a payment card before creating transactions."
            className="mb-6"
          />
        )}

        {/* API Error */}
        {apiError && (
          <Alert
            variant="error"
            message={apiError}
            dismissible
            onClose={() => setApiError('')}
          />
        )}

        {/* Transaction Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Transaction Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Transaction Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['authorization', 'push', 'pull'] as const).map((type) => {
                  const typeInfo = getTypeInfo(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeChange(type)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        formData.type === type
                          ? 'border-primary bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{typeInfo.icon}</div>
                      <div className="font-semibold text-gray-900">{typeInfo.title}</div>
                      <div className="text-xs text-gray-600 mt-1">{typeInfo.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount and Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Amount"
                  name="amount"
                  type="text"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', formatAmount(e.target.value))}
                  error={errors.amount}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency <span className="text-danger">*</span>
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} - {curr.name} ({curr.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sender Card Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.type === 'pull' ? 'Your Card (Recipient)' : 'Your Card (Sender)'}
                <span className="text-danger ml-1">*</span>
              </label>
              <select
                value={formData.senderCardId}
                onChange={(e) => handleInputChange('senderCardId', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.senderCardId ? 'border-danger' : 'border-gray-300'
                }`}
                disabled={cards.length === 0}
                required
              >
                <option value="">Select a card</option>
                {cards.map((card) => (
                  <option key={card._id} value={card._id}>
                    {card.cardholderName} - **** {card.cardNumber} ({card.expiryMonth}/{card.expiryYear})
                    {card.isDefault && ' - Default'}
                  </option>
                ))}
              </select>
              {errors.senderCardId && (
                <p className="mt-1 text-sm text-danger">{errors.senderCardId}</p>
              )}
              {cards.length === 0 && (
                <p className="mt-1 text-sm text-gray-600">
                  <button
                    type="button"
                    onClick={() => navigate('/cards/add')}
                    className="text-primary hover:text-primary-dark underline"
                  >
                    Add a card
                  </button>{' '}
                  to continue
                </p>
              )}
            </div>

            {/* Recipient Details (for push/pull) */}
            {requiresRecipient() && (
              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {formData.type === 'push' ? 'Recipient Details' : 'Source Card Details'}
                </h3>

                <Input
                  label={formData.type === 'push' ? 'Recipient Card Number' : 'Source Card Number'}
                  name="recipientCardNumber"
                  type="text"
                  value={formData.recipientCardNumber}
                  onChange={(e) => handleInputChange('recipientCardNumber', e.target.value)}
                  error={errors.recipientCardNumber}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  required
                />

                <Input
                  label={formData.type === 'push' ? 'Recipient Name' : 'Cardholder Name'}
                  name="recipientName"
                  type="text"
                  value={formData.recipientName}
                  onChange={(e) => handleInputChange('recipientName', e.target.value.toUpperCase())}
                  error={errors.recipientName}
                  placeholder="JOHN DOE"
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Expiry Month"
                    name="recipientExpiryMonth"
                    type="text"
                    value={formData.recipientExpiryMonth}
                    onChange={(e) => handleInputChange('recipientExpiryMonth', e.target.value.replace(/\D/g, '').substring(0, 2))}
                    error={errors.recipientExpiryMonth}
                    placeholder="MM"
                    maxLength={2}
                    required
                  />
                  <Input
                    label="Expiry Year"
                    name="recipientExpiryYear"
                    type="text"
                    value={formData.recipientExpiryYear}
                    onChange={(e) => handleInputChange('recipientExpiryYear', e.target.value.replace(/\D/g, '').substring(0, 2))}
                    error={errors.recipientExpiryYear}
                    placeholder="YY"
                    maxLength={2}
                    required
                  />
                </div>
              </div>
            )}

            {/* Description (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Add a note about this transaction..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                maxLength={200}
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.description.length}/200 characters
              </p>
            </div>

            {/* Transaction Summary */}
            {formData.amount && formData.senderCardId && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">Transaction Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">{getTypeInfo(formData.type).title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium text-lg">
                      {CURRENCIES.find(c => c.code === formData.currency)?.symbol}
                      {parseFloat(formData.amount || '0').toFixed(2)}
                    </span>
                  </div>
                  {getSelectedCard() && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Card:</span>
                      <span className="font-medium">**** {getSelectedCard()?.cardNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/transactions')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={loading || cards.length === 0}
                fullWidth
              >
                Create Transaction
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
