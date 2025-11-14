/**
 * Add Card Component
 * 
 * Form for adding a new payment card with comprehensive validation:
 * - Luhn algorithm for card number validation
 * - Real-time card number formatting (XXXX XXXX XXXX XXXX)
 * - CVV validation (3-4 digits based on card type)
 * - Expiry date validation (MM/YY format, future dates only)
 * - Cardholder name validation
 * 
 * User Journey: Dashboard/Cards → Add New Card → Form → Success → Cards List
 * 
 * @module components/Cards/AddCard
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '../../utils/logger';
import { apiClient, getErrorMessage } from '../../utils/api';
import { Button, Input, Alert } from '../common';

/**
 * Card form data interface
 */
interface CardFormData {
  /** Card number (16 digits) */
  cardNumber: string;
  /** Cardholder name as shown on card */
  cardholderName: string;
  /** Expiry month (MM) */
  expiryMonth: string;
  /** Expiry year (YY) */
  expiryYear: string;
  /** Card verification value (CVV/CVC) */
  cvv: string;
  /** Billing zip code */
  zipCode: string;
}

/**
 * Card type based on number pattern
 */
type CardType = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';

/**
 * Add card component for securely storing payment methods
 * 
 * Implements PCI DSS best practices for card data handling:
 * - Client-side validation before transmission
 * - Luhn algorithm verification
 * - Card type detection
 * - Formatted display for better UX
 * 
 * @returns Add card form component
 */
export const AddCard: React.FC = () => {
  logger.entry('AddCard');

  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState<CardFormData>({
    cardNumber: '',
    cardholderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    zipCode: '',
  });

  // UI state
  const [errors, setErrors] = useState<Partial<CardFormData>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cardType, setCardType] = useState<CardType>('unknown');

  /**
   * Detect card type from card number prefix
   * 
   * @param cardNumber - Card number (formatted or raw)
   * @returns Detected card type
   */
  const detectCardType = (cardNumber: string): CardType => {
    logger.debug('AddCard', 'Detecting card type', { cardNumber: cardNumber.substring(0, 4) + '****' });
    
    const digits = cardNumber.replace(/\s/g, '');
    
    // Visa: starts with 4
    if (/^4/.test(digits)) {
      return 'visa';
    }
    
    // Mastercard: starts with 51-55 or 2221-2720
    if (/^5[1-5]/.test(digits) || /^2(22[1-9]|2[3-9][0-9]|[3-6][0-9]{2}|7[0-1][0-9]|720)/.test(digits)) {
      return 'mastercard';
    }
    
    // American Express: starts with 34 or 37
    if (/^3[47]/.test(digits)) {
      return 'amex';
    }
    
    // Discover: starts with 6011, 622126-622925, 644-649, or 65
    if (/^(6011|622(12[6-9]|1[3-9][0-9]|[2-8][0-9]{2}|9[0-1][0-9]|92[0-5])|64[4-9]|65)/.test(digits)) {
      return 'discover';
    }
    
    return 'unknown';
  };

  /**
   * Validate card number using Luhn algorithm
   * 
   * The Luhn algorithm (mod 10) verifies card number validity:
   * 1. Double every second digit from right to left
   * 2. If doubling results in 2-digit number, add digits together
   * 3. Sum all digits
   * 4. Valid if sum mod 10 equals 0
   * 
   * @param cardNumber - Card number to validate
   * @returns true if valid by Luhn algorithm
   */
  const validateLuhn = (cardNumber: string): boolean => {
    logger.entry('AddCard.validateLuhn');
    
    const digits = cardNumber.replace(/\s/g, '');
    
    if (!/^\d+$/.test(digits)) {
      logger.warn('AddCard', 'Card number contains non-numeric characters');
      logger.exit('AddCard.validateLuhn', { valid: false });
      return false;
    }

    let sum = 0;
    let isEven = false;

    // Process digits from right to left
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9; // Same as adding the two digits
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    const valid = sum % 10 === 0;
    logger.debug('AddCard', 'Luhn validation result', { valid, checksum: sum });
    logger.exit('AddCard.validateLuhn', { valid });
    
    return valid;
  };

  /**
   * Format card number with spaces (XXXX XXXX XXXX XXXX)
   * 
   * @param value - Raw card number input
   * @returns Formatted card number
   */
  const formatCardNumber = (value: string): string => {
    logger.debug('AddCard', 'Formatting card number');
    
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Limit to 16 digits (19 for some cards, but 16 is standard)
    const limited = digits.substring(0, 16);
    
    // Add space every 4 digits
    const formatted = limited.replace(/(\d{4})(?=\d)/g, '$1 ');
    
    return formatted;
  };

  /**
   * Format expiry input (MM/YY)
   * 
   * @param value - Raw expiry input
   * @param isMonth - true for month field, false for year
   * @returns Formatted expiry value
   */
  const formatExpiry = (value: string, isMonth: boolean): string => {
    const digits = value.replace(/\D/g, '');
    return isMonth ? digits.substring(0, 2) : digits.substring(0, 2);
  };

  /**
   * Handle card number input change
   * 
   * @param e - Input change event
   */
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    logger.debug('AddCard', 'Card number changed');
    
    const formatted = formatCardNumber(e.target.value);
    setFormData(prev => ({ ...prev, cardNumber: formatted }));
    
    // Detect card type
    const type = detectCardType(formatted);
    setCardType(type);
    logger.info('AddCard', 'Card type detected', { type });
    
    // Clear error when user types
    if (errors.cardNumber) {
      setErrors(prev => ({ ...prev, cardNumber: undefined }));
    }
  };

  /**
   * Handle generic input change
   * 
   * @param field - Form field name
   * @param value - New value
   */
  const handleInputChange = (field: keyof CardFormData, value: string) => {
    logger.debug('AddCard', `Input changed: ${field}`);
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  /**
   * Validate expiry date is in the future
   * 
   * @param month - Expiry month (MM)
   * @param year - Expiry year (YY)
   * @returns true if date is in future
   */
  const validateExpiryDate = (month: string, year: string): boolean => {
    logger.entry('AddCard.validateExpiryDate', { month, year });
    
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10) + 2000; // Convert YY to YYYY
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Check if expiry date is in the future
    const valid = yearNum > currentYear || (yearNum === currentYear && monthNum >= currentMonth);
    
    logger.debug('AddCard', 'Expiry validation result', { valid, currentMonth, currentYear });
    logger.exit('AddCard.validateExpiryDate', { valid });
    
    return valid;
  };

  /**
   * Validate entire form
   * 
   * @returns true if form is valid
   */
  const validateForm = (): boolean => {
    logger.entry('AddCard.validateForm');
    
    const newErrors: Partial<CardFormData> = {};

    // Card number validation
    const cardDigits = formData.cardNumber.replace(/\s/g, '');
    if (!cardDigits) {
      newErrors.cardNumber = 'Card number is required';
    } else if (cardDigits.length < 13 || cardDigits.length > 19) {
      newErrors.cardNumber = 'Card number must be 13-19 digits';
    } else if (!validateLuhn(cardDigits)) {
      newErrors.cardNumber = 'Invalid card number (failed Luhn check)';
    }

    // Cardholder name validation
    if (!formData.cardholderName.trim()) {
      newErrors.cardholderName = 'Cardholder name is required';
    } else if (formData.cardholderName.length < 2) {
      newErrors.cardholderName = 'Name must be at least 2 characters';
    }

    // Expiry month validation
    const monthNum = parseInt(formData.expiryMonth, 10);
    if (!formData.expiryMonth) {
      newErrors.expiryMonth = 'Expiry month is required';
    } else if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      newErrors.expiryMonth = 'Invalid month (01-12)';
    }

    // Expiry year validation
    const yearNum = parseInt(formData.expiryYear, 10);
    if (!formData.expiryYear) {
      newErrors.expiryYear = 'Expiry year is required';
    } else if (isNaN(yearNum) || formData.expiryYear.length !== 2) {
      newErrors.expiryYear = 'Invalid year (YY format)';
    } else if (!validateExpiryDate(formData.expiryMonth, formData.expiryYear)) {
      newErrors.expiryYear = 'Card has expired';
    }

    // CVV validation
    const cvvLength = cardType === 'amex' ? 4 : 3;
    if (!formData.cvv) {
      newErrors.cvv = 'CVV is required';
    } else if (!/^\d+$/.test(formData.cvv)) {
      newErrors.cvv = 'CVV must contain only digits';
    } else if (formData.cvv.length !== cvvLength) {
      newErrors.cvv = `CVV must be ${cvvLength} digits for ${cardType.toUpperCase()}`;
    }

    // Zip code validation
    if (!formData.zipCode) {
      newErrors.zipCode = 'Zip code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
      newErrors.zipCode = 'Invalid zip code format (XXXXX or XXXXX-XXXX)';
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    
    logger.info('AddCard', 'Form validation result', { isValid, errorCount: Object.keys(newErrors).length });
    logger.exit('AddCard.validateForm', { isValid });
    
    return isValid;
  };

  /**
   * Handle form submission
   * 
   * @param e - Form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.entry('AddCard.handleSubmit');
    
    setApiError('');

    if (!validateForm()) {
      logger.warn('AddCard', 'Form validation failed');
      logger.exit('AddCard.handleSubmit', { success: false });
      return;
    }

    setLoading(true);
    logger.info('AddCard', 'Submitting card data to API');

    try {
      // Prepare card data for API
      const cardData = {
        cardNumber: formData.cardNumber.replace(/\s/g, ''), // Remove spaces
        cardholderName: formData.cardholderName.trim(),
        expiryMonth: formData.expiryMonth,
        expiryYear: formData.expiryYear,
        cvv: formData.cvv,
        billingAddress: {
          zipCode: formData.zipCode,
        },
        cardType: cardType !== 'unknown' ? cardType : undefined,
      };

      logger.debug('AddCard', 'Sending card data', { 
        cardType, 
        cardNumberMasked: cardData.cardNumber.substring(0, 4) + '****' 
      });

      await apiClient.post('/cards', cardData);
      
      logger.info('AddCard', 'Card added successfully');
      logger.exit('AddCard.handleSubmit', { success: true });
      
      // Navigate back to cards list
      navigate('/cards');
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('AddCard', 'Failed to add card', { error: errorMessage });
      setApiError(errorMessage);
      logger.exit('AddCard.handleSubmit', { success: false });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get card type display name
   */
  const getCardTypeDisplay = (): string => {
    const typeNames: Record<CardType, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
      discover: 'Discover',
      unknown: '',
    };
    return typeNames[cardType];
  };

  logger.exit('AddCard');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/cards')}
            className="text-primary hover:text-primary-dark mb-4 flex items-center"
          >
            ← Back to Cards
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Add New Card</h1>
          <p className="mt-2 text-sm text-gray-600">
            Add a payment card to your account for quick transactions
          </p>
        </div>

        {/* API Error */}
        {apiError && (
          <Alert
            variant="error"
            message={apiError}
            dismissible
            onClose={() => setApiError('')}
          />
        )}

        {/* Card Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Card Number */}
            <div>
              <Input
                label="Card Number"
                name="cardNumber"
                type="text"
                value={formData.cardNumber}
                onChange={handleCardNumberChange}
                error={errors.cardNumber}
                placeholder="1234 5678 9012 3456"
                maxLength={19} // 16 digits + 3 spaces
                required
              />
              {cardType !== 'unknown' && (
                <p className="mt-1 text-sm text-gray-600">
                  Detected: <span className="font-medium">{getCardTypeDisplay()}</span>
                </p>
              )}
            </div>

            {/* Cardholder Name */}
            <Input
              label="Cardholder Name"
              name="cardholderName"
              type="text"
              value={formData.cardholderName}
              onChange={(e) => handleInputChange('cardholderName', e.target.value.toUpperCase())}
              error={errors.cardholderName}
              placeholder="JOHN DOE"
              required
            />

            {/* Expiry Date */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Expiry Month"
                name="expiryMonth"
                type="text"
                value={formData.expiryMonth}
                onChange={(e) => handleInputChange('expiryMonth', formatExpiry(e.target.value, true))}
                error={errors.expiryMonth}
                placeholder="MM"
                maxLength={2}
                required
              />
              <Input
                label="Expiry Year"
                name="expiryYear"
                type="text"
                value={formData.expiryYear}
                onChange={(e) => handleInputChange('expiryYear', formatExpiry(e.target.value, false))}
                error={errors.expiryYear}
                placeholder="YY"
                maxLength={2}
                required
              />
            </div>

            {/* CVV and Zip Code */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="CVV"
                name="cvv"
                type="text"
                value={formData.cvv}
                onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, ''))}
                error={errors.cvv}
                placeholder={cardType === 'amex' ? '1234' : '123'}
                maxLength={cardType === 'amex' ? 4 : 3}
                required
              />
              <Input
                label="Zip Code"
                name="zipCode"
                type="text"
                value={formData.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                error={errors.zipCode}
                placeholder="12345"
                maxLength={10}
                required
              />
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                🔒 Your card information is encrypted and securely stored. We use industry-standard
                encryption to protect your payment details.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/cards')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={loading}
                fullWidth
              >
                Add Card
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
