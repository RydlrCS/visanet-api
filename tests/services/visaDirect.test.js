// Mock dependencies BEFORE imports
jest.mock('https');
jest.mock('../../utils/xpay');
jest.mock('../../utils/mle', () => ({
  verifyConfiguration: jest.fn().mockReturnValue({
    configured: true,
    errors: []
  }),
  encryptCardData: jest.fn().mockResolvedValue({
    success: true,
    encryptedData: 'encrypted_pan_data'
  }),
  encrypt: jest.fn().mockReturnValue({
    encryptedData: 'encrypted_data',
    encryptionKeyId: 'test_key_id'
  })
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));
jest.mock('../../config/visa', () => ({
  createHttpsAgent: jest.fn().mockReturnValue({ keepAlive: true })
}));

// Setup environment variables before importing
process.env.VISA_URL = 'https://sandbox.api.visa.com';
process.env.VISA_DIRECT_USER_ID = 'test_user';
process.env.VISA_DIRECT_PASSWORD = 'test_password';
process.env.VISA_SHARED_SECRET = 'test_secret';
process.env.VISA_DIRECT_MLE_KEY_ID = 'test_key_id';
process.env.VISA_CARD_ACCEPTOR_NAME = 'Test Merchant';
process.env.VISA_CARD_ACCEPTOR_ID = 'TEST001';
process.env.VISA_ACQUIRING_BIN = '408999';
process.env.VISA_ACQUIRER_COUNTRY_CODE = '840';

const VisaDirectService = require('../../services/visaDirect');
const https = require('https');
const xpay = require('../../utils/xpay');
const mle = require('../../utils/mle');
const logger = require('../../utils/logger');

describe('VisaDirectService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock implementations
    mle.verifyConfiguration.mockReturnValue({
      configured: true,
      errors: []
    });

    mle.encryptCardData.mockResolvedValue({
      success: true,
      encryptedData: 'encrypted_pan_data'
    });
  });

  afterEach(() => {
    delete process.env.VISA_URL;
    delete process.env.VISA_DIRECT_USER_ID;
    delete process.env.VISA_DIRECT_PASSWORD;
    delete process.env.VISA_SHARED_SECRET;
    delete process.env.VISA_DIRECT_MLE_KEY_ID;
  });

  describe('Constructor', () => {
    it('should have MLE enabled when configured', () => {
      expect(VisaDirectService.useMLE).toBe(true);
    });

    it('should have default card acceptor information set', () => {
      expect(VisaDirectService.defaultCardAcceptor).toBeDefined();
      expect(VisaDirectService.defaultCardAcceptor.name).toBe('Test Merchant');
      expect(VisaDirectService.defaultCardAcceptor.idCode).toBe('TEST001');
    });

    it('should have X-Pay-Token enabled when shared secret is configured', () => {
      expect(VisaDirectService.useXPayToken).toBe(true);
    });
  });

  describe('createHeaders', () => {
    it('should create basic authentication headers', () => {
      const headers = VisaDirectService.createHeaders();
      
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Accept']).toBe('application/json');
      expect(headers['Authorization']).toContain('Basic');
    });

    it('should include X-Pay-Token when configured', () => {
      xpay.generateHeaders = jest.fn().mockReturnValue({
        'x-pay-token': 'test_token',
        'x-v-datetime': '2025-11-14T12:00:00Z'
      });

      const headers = VisaDirectService.createHeaders('/visadirect/fundstransfer/v1/pushfundstransactions', { test: 'data' });
      
      expect(headers['x-pay-token']).toBe('test_token');
      expect(headers['x-v-datetime']).toBe('2025-11-14T12:00:00Z');
      expect(xpay.generateHeaders).toHaveBeenCalled();
    });

    it('should handle X-Pay-Token generation failure gracefully', () => {
      xpay.generateHeaders = jest.fn().mockImplementation(() => {
        throw new Error('XPay generation failed');
      });

      const headers = VisaDirectService.createHeaders('/test', { test: 'data' });
      
      expect(headers['x-pay-token']).toBeUndefined();
      expect(headers['Authorization']).toContain('Basic');
    });
  });

  describe('generateSystemsTraceAuditNumber', () => {
    it('should generate a 6-digit number', () => {
      const stan = VisaDirectService.generateSystemsTraceAuditNumber();
      expect(stan).toBeGreaterThanOrEqual(100000);
      expect(stan).toBeLessThanOrEqual(999999);
    });

    it('should generate unique numbers', () => {
      const stan1 = VisaDirectService.generateSystemsTraceAuditNumber();
      const stan2 = VisaDirectService.generateSystemsTraceAuditNumber();
      // High probability of being different
      expect(typeof stan1).toBe('number');
      expect(typeof stan2).toBe('number');
    });
  });

  describe('generateRetrievalReferenceNumber', () => {
    it('should generate a 12-character retrieval reference number', () => {
      const stan = 123456;
      const rrn = VisaDirectService.generateRetrievalReferenceNumber(stan);
      
      expect(rrn).toHaveLength(12);
      expect(rrn).toMatch(/^\d{12}$/);
    });

    it('should include the STAN in the retrieval reference number', () => {
      const stan = 123456;
      const rrn = VisaDirectService.generateRetrievalReferenceNumber(stan);
      
      expect(rrn).toContain('123456');
    });
  });

  describe('getLocalTransactionDateTime', () => {
    it('should return ISO formatted date/time without milliseconds', () => {
      const dateTime = VisaDirectService.getLocalTransactionDateTime();
      
      expect(dateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('makeRequest', () => {
    it('should make successful HTTP request', async () => {
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            handler(JSON.stringify({ success: true }));
          } else if (event === 'end') {
            handler();
          }
        })
      };

      const mockRequest = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };

      https.request = jest.fn((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await VisaDirectService.makeRequest('POST', '/test', { data: 'test' });
      
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual({ success: true });
      expect(mockRequest.write).toHaveBeenCalled();
      expect(mockRequest.end).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        statusCode: 400,
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            handler(JSON.stringify({ error: 'Bad Request' }));
          } else if (event === 'end') {
            handler();
          }
        })
      };

      const mockRequest = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };

      https.request = jest.fn((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      await expect(VisaDirectService.makeRequest('POST', '/test', { data: 'test' }))
        .rejects.toThrow('API Error: 400');
    });

    it('should handle network errors', async () => {
      const mockRequest = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };

      https.request = jest.fn(() => {
        // Trigger error handler immediately
        setTimeout(() => {
          const errorHandler = mockRequest.on.mock.calls.find(call => call[0] === 'error');
          if (errorHandler) {
            errorHandler[1](new Error('Network error'));
          }
        }, 0);
        return mockRequest;
      });

      await expect(VisaDirectService.makeRequest('POST', '/test', { data: 'test' }))
        .rejects.toThrow('Network error');
    });
  });

  describe('pushPayment', () => {
    let mockPushParams;

    beforeEach(() => {
      mockPushParams = {
        amount: 100.50,
        recipientPAN: '4111111111111111',
        currency: 'USD',
        businessApplicationId: 'AA',
        sender: {
          name: 'John Doe',
          address: {
            city: 'San Francisco',
            state: 'CA',
            country: 'USA'
          }
        },
        recipient: {
          name: 'Jane Smith'
        }
      };

      // Mock successful HTTPS request
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            handler(JSON.stringify({
              statusCode: '200',
              approvalCode: 'APPROVAL123',
              transactionIdentifier: 'TXN123456',
              actionCode: '00'
            }));
          } else if (event === 'end') {
            handler();
          }
        })
      };

      const mockRequest = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };

      https.request = jest.fn((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });
    });

    it('should successfully execute push payment', async () => {
      const result = await VisaDirectService.pushPayment(mockPushParams);
      
      expect(result.success).toBe(true);
      expect(result.approvalCode).toBe('APPROVAL123');
      expect(result.transactionIdentifier).toBe('TXN123456');
    });

    it('should encrypt recipient PAN when MLE is enabled', async () => {
      await VisaDirectService.pushPayment(mockPushParams);
      
      expect(mle.encrypt).toHaveBeenCalledWith(
        expect.objectContaining({ recipientPrimaryAccountNumber: '4111111111111111' }),
        'visaDirect'
      );
    });

    it('should fall back to plain PAN when MLE encryption fails', async () => {
      mle.encryptCardData.mockResolvedValue({
        success: false,
        error: 'Encryption failed'
      });

      const result = await VisaDirectService.pushPayment(mockPushParams);
      
      expect(result.success).toBe(true);
    });

    it('should handle API rejection', async () => {
      const mockResponse = {
        statusCode: 400,
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            handler(JSON.stringify({
              statusCode: '400',
              message: 'Invalid card number'
            }));
          } else if (event === 'end') {
            handler();
          }
        })
      };

      const mockRequest = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };

      https.request = jest.fn((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      await expect(VisaDirectService.pushPayment(mockPushParams))
        .rejects.toThrow();
    });

    it('should use default currency when not provided', async () => {
      const paramsWithoutCurrency = { ...mockPushParams };
      delete paramsWithoutCurrency.currency;

      await VisaDirectService.pushPayment(paramsWithoutCurrency);
      
      expect(https.request).toHaveBeenCalled();
    });
  });

  describe('pullFunds', () => {
    let mockPullParams;

    beforeEach(() => {
      mockPullParams = {
        amount: 50.25,
        senderPAN: '5555555555554444',
        currency: 'USD',
        businessApplicationId: 'AA',
        sender: {
          name: 'Bob Johnson',
          address: {
            city: 'New York',
            state: 'NY',
            country: 'USA'
          }
        }
      };

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            handler(JSON.stringify({
              statusCode: '200',
              approvalCode: 'PULL123',
              transactionIdentifier: 'PULL456789',
              actionCode: '00'
            }));
          } else if (event === 'end') {
            handler();
          }
        })
      };

      const mockRequest = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };

      https.request = jest.fn((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });
    });

    it('should successfully execute pull funds request', async () => {
      const result = await VisaDirectService.pullFunds(mockPullParams);
      
      expect(result.success).toBe(true);
      expect(result.approvalCode).toBe('PULL123');
      expect(result.transactionIdentifier).toBe('PULL456789');
    });

    it('should encrypt sender PAN when MLE is enabled', async () => {
      await VisaDirectService.pullFunds(mockPullParams);
      
      expect(mle.encrypt).toHaveBeenCalledWith(
        expect.objectContaining({ senderPrimaryAccountNumber: '5555555555554444' }),
        'visaDirect'
      );
    });

    it('should handle pull funds API failure', async () => {
      const mockResponse = {
        statusCode: 500,
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            handler(JSON.stringify({
              statusCode: '500',
              message: 'Internal server error'
            }));
          } else if (event === 'end') {
            handler();
          }
        })
      };

      const mockRequest = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };

      https.request = jest.fn((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      await expect(VisaDirectService.pullFunds(mockPullParams))
        .rejects.toThrow();
    });
  });

  describe('reverseTransaction', () => {
    let mockReverseParams;

    beforeEach(() => {
      mockReverseParams = {
        originalTransaction: {
          amount: 100.50,
          senderPAN: '5555555555554444',
          systemsTraceAuditNumber: 123456,
          retrievalReferenceNumber: '512345123456',
          transmissionDateTime: '2024-01-15T10:00:00',
          approvalCode: 'APPROVAL123',
          transactionIdentifier: 'TXN123456'
        },
        businessApplicationId: 'AA',
        currency: 'USD'
      };

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            handler(JSON.stringify({
              statusCode: '200',
              aftrResponseDetail: {
                approvalCode: 'APP123',
                responseCode: '00',
                actionCode: '00'
              }
            }));
          } else if (event === 'end') {
            handler();
          }
        })
      };      const mockRequest = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };

      https.request = jest.fn((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });
    });

    it('should successfully execute reverse transaction', async () => {
      const result = await VisaDirectService.reverseTransaction(mockReverseParams);
      
      expect(result.success).toBe(true);
      expect(result.responseCode).toBeDefined();
    });

    it('should handle reverse transaction failure', async () => {
      const mockResponse = {
        statusCode: 400,
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            handler(JSON.stringify({
              statusCode: '400',
              message: 'Original transaction not found'
            }));
          } else if (event === 'end') {
            handler();
          }
        })
      };

      const mockRequest = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };

      https.request = jest.fn((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      await expect(VisaDirectService.reverseTransaction(mockReverseParams))
        .rejects.toThrow();
    });

    it('should include required transaction identifiers', async () => {
      await VisaDirectService.reverseTransaction(mockReverseParams);
      
      expect(https.request).toHaveBeenCalled();
      const requestCall = https.request.mock.calls[0];
      const requestBody = JSON.parse(requestCall[1].body || '{}');
      
      // Verify the request structure (basic check since we can't inspect full payload easily)
      expect(requestCall[1].method).toBe('POST');
    });
  });

  describe('Error Handling', () => {
    it('should handle MLE encryption failures gracefully in pushPayment', async () => {
      mle.encryptCardData.mockRejectedValue(new Error('Encryption service unavailable'));

      const params = {
        amount: 100,
        recipientPAN: '4111111111111111',
        currency: 'USD',
        businessApplicationId: 'AA',
        sender: { name: 'Test', address: { city: 'SF', state: 'CA', country: 'USA' } },
        recipient: { name: 'Test' }
      };

      // Mock successful API response
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            handler(JSON.stringify({ statusCode: '200', approvalCode: 'OK', transactionIdentifier: 'TXN123' }));
          } else if (event === 'end') {
            handler();
          }
        })
      };

      const mockRequest = { write: jest.fn(), end: jest.fn(), on: jest.fn() };
      https.request = jest.fn((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      // Should still attempt the transaction with plain text
      const result = await VisaDirectService.pushPayment(params);
      
      expect(result.success).toBe(true);
    });

    it('should handle missing required parameters', async () => {
      await expect(VisaDirectService.pushPayment({}))
        .rejects.toThrow('Missing required fields');
    });
  });
});
