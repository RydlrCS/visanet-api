const mongoose = require('mongoose');
const crypto = require('crypto');

const cardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cardNumberEncrypted: {
    type: String,
    required: true
  },
  lastFourDigits: {
    type: String,
    required: true
  },
  cardholderName: {
    type: String,
    required: true
  },
  expiryMonth: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        const month = parseInt(v, 10);
        return month >= 1 && month <= 12;
      },
      message: props => `${props.value} is not a valid month (must be 01-12)`
    }
  },
  expiryYear: {
    type: String,
    required: true
  },
  cardType: {
    type: String,
    enum: ['visa', 'mastercard', 'amex', 'discover'],
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  visaCardId: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Encrypt card number before saving
cardSchema.methods.encryptCardNumber = function(cardNumber) {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(cardNumber, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
};

// Decrypt card number
cardSchema.methods.decryptCardNumber = function() {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

  const parts = this.cardNumberEncrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

// Index for user cards
cardSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Card', cardSchema);
