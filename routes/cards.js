const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Card = require('../models/Card');
const logger = require('../utils/logger');

/**
 * @route   POST /api/cards
 * @desc    Add a new card
 * @access  Private
 */
router.post('/', [
  auth,
  body('cardNumber').isCreditCard().withMessage('Invalid card number'),
  body('cardholderName').notEmpty().withMessage('Cardholder name is required'),
  body('expiryMonth').isInt({ min: 1, max: 12 }).withMessage('Invalid expiry month'),
  body('expiryYear').isInt({ min: new Date().getFullYear() }).withMessage('Invalid expiry year'),
  body('cvv').isLength({ min: 3, max: 4 }).withMessage('Invalid CVV')
], async(req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      cardNumber,
      cardholderName,
      expiryMonth,
      expiryYear,
      cvv: _cvv,
      billingAddress,
      isDefault
    } = req.body;    // Check if card already exists
    const existingCard = await Card.findOne({
      userId: req.user.id,
      lastFourDigits: cardNumber.slice(-4)
    });

    if (existingCard) {
      return res.status(400).json({
        message: 'Card already exists'
      });
    }

    // Create new card
    const card = await Card.create({
      userId: req.user.id,
      cardholderName,
      expiryMonth: expiryMonth.toString().padStart(2, '0'),
      expiryYear: expiryYear.toString(),
      cardType: detectCardType(cardNumber),
      lastFourDigits: cardNumber.slice(-4),
      cardNumberEncrypted: Card.encryptCardNumber(cardNumber),
      billingAddress: billingAddress || null,
      isDefault: isDefault || false
    });

    logger.info('Card added:', {
      userId: req.user.id,
      cardId: card.id,
      lastFour: card.lastFourDigits
    });

    res.status(201).json({
      success: true,
      message: 'Card added successfully',
      card: {
        id: card.id,
        lastFourDigits: card.lastFourDigits,
        cardType: card.cardType,
        cardholderName: card.cardholderName,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        isDefault: card.isDefault
      }
    });

  } catch (error) {
    logger.error('Add card error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/cards
 * @desc    Get all user cards
 * @access  Private
 */
router.get('/', auth, async(req, res) => {
  try {
    const cards = await Card.findByUserId(req.user.id, true);

    res.json({
      success: true,
      cards: cards.map(card => ({
        id: card.id,
        lastFourDigits: card.lastFourDigits,
        cardType: card.cardType,
        cardholderName: card.cardholderName,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        isDefault: card.isDefault
      }))
    });

  } catch (error) {
    logger.error('Get cards error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/cards/:id
 * @desc    Get card by ID
 * @access  Private
 */
router.get('/:id', auth, async(req, res) => {
  try {
    const card = await Card.findById(req.params.id);

    if (!card || card.userId !== req.user.id) {
      return res.status(404).json({ message: 'Card not found' });
    }

    res.json({
      success: true,
      card: {
        id: card.id,
        lastFourDigits: card.lastFourDigits,
        cardType: card.cardType,
        cardholderName: card.cardholderName,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        isDefault: card.isDefault,
        billingAddress: card.billingAddress
      }
    });

  } catch (error) {
    logger.error('Get card error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   PUT /api/cards/:id/set-default
 * @desc    Set card as default
 * @access  Private
 */
router.put('/:id/set-default', auth, async(req, res) => {
  try {
    // Get all user cards
    const userCards = await Card.findByUserId(req.user.id, false);
    
    // Remove default from all cards
    for (const card of userCards) {
      if (card.isDefault) {
        await Card.updateById(card.id, { isDefault: false });
      }
    }

    // Set new default
    const card = await Card.findById(req.params.id);

    if (!card || card.userId !== req.user.id) {
      return res.status(404).json({ message: 'Card not found' });
    }

    await Card.updateById(card.id, { isDefault: true });

    logger.info('Default card updated:', {
      userId: req.user.id,
      cardId: card.id
    });

    res.json({
      success: true,
      message: 'Default card updated',
      card: {
        id: card.id,
        lastFourDigits: card.lastFourDigits,
        isDefault: true
      }
    });

  } catch (error) {
    logger.error('Set default card error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   DELETE /api/cards/:id
 * @desc    Delete card (soft delete)
 * @access  Private
 */
router.delete('/:id', auth, async(req, res) => {
  try {
    const card = await Card.findById(req.params.id);

    if (!card || card.userId !== req.user.id) {
      return res.status(404).json({ message: 'Card not found' });
    }

    await Card.updateById(card.id, { status: 'inactive' });

    logger.info('Card deleted:', {
      userId: req.user.id,
      cardId: card.id
    });

    res.json({
      success: true,
      message: 'Card deleted successfully'
    });

  } catch (error) {
    logger.error('Delete card error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Helper function
function detectCardType(cardNumber) {
  const firstDigit = cardNumber.charAt(0);
  if (firstDigit === '4') return 'visa';
  if (firstDigit === '5') return 'mastercard';
  if (firstDigit === '3') return 'amex';
  if (firstDigit === '6') return 'discover';
  return 'unknown';
}

module.exports = router;
