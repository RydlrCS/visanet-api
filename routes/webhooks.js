const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

/**
 * Webhook endpoint for Visa notifications
 * URL: https://www.locapay.rydlr.com/visanet/webhook
 */
router.post('/', async(req, res) => {
  try {
    logger.info('Webhook received:', req.body);

    // Verify webhook signature
    const signature = req.headers['x-visa-signature'];
    if (!verifySignature(req.body, signature)) {
      logger.warn('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const {
      transactionId,
      status,
      eventType,
      timestamp,
      data
    } = req.body;

    logger.info('Webhook event received:', { transactionId, status, eventType, timestamp });

    // Process webhook based on event type
    switch (eventType) {
    case 'TRANSACTION_COMPLETED':
      await handleTransactionCompleted(data);
      break;
    case 'TRANSACTION_FAILED':
      await handleTransactionFailed(data);
      break;
    case 'TRANSACTION_REVERSED':
      await handleTransactionReversed(data);
      break;
    default:
      logger.warn('Unknown webhook event type:', eventType);
    }

    // Log webhook notification
    const transaction = await Transaction.findOne({ transactionId });
    if (transaction) {
      transaction.webhookNotifications.push({
        sentAt: new Date(),
        status: 'received',
        response: JSON.stringify(req.body)
      });
      await transaction.save();
    }

    // Acknowledge receipt
    res.status(200).json({
      received: true,
      transactionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Verify webhook signature
 */
function verifySignature(payload, signature) {
  if (!signature || !process.env.WEBHOOK_SECRET) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET);
  const calculatedSignature = hmac.update(JSON.stringify(payload)).digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(calculatedSignature)
  );
}

/**
 * Handle transaction completed
 */
async function handleTransactionCompleted(data) {
  const transaction = await Transaction.findOne({
    transactionId: data.transactionId
  });

  if (transaction) {
    transaction.status = 'completed';
    transaction.timestamps.completed = new Date();
    transaction.visaTransactionId = data.visaTransactionId;
    await transaction.save();

    logger.info('Transaction completed:', data.transactionId);

    // TODO: Notify user (email/SMS)
  }
}

/**
 * Handle transaction failed
 */
async function handleTransactionFailed(data) {
  const transaction = await Transaction.findOne({
    transactionId: data.transactionId
  });

  if (transaction) {
    transaction.status = 'failed';
    transaction.timestamps.failed = new Date();
    transaction.errorDetails = {
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      errorDetails: data.errorDetails
    };
    await transaction.save();

    logger.error('Transaction failed:', data.transactionId, data.errorMessage);

    // TODO: Notify user (email/SMS)
  }
}

/**
 * Handle transaction reversed
 */
async function handleTransactionReversed(data) {
  const transaction = await Transaction.findOne({
    transactionId: data.transactionId
  });

  if (transaction) {
    transaction.status = 'reversed';
    transaction.timestamps.reversed = new Date();
    await transaction.save();

    logger.info('Transaction reversed:', data.transactionId);

    // TODO: Notify user (email/SMS)
  }
}

module.exports = router;
