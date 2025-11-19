/**
 * Transaction Model Tests
 * Tests for Transaction schema and validation
 */

const Transaction = require('../../models/Transaction');
const { db } = require('../../config/database');

// Mock the database module
jest.mock('../../config/database', () => {
  const mockDb = {
    generateUUID: jest.fn(() => 'mock-uuid-' + Date.now()),
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    query: jest.fn()
  };

  return {
    db: mockDb
  };
});

describe('Transaction Model', () => {
  const testUserId = 'user-uuid-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    test('should create a valid transaction with required fields', async() => {
      const txnData = {
        userId: testUserId,
        type: 'push',
        amount: 100.50,
        currency: 'USD',
        status: 'pending'
      };

      const mockCreated = {
        id: 'txn-uuid-123',
        userId: testUserId,
        type: 'push',
        amount: 100.50,
        currency: 'USD',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      db.create.mockResolvedValue(mockCreated);

      const transaction = await Transaction.create(txnData);

      expect(transaction.id).toBeDefined();
      expect(transaction.type).toBe(txnData.type);
      expect(transaction.amount).toBe(txnData.amount);
      expect(transaction.currency).toBe(txnData.currency);
    });

    test('should fail when required fields are missing', async() => {
      const txnData = {
        // Missing userId and type
        amount: 100
      };

      await expect(Transaction.create(txnData)).rejects.toThrow('userId is required');
    });

    test('should validate transaction type enum', async() => {
      const validTypes = ['push', 'pull'];

      for (const type of validTypes) {
        const mockCreated = {
          id: `txn-${type}`,
          userId: testUserId,
          type,
          amount: 50,
          currency: 'USD',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        db.create.mockResolvedValue(mockCreated);

        const transaction = await Transaction.create({
          userId: testUserId,
          type,
          amount: 50,
          currency: 'USD',
          status: 'pending'
        });

        expect(transaction.type).toBe(type);
      }
    });

    test('should validate status enum', async() => {
      const validStatuses = ['pending', 'processing', 'completed', 'failed', 'reversed'];

      for (const status of validStatuses) {
        const mockCreated = {
          id: `txn-${status}`,
          userId: testUserId,
          type: 'push',
          amount: 50,
          currency: 'USD',
          status,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        db.create.mockResolvedValue(mockCreated);

        const transaction = await Transaction.create({
          userId: testUserId,
          type: 'push',
          amount: 50,
          currency: 'USD',
          status
        });

        expect(transaction.status).toBe(status);
      }
    });

    test('should validate currency code format', async() => {
      const mockCreated = {
        id: 'txn-123',
        userId: testUserId,
        type: 'push',
        amount: 100,
        currency: 'USD',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      db.create.mockResolvedValue(mockCreated);

      const transaction = await Transaction.create({
        userId: testUserId,
        type: 'push',
        amount: 100,
        currency: 'USD',
        status: 'pending'
      });

      expect(transaction.currency).toBe('USD');
    });

    test('should require positive amount', async() => {
      const txnData = {
        userId: testUserId,
        type: 'push',
        amount: -100, // Negative amount
        currency: 'USD',
        status: 'pending'
      };

      await expect(Transaction.create(txnData)).rejects.toThrow('amount must be greater than or equal to 0');
    });
  });

  describe('Visa Integration', () => {
    test('should store Visa transaction ID', async() => {
      const mockCreated = {
        id: 'txn-123',
        userId: testUserId,
        type: 'push',
        amount: 100,
        currency: 'USD',
        status: 'processing',
        visaTransactionId: 'VISA123456789',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      db.create.mockResolvedValue(mockCreated);

      const transaction = await Transaction.create({
        userId: testUserId,
        type: 'push',
        amount: 100,
        currency: 'USD',
        status: 'processing',
        visaTransactionId: 'VISA123456789'
      });

      expect(transaction.visaTransactionId).toBe('VISA123456789');
    });

    test('should store error details on failure', async() => {
      const errorDetails = {
        errorCode: 'INSUFFICIENT_FUNDS',
        errorMessage: 'Insufficient funds in account',
        errorDetails: { accountBalance: 10 }
      };

      const mockCreated = {
        id: 'txn-123',
        userId: testUserId,
        type: 'pull',
        amount: 100,
        currency: 'USD',
        status: 'failed',
        errorDetails: JSON.stringify(errorDetails),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      db.create.mockResolvedValue(mockCreated);

      const transaction = await Transaction.create({
        userId: testUserId,
        type: 'pull',
        amount: 100,
        currency: 'USD',
        status: 'failed',
        errorDetails
      });

      const parsedError = JSON.parse(transaction.errorDetails);
      expect(parsedError.errorCode).toBe('INSUFFICIENT_FUNDS');
      expect(parsedError.errorMessage).toBe('Insufficient funds in account');
    });
  });

  describe('Metadata', () => {
    test('should store transaction metadata', async() => {
      const metadata = {
        description: 'Payment for services',
        purpose: 'invoice',
        additionalData: { invoiceId: 'INV-123', customField: 'custom value' }
      };

      const mockCreated = {
        id: 'txn-123',
        userId: testUserId,
        type: 'push',
        amount: 100,
        currency: 'USD',
        status: 'pending',
        metadata: JSON.stringify(metadata),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      db.create.mockResolvedValue(mockCreated);

      const transaction = await Transaction.create({
        userId: testUserId,
        type: 'push',
        amount: 100,
        currency: 'USD',
        status: 'pending',
        metadata
      });

      const parsedMetadata = JSON.parse(transaction.metadata);
      expect(parsedMetadata.description).toBe('Payment for services');
      expect(parsedMetadata.purpose).toBe('invoice');
      expect(parsedMetadata.additionalData.invoiceId).toBe('INV-123');
    });
  });

  describe('Request Tracking', () => {
    test('should store IP address and user agent', async() => {
      const mockCreated = {
        id: 'txn-123',
        userId: testUserId,
        type: 'push',
        amount: 100,
        currency: 'USD',
        status: 'pending',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      db.create.mockResolvedValue(mockCreated);

      const transaction = await Transaction.create({
        userId: testUserId,
        type: 'push',
        amount: 100,
        currency: 'USD',
        status: 'pending',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      });

      expect(transaction.ipAddress).toBe('192.168.1.1');
      expect(transaction.userAgent).toBe('Mozilla/5.0');
    });
  });
});
