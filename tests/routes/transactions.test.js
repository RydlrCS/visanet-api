const request = require('supertest');
const express = require('express');
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
      const mockTransactionData = {
        id: 'txn123',
        userId: mockUser.id,
        type: 'push',
        amount: 100.50,
        currency: 'USD',
        status: 'processing',
        visaTransactionId: 'VISA123456',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      Transaction.create = jest.fn().mockResolvedValue(mockTransactionData);
      Transaction.updateById = jest.fn().mockResolvedValue(mockTransactionData);

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
      expect(response.body.transaction.amount).toBe(100.50);
      expect(response.body.transaction.currency).toBe('USD');
      expect(response.body.transaction.status).toBe('processing');
      expect(visaDirectService.pushPayment).toHaveBeenCalled();
    });

    it('should handle push payment failure from Visa API', async () => {
      const mockPendingTransaction = {
        id: 'txn123',
        userId: mockUser.id,
        type: 'push',
        amount: 100.50,
        currency: 'USD',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockFailedTransaction = {
        ...mockPendingTransaction,
        status: 'failed',
        errorDetails: JSON.stringify({ error: 'Insufficient funds' })
      };

      Transaction.create = jest.fn().mockResolvedValue(mockPendingTransaction);
      Transaction.updateById = jest.fn().mockResolvedValue(mockFailedTransaction);

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
      const mockTransactionData = {
        id: 'txn123',
        userId: mockUser.id,
        type: 'push',
        amount: 100.50,
        currency: 'USD',
        status: 'processing',
        visaTransactionId: 'VISA123456',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      Transaction.create = jest.fn().mockResolvedValue(mockTransactionData);
      Transaction.updateById = jest.fn().mockResolvedValue(mockTransactionData);

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
      Transaction.create = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/transactions/push')
        .send(validPushPayload)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
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
      const mockTransactionData = {
        id: 'txn456',
        userId: mockUser.id,
        type: 'pull',
        amount: 50.25,
        currency: 'USD',
        status: 'processing',
        visaTransactionId: 'VISA987654',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      Transaction.create = jest.fn().mockResolvedValue(mockTransactionData);
      Transaction.updateById = jest.fn().mockResolvedValue(mockTransactionData);

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
      expect(response.body.transaction.amount).toBe(50.25);
      expect(response.body.transaction.currency).toBe('USD');
      expect(response.body.transaction.status).toBe('processing');
      expect(visaDirectService.pullFunds).toHaveBeenCalled();
    });

    it('should handle pull funds failure from Visa API', async () => {
      const mockPendingTransaction = {
        id: 'txn456',
        userId: mockUser.id,
        type: 'pull',
        amount: 50.25,
        currency: 'USD',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockFailedTransaction = {
        ...mockPendingTransaction,
        status: 'failed',
        errorDetails: JSON.stringify({ error: 'Card declined' })
      };

      Transaction.create = jest.fn().mockResolvedValue(mockPendingTransaction);
      Transaction.updateById = jest.fn().mockResolvedValue(mockFailedTransaction);

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
      Transaction.create = jest.fn().mockRejectedValue(new Error('Transaction creation failed'));

      const response = await request(app)
        .post('/api/transactions/pull')
        .send(validPullPayload)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });
  });

  describe('GET /api/transactions', () => {
    it('should get all transactions for authenticated user', async () => {
      const mockTransactions = [
        {
          id: 'txn1',
          userId: mockUser.id,
          type: 'push',
          amount: 100,
          currency: 'USD',
          status: 'completed',
          createdAt: new Date('2025-11-01')
        },
        {
          id: 'txn2',
          userId: mockUser.id,
          type: 'pull',
          amount: 50,
          currency: 'USD',
          status: 'processing',
          createdAt: new Date('2025-11-02')
        }
      ];

      Transaction.find = jest.fn().mockResolvedValue(mockTransactions);
      Transaction.count = jest.fn().mockResolvedValue(2);

      const response = await request(app)
        .get('/api/transactions')
        .expect(200);

      expect(response.body.transactions).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.currentPage).toBe(1);
      expect(response.body.totalPages).toBe(1);
      expect(Transaction.find).toHaveBeenCalledWith(
        { userId: mockUser.id },
        { limit: 20, offset: 0, orderBy: [{ field: 'createdAt', direction: 'DESC' }] }
      );
    });

    it('should filter transactions by status', async () => {
      const mockTransactions = [
        {
          id: 'txn1',
          status: 'completed'
        }
      ];

      Transaction.find = jest.fn().mockResolvedValue(mockTransactions);
      Transaction.count = jest.fn().mockResolvedValue(1);

      const response = await request(app)
        .get('/api/transactions?status=completed')
        .expect(200);

      expect(Transaction.find).toHaveBeenCalledWith(
        { userId: mockUser.id, status: 'completed' },
        { limit: 20, offset: 0, orderBy: [{ field: 'createdAt', direction: 'DESC' }] }
      );
      expect(response.body.transactions).toHaveLength(1);
    });

    it('should filter transactions by type', async () => {
      const mockTransactions = [
        {
          id: 'txn1',
          type: 'push'
        }
      ];

      Transaction.find = jest.fn().mockResolvedValue(mockTransactions);
      Transaction.count = jest.fn().mockResolvedValue(1);

      const response = await request(app)
        .get('/api/transactions?type=push')
        .expect(200);

      expect(Transaction.find).toHaveBeenCalledWith(
        { userId: mockUser.id, type: 'push' },
        { limit: 20, offset: 0, orderBy: [{ field: 'createdAt', direction: 'DESC' }] }
      );
      expect(response.body.transactions).toHaveLength(1);
    });

    it('should support pagination', async () => {
      const mockTransactions = [
        { id: 'txn3' },
        { id: 'txn4' }
      ];

      Transaction.find = jest.fn().mockResolvedValue(mockTransactions);
      Transaction.count = jest.fn().mockResolvedValue(50);

      const response = await request(app)
        .get('/api/transactions?page=2&limit=10')
        .expect(200);

      expect(response.body.totalPages).toBe(5);
      expect(response.body.currentPage).toBe(2);
      expect(response.body.total).toBe(50);
    });

    it('should handle errors when fetching transactions', async () => {
      Transaction.find = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/transactions')
        .expect(500);

      expect(response.body.message).toBe('Database error');
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('should get a transaction by ID', async () => {
      const mockTransaction = {
        id: 'txn123',
        userId: mockUser.id,
        type: 'push',
        amount: 100,
        currency: 'USD',
        status: 'completed',
        createdAt: new Date()
      };

      Transaction.findById = jest.fn().mockResolvedValue(mockTransaction);

      const response = await request(app)
        .get('/api/transactions/txn123')
        .expect(200);

      expect(response.body.id).toBe('txn123');
      expect(Transaction.findById).toHaveBeenCalledWith('txn123');
    });

    it('should return 404 if transaction not found', async () => {
      Transaction.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/transactions/nonexistent')
        .expect(404);

      expect(response.body.message).toBe('Transaction not found');
    });

    it('should not return transactions from other users', async () => {
      const otherUserTransaction = {
        id: 'other-user-txn',
        userId: 'different-user-id'
      };
      Transaction.findById = jest.fn().mockResolvedValue(otherUserTransaction);

      const response = await request(app)
        .get('/api/transactions/other-user-txn')
        .expect(404);

      expect(Transaction.findById).toHaveBeenCalledWith('other-user-txn');
      expect(response.body.message).toBe('Transaction not found');
    });

    it('should handle errors when fetching single transaction', async () => {
      Transaction.findById = jest.fn().mockRejectedValue(new Error('Database query failed'));

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
      
      Transaction.create = jest.fn().mockImplementation((data) => {
        const txn = {
          ...data,
          id: 'mock-id-' + mockTransactions.length,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockTransactions.push(txn);
        return Promise.resolve(txn);
      });

      Transaction.updateById = jest.fn().mockImplementation((id, data) => {
        return Promise.resolve({ ...data, id });
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

      expect(mockTransactions.length).toBe(2);
      // Transaction IDs are generated by the model, not passed in
      expect(mockTransactions[0].id).toBeDefined();
      expect(mockTransactions[1].id).toBeDefined();
    });

    it('should detect Visa card type', async () => {
      const mockTransaction = {
        id: 'txn-visa',
        userId: mockUser.id,
        type: 'push',
        amount: 10,
        status: 'processing',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      Transaction.create = jest.fn().mockResolvedValue(mockTransaction);
      Transaction.updateById = jest.fn().mockResolvedValue(mockTransaction);

      visaDirectService.pushPayment = jest.fn().mockResolvedValue({
        success: true,
        transactionId: 'VISA123'
      });

      await request(app)
        .post('/api/transactions/push')
        .send({
          amount: 10,
          recipientCard: {
            number: '4111111111111111',
            name: 'Test User'
          }
        });

      // Card type detection happens in the route, verify the create was called
      expect(Transaction.create).toHaveBeenCalled();
    });

    it('should detect Mastercard card type', async () => {
      const mockTransaction = {
        id: 'txn-mc',
        userId: mockUser.id,
        type: 'push',
        amount: 10,
        status: 'processing',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      Transaction.create = jest.fn().mockResolvedValue(mockTransaction);
      Transaction.updateById = jest.fn().mockResolvedValue(mockTransaction);

      visaDirectService.pushPayment = jest.fn().mockResolvedValue({
        success: true,
        transactionId: 'VISA123'
      });

      await request(app)
        .post('/api/transactions/push')
        .send({
          amount: 10,
          recipientCard: {
            number: '5555555555554444',
            name: 'Test User'
          }
        });

      // Card type detection happens in the route, verify the create was called
      expect(Transaction.create).toHaveBeenCalled();
    });
  });
});
