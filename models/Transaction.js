const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['push', 'pull', 'reversal', 'refund'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'reversed', 'cancelled'],
    default: 'pending'
  },
  senderCard: {
    cardNumber: String,
    lastFourDigits: String,
    cardType: String
  },
  recipientCard: {
    cardNumber: String,
    lastFourDigits: String,
    cardType: String
  },
  visaTransactionId: String,
  retrievalReferenceNumber: String,
  systemsTraceAuditNumber: String,
  merchantInfo: {
    merchantId: String,
    merchantName: String,
    merchantCategoryCode: String
  },
  metadata: {
    description: String,
    purpose: String,
    additionalData: mongoose.Schema.Types.Mixed
  },
  errorDetails: {
    errorCode: String,
    errorMessage: String,
    errorDetails: mongoose.Schema.Types.Mixed
  },
  timestamps: {
    initiated: {
      type: Date,
      default: Date.now
    },
    processed: Date,
    completed: Date,
    failed: Date
  },
  webhookNotifications: [{
    sentAt: Date,
    status: String,
    response: String
  }],
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Indexes for better query performance
transactionSchema.index({ userId: 1, createdAt: -1 });
// transactionId already has unique: true in schema, no need for additional index
transactionSchema.index({ visaTransactionId: 1 });
transactionSchema.index({ status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
