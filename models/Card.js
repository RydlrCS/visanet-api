const crypto = require('crypto');
const { db } = require('../config/database');

class Card {
  constructor(data) {
    Object.assign(this, data);
  }

  // Encryption/Decryption methods
  static encryptCardNumber(cardNumber) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(cardNumber, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  decryptCardNumber() {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

    const parts = this.cardNumberEncrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Validation
  static validateExpiryMonth(month) {
    const monthInt = parseInt(month, 10);
    return monthInt >= 1 && monthInt <= 12;
  }

  // Database operations
  static async create(cardData) {
    // Validate required fields
    if (!cardData.userId) throw new Error('userId is required');
    if (!cardData.cardholderName) throw new Error('cardholderName is required');
    if (!cardData.expiryMonth) throw new Error('expiryMonth is required');
    if (!cardData.expiryYear) throw new Error('expiryYear is required');
    if (!cardData.cardType) throw new Error('cardType is required');

    // Validate expiry month
    if (!Card.validateExpiryMonth(cardData.expiryMonth)) {
      throw new Error(`${cardData.expiryMonth} is not a valid month (must be 01-12)`);
    }

    // Validate card type
    const validTypes = ['visa', 'mastercard', 'amex', 'discover'];
    if (!validTypes.includes(cardData.cardType)) {
      throw new Error(`Invalid card type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Prepare data for insertion
    const data = {
      id: db.generateUUID(),
      userId: cardData.userId,
      cardNumberEncrypted: cardData.cardNumberEncrypted,
      lastFourDigits: cardData.lastFourDigits,
      cardholderName: cardData.cardholderName,
      expiryMonth: cardData.expiryMonth.toString().padStart(2, '0'),
      expiryYear: cardData.expiryYear,
      cardType: cardData.cardType,
      isDefault: cardData.isDefault !== undefined ? cardData.isDefault : false,
      status: cardData.status || 'active',
      billingAddress: cardData.billingAddress ? JSON.stringify(cardData.billingAddress) : null,
      visaCardId: cardData.visaCardId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.create('cards', data);
    return new Card(result);
  }

  static async findById(id) {
    const result = await db.findById('cards', id);
    if (result && result.billingAddress) {
      result.billingAddress = JSON.parse(result.billingAddress);
    }
    return result ? new Card(result) : null;
  }

  static async findByUserId(userId, activeOnly = true) {
    const conditions = { userId };
    if (activeOnly) {
      conditions.status = 'active';
    }
    
    const results = await db.findMany('cards', conditions, {
      orderBy: [{ field: 'isDefault', direction: 'DESC' }, { field: 'createdAt', direction: 'DESC' }]
    });

    return results.map(r => {
      if (r.billingAddress) {
        r.billingAddress = JSON.parse(r.billingAddress);
      }
      return new Card(r);
    });
  }

  static async findOne(conditions) {
    const result = await db.findOne('cards', conditions);
    if (result && result.billingAddress) {
      result.billingAddress = JSON.parse(result.billingAddress);
    }
    return result ? new Card(result) : null;
  }

  static async find(conditions = {}, options = {}) {
    const results = await db.findMany('cards', conditions, options);
    return results.map(r => {
      if (r.billingAddress) {
        r.billingAddress = JSON.parse(r.billingAddress);
      }
      return new Card(r);
    });
  }

  async save() {
    if (this.id) {
      // Update existing card
      const updateData = { ...this };
      delete updateData.id;
      delete updateData.createdAt;
      updateData.updatedAt = new Date();

      // Handle JSON fields
      if (updateData.billingAddress && typeof updateData.billingAddress === 'object') {
        updateData.billingAddress = JSON.stringify(updateData.billingAddress);
      }

      const result = await db.update('cards', this.id, updateData);
      if (result) {
        Object.assign(this, result);
      }
      return this;
    } else {
      // Create new card
      const created = await Card.create(this);
      Object.assign(this, created);
      return this;
    }
  }

  static async updateById(id, updateData) {
    updateData.updatedAt = new Date();

    // Handle JSON fields
    if (updateData.billingAddress && typeof updateData.billingAddress === 'object') {
      updateData.billingAddress = JSON.stringify(updateData.billingAddress);
    }

    const result = await db.update('cards', id, updateData);
    if (result && result.billingAddress) {
      result.billingAddress = JSON.parse(result.billingAddress);
    }
    return result ? new Card(result) : null;
  }

  static async deleteById(id) {
    return await db.delete('cards', id);
  }

  static async count(conditions = {}) {
    return await db.count('cards', conditions);
  }
}

module.exports = Card;