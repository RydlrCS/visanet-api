const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const visaDirectService = require('../services/visaDirect');
const logger = require('../utils/logger');

/**
 * @route   POST /api/transactions/push
 * @desc    Send money (Push Payment)
 * @access  Private
 */
router.post('/push', [
  auth,
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('recipientCard').notEmpty().withMessage('Recipient card is required'),
  body('currency').optional().isISO4217().withMessage('Invalid currency code')
], async(req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, recipientCard, currency, description } = req.body;

    // Create transaction record
    const transaction = new Transaction({
      transactionId: generateTransactionId(),
      userId: req.user.id,
      type: 'push',
      amount,
      currency: currency || 'USD',
      status: 'pending',
      recipientCard: {
        cardNumber: recipientCard.number,
        lastFourDigits: recipientCard.number.slice(-4),
        cardType: detectCardType(recipientCard.number)
      },
      metadata: {
        description
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    await transaction.save();

    // Call Visa Direct API
    const result = await visaDirectService.pushPayment({
      amount,
      currency: currency || 'USD',
      recipientPAN: recipientCard.number,
      recipientName: recipientCard.name,
      senderPAN: req.user.defaultCard.number,
      senderName: `${req.user.firstName} ${req.user.lastName}`,
      senderAddress: req.user.address,
      transactionId: transaction.transactionId
    });

    if (result.success) {
      transaction.status = 'processing';
      transaction.visaTransactionId = result.transactionId;
      transaction.timestamps.processed = new Date();
      await transaction.save();

      res.status(200).json({
        success: true,
        message: 'Payment initiated successfully',
        transaction: {
          id: transaction._id,
          transactionId: transaction.transactionId,
          amount,
          currency: currency || 'USD',
          status: transaction.status
        }
      });
    } else {
      transaction.status = 'failed';
      transaction.errorDetails = result.error;
      await transaction.save();

      res.status(400).json({
        success: false,
        message: 'Payment failed',
        error: result.error
      });
    }

  } catch (error) {
    logger.error('Push payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/transactions/pull
 * @desc    Request money (Pull Funds)
 * @access  Private
 */
router.post('/pull', [
  auth,
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('senderCard').notEmpty().withMessage('Sender card is required')
], async(req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, senderCard, currency, description } = req.body;

    const transaction = new Transaction({
      transactionId: generateTransactionId(),
      userId: req.user.id,
      type: 'pull',
      amount,
      currency: currency || 'USD',
      status: 'pending',
      senderCard: {
        cardNumber: senderCard.number,
        lastFourDigits: senderCard.number.slice(-4),
        cardType: detectCardType(senderCard.number)
      },
      metadata: {
        description
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    await transaction.save();

    const result = await visaDirectService.pullFunds({
      amount,
      currency: currency || 'USD',
      senderPAN: senderCard.number,
      senderName: senderCard.name,
      recipientPAN: req.user.defaultCard.number,
      transactionId: transaction.transactionId
    });

    if (result.success) {
      transaction.status = 'processing';
      transaction.visaTransactionId = result.transactionId;
      transaction.timestamps.processed = new Date();
      await transaction.save();

      res.status(200).json({
        success: true,
        message: 'Pull request initiated successfully',
        transaction: {
          id: transaction._id,
          transactionId: transaction.transactionId,
          amount,
          currency: currency || 'USD',
          status: transaction.status
        }
      });
    } else {
      transaction.status = 'failed';
      transaction.errorDetails = result.error;
      await transaction.save();

      res.status(400).json({
        success: false,
        message: 'Pull request failed',
        error: result.error
      });
    }

  } catch (error) {
    logger.error('Pull funds error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/transactions
 * @desc    Get user transactions
 * @access  Private
 */
router.get('/', auth, async(req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;

    const query = { userId: req.user.id };
    if (status) query.status = status;
    if (type) query.type = type;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Transaction.countDocuments(query);

    res.json({
      transactions,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });

  } catch (error) {
    logger.error('Get transactions error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/transactions/:id
 * @desc    Get transaction by ID
 * @access  Private
 */
router.get('/:id', auth, async(req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(transaction);

  } catch (error) {
    logger.error('Get transaction error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Helper Functions
function generateTransactionId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `TXN${timestamp}${random}`;
}

function detectCardType(cardNumber) {
  const firstDigit = cardNumber.charAt(0);
  if (firstDigit === '4') return 'visa';
  if (firstDigit === '5') return 'mastercard';
  if (firstDigit === '3') return 'amex';
  if (firstDigit === '6') return 'discover';
  return 'unknown';
}

module.exports = router;
