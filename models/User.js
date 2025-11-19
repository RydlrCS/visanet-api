const bcrypt = require('bcryptjs');
const { db } = require('../config/database');

class User {
  constructor(data) {
    Object.assign(this, data);
  }

  // Validation
  static validateEmail(email) {
    return /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email);
  }

  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS || '10'));
    return await bcrypt.hash(password, salt);
  }

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  toJSON() {
    const obj = { ...this };
    delete obj.password;
    return obj;
  }

  // Database operations
  static async create(userData) {
    // Validate email
    if (!User.validateEmail(userData.email)) {
      throw new Error(`${userData.email} is not a valid email address!`);
    }

    // Validate required fields
    if (!userData.password || userData.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Hash password
    const hashedPassword = await User.hashPassword(userData.password);

    // Prepare data for insertion
    const data = {
      id: db.generateUUID(),
      email: userData.email.toLowerCase().trim(),
      password: hashedPassword,
      businessName: userData.businessName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      phone: userData.phone || null,
      address: userData.address ? JSON.stringify(userData.address) : null,
      kycStatus: userData.kycStatus || 'pending',
      kycDocuments: userData.kycDocuments ? JSON.stringify(userData.kycDocuments) : null,
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      role: userData.role || 'user',
      visaCustomerId: userData.visaDetails?.customerId || null,
      visaMerchantId: userData.visaDetails?.merchantId || null,
      lastLogin: userData.lastLogin || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.create('users', data);
    return new User(result);
  }

  static async findById(id) {
    const result = await db.findById('users', id);
    return result ? new User(result) : null;
  }

  static async findByEmail(email) {
    const result = await db.findOne('users', { email: email.toLowerCase().trim() });
    return result ? new User(result) : null;
  }

  static async findOne(conditions) {
    const result = await db.findOne('users', conditions);
    return result ? new User(result) : null;
  }

  static async find(conditions = {}, options = {}) {
    const results = await db.findMany('users', conditions, options);
    return results.map(r => new User(r));
  }

  async save() {
    if (this.id) {
      // Update existing user
      const updateData = { ...this };
      delete updateData.id;
      delete updateData.createdAt;
      updateData.updatedAt = new Date();

      // Handle JSON fields
      if (updateData.address && typeof updateData.address === 'object') {
        updateData.address = JSON.stringify(updateData.address);
      }
      if (updateData.kycDocuments && typeof updateData.kycDocuments === 'object') {
        updateData.kycDocuments = JSON.stringify(updateData.kycDocuments);
      }

      const result = await db.update('users', this.id, updateData);
      if (result) {
        Object.assign(this, result);
      }
      return this;
    } else {
      // Create new user
      const created = await User.create(this);
      Object.assign(this, created);
      return this;
    }
  }

  static async updateById(id, updateData) {
    updateData.updatedAt = new Date();

    // Handle JSON fields
    if (updateData.address && typeof updateData.address === 'object') {
      updateData.address = JSON.stringify(updateData.address);
    }
    if (updateData.kycDocuments && typeof updateData.kycDocuments === 'object') {
      updateData.kycDocuments = JSON.stringify(updateData.kycDocuments);
    }

    const result = await db.update('users', id, updateData);
    return result ? new User(result) : null;
  }

  static async deleteById(id) {
    return await db.delete('users', id);
  }

  static async count(conditions = {}) {
    return await db.count('users', conditions);
  }
}

module.exports = User;
