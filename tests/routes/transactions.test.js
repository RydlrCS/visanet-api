const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const transactionsRouter = require('../../routes/transactions');
const Transaction = require('../../models/Transaction');
const visaDirectService = require('../../services/visaDirect');
const auth = require('../../middleware/auth');

// Mock dependencies
jest.mock('../../models/Transaction');
jest.mock('../../services/visaDirect');
jest.mock('../../middleware/auth');
jest.mock('../../utils/logger');

// Setup Express app for testing
const app = express();
app.use(express.json());
app.use('/api/transactions', transactionsRouter);

// Mock user data
const mockUser = {
  id: 'user123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  defaultCard: {
    number: '4111111111111111',
    name: 'John Doe'
  },
  address: {
    street: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'US'
  }
};

// Mock auth middleware
auth.mockImplementation((req, res, next) => {
  req.user = mockUser;
  next();
});

describe('Transaction Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/transactions/push', () => {
    const validPushPayload = {
      amount: 100.50,
      recipientCard: {
        number: '5555555555554444',
        name: 'Jane Smith'
      },
      currency: 'USD',
      description: 'Payment for services'
    };

    it('should successfully initiate a push payment', async () => {
      const mockTransaction = {
        _id: 'txn123',
        transactionId: 'TXN123456789',
        userId: mockUser.id,
        type: 'push',
        amount: 100.50,
        currency: 'USD',
        status: 'pending',
        visaTransactionId: null,
        timestamps: {},
        save: jest.fn().mockResolvedValue(true)
      };

      Transaction.mockImplementation(() => mockTransaction);

      visaDirectService.pushPayment = jest.fn().mockResolvedValue({
        success: true,
        transactionId: 'VISA123456'
      });

      const response = await request(app)
        .post('/api/transactions/push')
        .send(validPushPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Payment initiated successfully');
      expect(response.body.transaction).toHaveProperty('id');
      expect(response.body.transaction).toHaveProperty('transactionId');
      expect(response.body.transaction.amount).toBe(100.50);
      expect(response.body.transaction.currency).toBe('USD');
      expect(mockTransaction.status).toBe('processing');
      expect(visaDirectService.pushPayment).toHaveBeenCalled();
    });

    it('should handle push payment failure from Visa API', async () => {
      const mockTransaction = {
        _id: 'txn123',
        transactionId: 'TXN123456789',
        status: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };

      Transaction.mockImplementation(() => mockTransaction);

      visaDirectService.pushPayment = jest.fn().mockResolvedValue({
        success: false,
        error: 'Insufficient funds'
      });

      const response = await request(app)
        .post('/api/transactions/push')
        .send(validPushPayload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payment failed');
      expect(response.body.error).toBe('Insufficient funds');
      expect(mockTransaction.status).toBe('failed');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/transactions/push')
        .send({
          amount: 100.50
          // Missing recipientCard
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should validate amount is numeric', async () => {
      const response = await request(app)
        .post('/api/transactions/push')
        .send({
          amount: 'invalid',
          recipientCard: {
            number: '5555555555554444',
            name: 'Jane Smith'
          }
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(e => e.msg === 'Amount must be a number')).toBe(true);
    });

    it('should use USD as default currency if not provided', async () => {
      const mockTransaction = {
        _id: 'txn123',
        transactionId: 'TXN123456789',
        status: 'pending',
        visaTransactionId: null,
        timestamps: {},
        save: jest.fn().mockResolvedValue(true)
      };

      Transaction.mockImplementation(() => mockTransaction);

      visaDirectService.pushPayment = jest.fn().mockResolvedValue({
        success: true,
        transactionId: 'VISA123456'
      });

      const payload = { ...validPushPayload };
      delete payload.currency;

      const response = await request(app)
        .post('/api/transactions/push')
        .send(payload)
        .expect(200);

      expect(response.body.transaction.currency).toBe('USD');
    });

    it('should handle server errors gracefully', async () => {
      Transaction.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .post('/api/transactions/push')
        .send(validPushPayload)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
      expect(response.body.error).toBe('Database connection failed');
    });
  });

  describe('POST /api/transactions/pull', () => {
    const validPullPayload = {
      amount: 50.25,
      senderCard: {
        number: '4111111111111111',
        name: 'Bob Johnson'
      },
      currency: 'USD',
      description: 'Invoice payment'
    };

    it('should successfully initiate a pull funds request', async () => {
      const mockTransaction = {
        _id: 'txn456',
        transactionId: 'TXN987654321',
        userId: mockUser.id,
        type: 'pull',
        amount: 50.25,
        currency: 'USD',
        status: 'pending',
        visaTransactionId: null,
        timestamps: {},
        save: jest.fn().mockResolvedValue(true)
      };

      Transaction.mockImplementation(() => mockTransaction);

      visaDirectService.pullFunds = jest.fn().mockResolvedValue({
        success: true,
        transactionId: 'VISA987654'
      });

      const response = await request(app)
        .post('/api/transactions/pull')
        .send(validPullPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Pull request initiated successfully');
      expect(response.body.transaction).toHaveProperty('id');
      expect(response.body.transaction).toHaveProperty('transactionId');
      expect(response.body.transaction.amount).toBe(50.25);
      expect(response.body.transaction.currency).toBe('USD');
      expect(mockTransaction.status).toBe('processing');
      expect(visaDirectService.pullFunds).toHaveBeenCalled();
    });

    it('should handle pull funds failure from Visa API', async () => {
      const mockTransaction = {
        _id: 'txn456',
        transactionId: 'TXN987654321',
        status: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };

      Transaction.mockImplementation(() => mockTransaction);

      visaDirectService.pullFunds = jest.fn().mockResolvedValue({
        success: false,
        error: 'Card declined'
      });

      const response = await request(app)
        .post('/api/transactions/pull')
        .send(validPullPayload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Pull request failed');
      expect(response.body.error).toBe('Card declined');
      expect(mockTransaction.status).toBe('failed');
    });

    it('should validate required fields for pull request', async () => {
      const response = await request(app)
        .post('/api/transactions/pull')
        .send({
          amount: 50.25
          // Missing senderCard
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should validate amount is numeric for pull request', async () => {
      const response = await request(app)
        .post('/api/transactions/pull')
        .send({
          amount: 'not-a-number',
          senderCard: {
            number: '4111111111111111',
            name: 'Bob Johnson'
          }
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(e => e.msg === 'Amount must be a number')).toBe(true);
    });

    it('should handle server errors in pull request', async () => {
      Transaction.mockImplementation(() => {
        throw new Error('Transaction creation failed');
      });

      const response = await request(app)
        .post('/api/transactions/pull')
        .send(validPullPayload)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
      expect(response.body.error).toBe('Transaction creation failed');
    });
  });

  describe('GET /api/transactions', () => {
    it('should get all transactions for authenticated user', async () => {
      const mockTransactions = [
        {
          _id: 'txn1',
          transactionId: 'TXN001',
          userId: mockUser.id,
          type: 'push',
          amount: 100,
          currency: 'USD',
          status: 'completed',
          createdAt: new Date('2025-11-01')
        },
        {
          _id: 'txn2',
          transactionId: 'TXN002',
          userId: mockUser.id,
          type: 'pull',
          amount: 50,
          currency: 'USD',
          status: 'processing',
          createdAt: new Date('2025-11-02')
        }
      ];

      Transaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockTransactions)
      });

      Transaction.countDocuments = jest.fn().mockResolvedValue(2);

      const response = await request(app)
        .get('/api/transactions')
        .expect(200);

      expect(response.body.transactions).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.currentPage).toBe(1);
      expect(response.body.totalPages).toBe(1);
      expect(Transaction.find).toHaveBeenCalledWith({ userId: mockUser.id });
    });

    it('should filter transactions by status', async () => {
      const mockTransactions = [
        {
          _id: 'txn1',
          transactionId: 'TXN001',
          status: 'completed'
        }
      ];

      Transaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockTransactions)
      });

      Transaction.countDocuments = jest.fn().mockResolvedValue(1);

      const response = await request(app)
        .get('/api/transactions?status=completed')
        .expect(200);

      expect(Transaction.find).toHaveBeenCalledWith({
        userId: mockUser.id,
        status: 'completed'
      });
      expect(response.body.transactions).toHaveLength(1);
    });

    it('should filter transactions by type', async () => {
      const mockTransactions = [
        {
          _id: 'txn1',
          transactionId: 'TXN001',
          type: 'push'
        }
      ];

      Transaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockTransactions)
      });

      Transaction.countDocuments = jest.fn().mockResolvedValue(1);

      const response = await request(app)
        .get('/api/transactions?type=push')
        .expect(200);

      expect(Transaction.find).toHaveBeenCalledWith({
        userId: mockUser.id,
        type: 'push'
      });
      expect(response.body.transactions).toHaveLength(1);
    });

    it('should support pagination', async () => {
      const mockTransactions = [
        { _id: 'txn3', transactionId: 'TXN003' },
        { _id: 'txn4', transactionId: 'TXN004' }
      ];

      Transaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockTransactions)
      });

      Transaction.countDocuments = jest.fn().mockResolvedValue(50);

      const response = await request(app)
        .get('/api/transactions?page=2&limit=10')
        .expect(200);

      expect(response.body.totalPages).toBe(5);
      expect(response.body.currentPage).toBe('2');
      expect(response.body.total).toBe(50);
    });

    it('should handle errors when fetching transactions', async () => {
      Transaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const response = await request(app)
        .get('/api/transactions')
        .expect(500);

      expect(response.body.message).toBe('Database error');
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('should get a transaction by ID', async () => {
      const mockTransaction = {
        _id: 'txn123',
        transactionId: 'TXN123456789',
        userId: mockUser.id,
        type: 'push',
        amount: 100,
        currency: 'USD',
        status: 'completed',
        createdAt: new Date()
      };

      Transaction.findOne = jest.fn().mockResolvedValue(mockTransaction);

      const response = await request(app)
        .get('/api/transactions/txn123')
        .expect(200);

      expect(response.body._id).toBe('txn123');
      expect(response.body.transactionId).toBe('TXN123456789');
      expect(Transaction.findOne).toHaveBeenCalledWith({
        _id: 'txn123',
        userId: mockUser.id
      });
    });

    it('should return 404 if transaction not found', async () => {
      Transaction.findOne = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/transactions/nonexistent')
        .expect(404);

      expect(response.body.message).toBe('Transaction not found');
    });

    it('should not return transactions from other users', async () => {
      Transaction.findOne = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/transactions/other-user-txn')
        .expect(404);

      expect(Transaction.findOne).toHaveBeenCalledWith({
        _id: 'other-user-txn',
        userId: mockUser.id
      });
      expect(response.body.message).toBe('Transaction not found');
    });

    it('should handle errors when fetching single transaction', async () => {
      Transaction.findOne = jest.fn().mockRejectedValue(new Error('Database query failed'));

      const response = await request(app)
        .get('/api/transactions/txn123')
        .expect(500);

      expect(response.body.message).toBe('Database query failed');
    });
  });

  describe('Helper Functions', () => {
    // Note: These helper functions are not exported, so we test them indirectly through the routes

    it('should generate unique transaction IDs', async () => {
      const mockTransactions = [];
      
      Transaction.mockImplementation((data) => {
        mockTransactions.push(data);
        return {
          ...data,
          _id: 'mock-id',
          save: jest.fn().mockResolvedValue(true)
        };
      });

      visaDirectService.pushPayment = jest.fn().mockResolvedValue({
        success: true,
        transactionId: 'VISA123'
      });

      await request(app)
        .post('/api/transactions/push')
        .send({
          amount: 10,
          recipientCard: { number: '4111111111111111', name: 'Test' }
        });

      await request(app)
        .post('/api/transactions/push')
        .send({
          amount: 20,
          recipientCard: { number: '4111111111111111', name: 'Test' }
        });

      expect(mockTransactions[0].transactionId).toBeDefined();
      expect(mockTransactions[1].transactionId).toBeDefined();
      expect(mockTransactions[0].transactionId).not.toBe(mockTransactions[1].transactionId);
    });

    it('should detect Visa card type', async () => {
      const mockTransaction = {
        save: jest.fn().mockResolvedValue(true)
      };

      Transaction.mockImplementation((data) => {
        mockTransaction.recipientCard = data.recipientCard;
        return mockTransaction;
      });

      visaDirectService.pushPayment = jest.fn().mockResolvedValue({
        success: true,
        transactionId: 'VISA123'
      });

      await request(app)
        .post('/api/transactions/push')
        .send({
          amount: 10,
          recipientCard: { number: '4111111111111111', name: 'Test' }
        });

      expect(mockTransaction.recipientCard.cardType).toBe('visa');
    });

    it('should detect Mastercard card type', async () => {
      const mockTransaction = {
        save: jest.fn().mockResolvedValue(true)
      };

      Transaction.mockImplementation((data) => {
        mockTransaction.recipientCard = data.recipientCard;
        return mockTransaction;
      });

      visaDirectService.pushPayment = jest.fn().mockResolvedValue({
        success: true,
        transactionId: 'VISA123'
      });

      await request(app)
        .post('/api/transactions/push')
        .send({
          amount: 10,
          recipientCard: { number: '5555555555554444', name: 'Test' }
        });

      expect(mockTransaction.recipientCard.cardType).toBe('mastercard');
    });
  });
});
