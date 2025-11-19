const { db } = require('../config/database');

class Transaction {
  constructor(data) {
    Object.assign(this, data);
  }

  // Generate unique transaction ID
  static generateTransactionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `TXN-${timestamp}-${random}`.toUpperCase();
  }

  // Database operations
  static async create(transactionData) {
    // Validate required fields
    if (!transactionData.userId) throw new Error('userId is required');
    if (!transactionData.type) throw new Error('type is required');
    if (transactionData.amount === undefined) throw new Error('amount is required');
    if (transactionData.amount < 0) throw new Error('amount must be greater than or equal to 0');

    // Validate type
    const validTypes = ['push', 'pull'];
    if (!validTypes.includes(transactionData.type)) {
      throw new Error(`Invalid transaction type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate status
    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'reversed'];
    if (transactionData.status && !validStatuses.includes(transactionData.status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Prepare data for insertion
    const data = {
      id: db.generateUUID(),
      userId: transactionData.userId,
      type: transactionData.type,
      amount: transactionData.amount,
      currency: transactionData.currency || 'USD',
      status: transactionData.status || 'pending',
      visaTransactionId: transactionData.visaTransactionId || null,
      retrievalReferenceNumber: transactionData.retrievalReferenceNumber || null,
      systemsTraceAuditNumber: transactionData.systemsTraceAuditNumber || null,
      metadata: transactionData.metadata ? JSON.stringify(transactionData.metadata) : null,
      errorDetails: transactionData.errorDetails ? JSON.stringify(transactionData.errorDetails) : null,
      ipAddress: transactionData.ipAddress || null,
      userAgent: transactionData.userAgent || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.create('transactions', data);
    return new Transaction(result);
  }

  static async findById(id) {
    const result = await db.findById('transactions', id);
    if (result) {
      if (result.metadata) result.metadata = JSON.parse(result.metadata);
      if (result.errorDetails) result.errorDetails = JSON.parse(result.errorDetails);
    }
    return result ? new Transaction(result) : null;
  }

  static async findByUserId(userId, options = {}) {
    const results = await db.findMany('transactions', { userId }, {
      orderBy: [{ field: 'createdAt', direction: 'DESC' }],
      ...options
    });

    return results.map(r => {
      if (r.metadata) r.metadata = JSON.parse(r.metadata);
      if (r.errorDetails) r.errorDetails = JSON.parse(r.errorDetails);
      return new Transaction(r);
    });
  }

  static async findByVisaTransactionId(visaTransactionId) {
    const result = await db.findOne('transactions', { visaTransactionId });
    if (result) {
      if (result.metadata) result.metadata = JSON.parse(result.metadata);
      if (result.errorDetails) result.errorDetails = JSON.parse(result.errorDetails);
    }
    return result ? new Transaction(result) : null;
  }

  static async findOne(conditions) {
    const result = await db.findOne('transactions', conditions);
    if (result) {
      if (result.metadata) result.metadata = JSON.parse(result.metadata);
      if (result.errorDetails) result.errorDetails = JSON.parse(result.errorDetails);
    }
    return result ? new Transaction(result) : null;
  }

  static async find(conditions = {}, options = {}) {
    const results = await db.findMany('transactions', conditions, options);
    return results.map(r => {
      if (r.metadata) r.metadata = JSON.parse(r.metadata);
      if (r.errorDetails) r.errorDetails = JSON.parse(r.errorDetails);
      return new Transaction(r);
    });
  }

  async save() {
    if (this.id) {
      // Update existing transaction
      const updateData = { ...this };
      delete updateData.id;
      delete updateData.createdAt;
      updateData.updatedAt = new Date();

      // Handle JSON fields
      if (updateData.metadata && typeof updateData.metadata === 'object') {
        updateData.metadata = JSON.stringify(updateData.metadata);
      }
      if (updateData.errorDetails && typeof updateData.errorDetails === 'object') {
        updateData.errorDetails = JSON.stringify(updateData.errorDetails);
      }

      const result = await db.update('transactions', this.id, updateData);
      if (result) {
        Object.assign(this, result);
      }
      return this;
    } else {
      // Create new transaction
      const created = await Transaction.create(this);
      Object.assign(this, created);
      return this;
    }
  }

  static async updateById(id, updateData) {
    updateData.updatedAt = new Date();

    // Handle JSON fields
    if (updateData.metadata && typeof updateData.metadata === 'object') {
      updateData.metadata = JSON.stringify(updateData.metadata);
    }
    if (updateData.errorDetails && typeof updateData.errorDetails === 'object') {
      updateData.errorDetails = JSON.stringify(updateData.errorDetails);
    }

    const result = await db.update('transactions', id, updateData);
    if (result) {
      if (result.metadata) result.metadata = JSON.parse(result.metadata);
      if (result.errorDetails) result.errorDetails = JSON.parse(result.errorDetails);
    }
    return result ? new Transaction(result) : null;
  }

  static async deleteById(id) {
    return await db.delete('transactions', id);
  }

  static async count(conditions = {}) {
    return await db.count('transactions', conditions);
  }

  static async getStats(userId, startDate = null, endDate = null) {
    let whereClause = 'WHERE userId = ?';
    const params = [userId];

    if (startDate) {
      whereClause += ' AND createdAt >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND createdAt <= ?';
      params.push(endDate);
    }

    const sql = `
      SELECT 
        COUNT(*) as totalTransactions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successfulTransactions,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedTransactions,
        SUM(CASE WHEN status = 'pending' OR status = 'processing' THEN 1 ELSE 0 END) as pendingTransactions,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as totalVolume,
        AVG(CASE WHEN status = 'completed' THEN amount ELSE NULL END) as averageAmount
      FROM transactions
      ${whereClause}
    `;

    const results = await db.query(sql, params);
    return results[0];
  }
}

module.exports = Transaction;
