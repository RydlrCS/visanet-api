/**
 * Cards List Component
 * 
 * Displays user's saved payment cards with add/delete functionality.
 * User Journey: Manage payment methods before creating transactions
 * 
 * @module components/Cards/CardsList
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '../../utils/logger';
import { apiClient, getErrorMessage } from '../../utils/api';
import { Loading, Alert, Button } from '../common';
import type { Card } from '../../types';

/**
 * Cards list component
 * 
 * @returns Cards management page
 */
export const CardsList: React.FC = () => {
  logger.entry('CardsList');

  const navigate = useNavigate();
  
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  /**
   * Fetch cards from API
   */
  useEffect(() => {
    fetchCards();
  }, []);

  /**
   * Fetch user's saved cards
   */
  const fetchCards = async () => {
    logger.entry('CardsList.fetchCards');
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.get<Card[]>('/cards');
      setCards(response.data);
      logger.info('CardsList', 'Cards loaded', { count: response.data.length });
      logger.exit('CardsList.fetchCards', { success: true });
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      logger.error('CardsList', 'Failed to load cards', { error: errorMessage });
      setError(errorMessage);
      logger.exit('CardsList.fetchCards', { success: false });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a card
   * 
   * @param cardId - Card ID to delete
   */
  const handleDeleteCard = async (cardId: string) => {
    logger.entry('CardsList.handleDeleteCard', { cardId });
    
    if (!confirm('Are you sure you want to delete this card?')) {
      logger.info('CardsList', 'Card deletion cancelled by user');
      return;
    }

    try {
      await apiClient.delete(`/cards/${cardId}`);
      logger.info('CardsList', 'Card deleted successfully', { cardId });
      setSuccess('Card deleted successfully');
      fetchCards();
      logger.exit('CardsList.handleDeleteCard', { success: true });
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      logger.error('CardsList', 'Failed to delete card', { error: errorMessage });
      setError(errorMessage);
      logger.exit('CardsList.handleDeleteCard', { success: false });
    }
  };

  /**
   * Set card as default
   * 
   * @param cardId - Card ID to set as default
   */
  const handleSetDefault = async (cardId: string) => {
    logger.entry('CardsList.handleSetDefault', { cardId });

    try {
      await apiClient.put(`/cards/${cardId}/default`);
      logger.info('CardsList', 'Default card updated', { cardId });
      setSuccess('Default card updated successfully');
      fetchCards();
      logger.exit('CardsList.handleSetDefault', { success: true });
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      logger.error('CardsList', 'Failed to set default card', { error: errorMessage });
      setError(errorMessage);
      logger.exit('CardsList.handleSetDefault', { success: false });
    }
  };

  logger.exit('CardsList');

  if (loading) {
    return <Loading fullScreen message="Loading cards..." />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Payment Cards</h1>
            <div className="flex space-x-4">
              <Button variant="primary" onClick={() => navigate('/cards/add')}>
                Add New Card
              </Button>
              <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
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

        {success && (
          <Alert
            variant="success"
            message={success}
            dismissible
            onClose={() => setSuccess('')}
            className="mb-6"
          />
        )}

        {cards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => (
              <div
                key={card._id}
                className={`bg-white rounded-lg shadow-lg p-6 ${
                  card.isDefault ? 'ring-2 ring-primary' : ''
                }`}
              >
                {card.isDefault && (
                  <div className="mb-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-white">
                      Default Card
                    </span>
                  </div>
                )}
                
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 text-sm">Card Number</span>
                    <svg className="h-8 w-12 text-gray-700" viewBox="0 0 48 32" fill="currentColor">
                      <rect width="48" height="32" rx="4" fill="#1a56db" />
                    </svg>
                  </div>
                  <p className="text-xl font-mono">**** **** **** {card.cardNumber}</p>
                </div>

                <div className="mb-4">
                  <span className="text-gray-500 text-sm">Cardholder Name</span>
                  <p className="text-lg font-medium">{card.cardholderName}</p>
                </div>

                <div className="mb-6">
                  <span className="text-gray-500 text-sm">Expires</span>
                  <p className="text-lg">{card.expiryMonth}/{card.expiryYear}</p>
                </div>

                <div className="flex space-x-2">
                  {!card.isDefault && (
                    <Button
                      variant="secondary"
                      onClick={() => handleSetDefault(card._id)}
                      fullWidth
                    >
                      Set as Default
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    onClick={() => handleDeleteCard(card._id)}
                    fullWidth
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No cards found</h3>
            <p className="text-gray-500 mb-6">Add a payment card to start processing transactions</p>
            <Button variant="primary" onClick={() => navigate('/cards/add')}>
              Add Your First Card
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};
