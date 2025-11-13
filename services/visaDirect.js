const https = require('https');
const config = require('../config/visa');
const logger = require('../utils/logger');
const xpay = require('../utils/xpay');
const mle = require('../utils/mle');

/**
 * Visa Direct Service - API Client for Visa Direct Fund Transfers
 * Based on official Visa Direct API OpenAPI 3.0.1 specification
 *
 * Supported Operations:
 * - Push Funds Transaction (OCT - Original Credit Transaction)
 * - Pull Funds Transaction (AFT - Account Funding Transaction)
 * - Reverse Funds Transaction (AFTR - Account Funding Transaction Reversal)
 * - Transaction Status Query
 *
 * Security Layers:
 * 1. Mutual TLS: Client certificate authentication
 * 2. X-Pay-Token: HMAC-SHA256 request signing (if configured)
 * 3. MLE: End-to-end payload encryption for sensitive card data
 *
 * MLE Configuration:
 * - Key ID: VISA_DIRECT_MLE_KEY_ID (from .env)
 * - Client Certificate: VISA_DIRECT_MLE_CLIENT_CERT
 * - Server Certificate: VISA_DIRECT_MLE_SERVER_CERT (Visa's public key)
 * - Private Key: VISA_DIRECT_MLE_PRIVATE_KEY
 * - Algorithm: RSA-OAEP with SHA-256
 * - Config Type: 'visaDirect'
 *
 * @see docs/VISA_DIRECT_API_FIELDS.md for detailed field reference
 */
class VisaDirectService {
  /**
   * Initialize Visa Direct service with MLE encryption support
   *
   * The constructor:
   * 1. Sets up HTTPS agent with mutual TLS certificates
   * 2. Verifies MLE configuration for Visa Direct
   * 3. Logs MLE status (enabled/disabled with reasons)
   * 4. Configures default card acceptor information
   *
   * @constructor
   */
  constructor() {
    logger.info('[VisaDirect] Initializing Visa Direct service');
    this.baseURL = process.env.VISA_URL || 'https://sandbox.api.visa.com';
    this.agent = config.createHttpsAgent();
    this.useXPayToken = process.env.VISA_SHARED_SECRET ? true : false;

    // Verify MLE configuration for Visa Direct
    const mleStatus = mle.verifyConfiguration('visaDirect');
    if (mleStatus.configured) {
      logger.info('[VisaDirect] MLE encryption enabled', {
        keyId: process.env.VISA_DIRECT_MLE_KEY_ID,
        algorithm: 'RSA-OAEP-SHA256'
      });
      this.useMLE = true;
    } else {
      logger.warn('[VisaDirect] MLE encryption not configured - sensitive data will be sent in plain text', {
        errors: mleStatus.errors
      });
      this.useMLE = false;
    }

    // Default card acceptor information (should match enrollment data)
    this.defaultCardAcceptor = {
      name: process.env.VISA_CARD_ACCEPTOR_NAME || 'Locapay Limited',
      idCode: process.env.VISA_CARD_ACCEPTOR_ID || 'LOCAPAY001',
      terminalId: process.env.VISA_TERMINAL_ID || '12345678',
      address: {
        city: process.env.VISA_ACCEPTOR_CITY || 'San Francisco',
        state: process.env.VISA_ACCEPTOR_STATE || 'CA',
        country: process.env.VISA_ACCEPTOR_COUNTRY || 'USA',
        county: process.env.VISA_ACCEPTOR_COUNTY || '081',
        zipCode: process.env.VISA_ACCEPTOR_ZIP || '94404'
      }
    };

    // Default acquiring information
    this.acquiringBin = parseInt(process.env.VISA_ACQUIRING_BIN) || 408999;
    this.acquirerCountryCode = parseInt(process.env.VISA_ACQUIRER_COUNTRY_CODE) || 840; // USA
  }

  /**
   * Create authentication headers for Visa API
   * Includes both Basic Auth and X-Pay-Token (if configured)
   *
   * @param {string} resourcePath - API endpoint path
   * @param {object} payload - Request body for x-pay-token generation
   * @returns {object} Headers object
   */
  createHeaders(resourcePath = '', payload = null) {
    // Basic authentication for Visa Direct
    const authString = Buffer.from(
      `${process.env.VISA_DIRECT_USER_ID}:${process.env.VISA_DIRECT_PASSWORD}`
    ).toString('base64');

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${authString}`
    };

    // Add x-pay-token if shared secret is configured
    if (this.useXPayToken && resourcePath && payload) {
      try {
        const xpayHeaders = xpay.generateHeaders(resourcePath, '', payload);
        headers['x-pay-token'] = xpayHeaders['x-pay-token'];
        headers['x-v-datetime'] = xpayHeaders['x-v-datetime'];
        logger.debug('X-Pay-Token generated for request', { resourcePath });
      } catch (error) {
        logger.warn('Failed to generate x-pay-token, falling back to Basic Auth only', { error: error.message });
      }
    }

    return headers;
  }

  /**
   * Generate unique systems trace audit number (6 digits)
   * Must be unique for each API call
   */
  generateSystemsTraceAuditNumber() {
    return Math.floor(Math.random() * 900000) + 100000;
  }

  /**
   * Generate retrieval reference number in ydddhhnnnnnn format
   * @param {number} systemsTraceAuditNumber - The STAN for this transaction
   * @returns {string} 12-character retrieval reference number
   *
   * Format: ydddhhnnnnnn
   * - y: Last digit of year (0-9)
   * - ddd: Day of year (001-366)
   * - hh: Hour (00-23)
   * - nnnnnn: Systems trace audit number
   */
  generateRetrievalReferenceNumber(systemsTraceAuditNumber) {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-1);
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now - startOfYear;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay).toString().padStart(3, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const trace = systemsTraceAuditNumber.toString().padStart(6, '0');

    return `${year}${dayOfYear}${hour}${trace}`;
  }

  /**
   * Get current local transaction date/time in ISO format
   * @returns {string} YYYY-MM-DDThh:mm:ss
   */
  getLocalTransactionDateTime() {
    return new Date().toISOString().split('.')[0];
  }

  /**
   * Make HTTP request to Visa API
   * @param {string} method - HTTP method (GET, POST)
   * @param {string} path - API endpoint path
   * @param {object} data - Request payload (for POST)
   * @returns {Promise<object>} Response with statusCode and data
   */
  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseURL);

      const options = {
        method,
        headers: this.createHeaders(path, data),
        agent: this.agent
      };

      logger.info(`Making ${method} request to ${url.toString()}`);
      if (data) {
        logger.debug('Request payload', { payload: data });
      }

      const req = https.request(url, options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsedData = responseData ? JSON.parse(responseData) : {};

            if (res.statusCode >= 200 && res.statusCode < 300) {
              logger.info(`Request successful: ${res.statusCode}`);
              logger.debug('Response data', { response: parsedData });
              resolve({ statusCode: res.statusCode, data: parsedData });
            } else {
              logger.error(`Request failed: ${res.statusCode}`, parsedData);
              reject(new Error(`API Error: ${res.statusCode} - ${JSON.stringify(parsedData)}`));
            }
          } catch (error) {
            logger.error('Failed to parse response', { error: error.message, data: responseData });
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        logger.error('Request error', { error: error.message });
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Push Funds Transaction (OCT - Original Credit Transaction)
   * Send money to a recipient's Visa card
   *
   * Security:
   * - If MLE is configured, recipient PAN will be encrypted using Visa Direct MLE config
   * - Encrypted data replaces plain PAN in the request
   * - Falls back to plain text if encryption fails (with warning logged)
   *
   * @param {object} params - Transaction parameters
   * @param {number} params.amount - Transaction amount (max 999999999.999)
   * @param {string} params.recipientPAN - Recipient card number (13-19 digits) - will be encrypted if MLE enabled
   * @param {string} params.currency - Currency code (e.g., 'USD', 'EUR')
   * @param {string} params.businessApplicationId - Business application ID (AA, PP, FD, etc.)
   * @param {object} params.sender - Sender information (conditional based on business type)
   * @param {object} params.recipient - Recipient information (conditional for cross-border)
   * @param {object} params.cardAcceptor - Card acceptor info (optional, uses defaults)
   * @returns {Promise<object>} Transaction response
   */
  async pushPayment(params) {
    try {
      const {
        amount,
        recipientPAN,
        currency = 'USD',
        businessApplicationId = 'AA', // AA = P2P same person, PP = P2P different persons
        sender = {},
        recipient = {},
        cardAcceptor,
        merchantCategoryCode,
        sourceOfFundsCode,
        senderAccountNumber,
        senderReference
      } = params;

      // Validate required fields
      if (!amount || !recipientPAN) {
        throw new Error('Missing required fields: amount and recipientPAN are required');
      }

      // Generate transaction identifiers
      const systemsTraceAuditNumber = this.generateSystemsTraceAuditNumber();
      const retrievalReferenceNumber = this.generateRetrievalReferenceNumber(systemsTraceAuditNumber);

      // Encrypt sensitive card data if MLE is enabled
      let recipientPANForRequest = recipientPAN;
      let encryptedData = null;

      if (this.useMLE) {
        logger.info('[VisaDirect] Encrypting recipient card data with MLE', {
          systemsTraceAuditNumber,
          retrievalReferenceNumber,
          configType: 'visaDirect'
        });

        try {
          encryptedData = mle.encrypt(
            {
              recipientPrimaryAccountNumber: recipientPAN
            },
            'visaDirect'
          );

          logger.info('[VisaDirect] Card data encrypted successfully', {
            encryptedDataSize: encryptedData.encryptedData?.length || 0,
            keyId: encryptedData.encryptionKeyId,
            systemsTraceAuditNumber
          });

          // Use encrypted data field instead of plain PAN
          recipientPANForRequest = null;
        } catch (encryptError) {
          logger.error('[VisaDirect] MLE encryption failed, falling back to plain text', {
            error: encryptError.message,
            systemsTraceAuditNumber
          });
          // Fall back to plain PAN if encryption fails
        }
      } else {
        logger.warn('[VisaDirect] Sending recipient PAN in plain text - MLE not configured', {
          systemsTraceAuditNumber
        });
      }

      // Build payload according to Visa Direct API specification
      const payload = {
        // Required fields
        acquirerCountryCode: this.acquirerCountryCode,
        acquiringBin: this.acquiringBin,
        amount: parseFloat(amount),
        businessApplicationId,
        cardAcceptor: cardAcceptor || this.defaultCardAcceptor,
        localTransactionDateTime: this.getLocalTransactionDateTime(),
        ...(recipientPANForRequest && { recipientPrimaryAccountNumber: recipientPANForRequest }),
        ...(encryptedData && { encryptedData: encryptedData.encryptedData }),
        retrievalReferenceNumber,
        systemsTraceAuditNumber,
        transactionCurrencyCode: currency,

        // Optional but recommended fields
        ...(merchantCategoryCode && { merchantCategoryCode: parseInt(merchantCategoryCode) }),
        ...(sourceOfFundsCode && { sourceOfFundsCode }),
        ...(senderAccountNumber && { senderAccountNumber }),
        ...(senderReference && { senderReference }),

        // Sender information (conditional based on transaction type)
        ...(sender.name && { senderName: sender.name }),
        ...(sender.address && { senderAddress: sender.address }),
        ...(sender.city && { senderCity: sender.city }),
        ...(sender.stateCode && { senderStateCode: sender.stateCode }),
        ...(sender.countryCode && { senderCountryCode: sender.countryCode }),
        ...(sender.postalCode && { senderPostalCode: sender.postalCode }),
        ...(sender.firstName && { senderFirstName: sender.firstName }),
        ...(sender.lastName && { senderLastName: sender.lastName }),
        ...(sender.middleName && { senderMiddleName: sender.middleName }),

        // Recipient information (conditional for cross-border)
        ...(recipient.name && { recipientName: recipient.name }),
        ...(recipient.city && { recipientCity: recipient.city }),
        ...(recipient.state && { recipientState: recipient.state }),
        ...(recipient.countryCode && { recipientCountryCode: recipient.countryCode }),
        ...(recipient.postalCode && { recipientPostalCode: recipient.postalCode }),
        ...(recipient.firstName && { recipientFirstName: recipient.firstName }),
        ...(recipient.lastName && { recipientLastName: recipient.lastName }),
        ...(recipient.middleName && { recipientMiddleName: recipient.middleName })
      };

      logger.info('Initiating Push Funds Transaction (OCT)', {
        amount,
        currency,
        businessApplicationId,
        systemsTraceAuditNumber,
        retrievalReferenceNumber
      });

      const response = await this.makeRequest(
        'POST',
        '/visadirect/fundstransfer/v1/pushfundstransactions',
        payload
      );

      // Handle async processing (202 Accepted)
      if (response.statusCode === 202) {
        logger.info('Transaction accepted for async processing', {
          statusIdentifier: response.data.statusIdentifier
        });
        return {
          success: true,
          status: 'pending',
          statusIdentifier: response.data.statusIdentifier,
          message: 'Transaction is being processed. Use getTransactionStatus() to check status.',
          data: response.data
        };
      }

      // Handle immediate success (200 OK)
      logger.info('Push Funds Transaction successful', {
        transactionIdentifier: response.data.transactionIdentifier,
        approvalCode: response.data.approvalCode,
        responseCode: response.data.responseCode
      });

      return {
        success: true,
        status: 'completed',
        transactionIdentifier: response.data.transactionIdentifier,
        approvalCode: response.data.approvalCode,
        responseCode: response.data.responseCode,
        actionCode: response.data.actionCode,
        transmissionDateTime: response.data.transmissionDateTime,
        data: response.data
      };

    } catch (error) {
      logger.error('Push Funds Transaction failed', {
        error: error.message,
        stack: error.stack
      });
      throw this.handleError(error);
    }
  }

  /**
   * Pull Funds Transaction (AFT - Account Funding Transaction)
   * Request money from a sender's Visa card
   *
   * Security:
   * - If MLE is configured, sender PAN will be encrypted using Visa Direct MLE config
   * - Encrypted data replaces plain PAN in the request
   * - Falls back to plain text if encryption fails (with warning logged)
   *
   * @param {object} params - Transaction parameters
   * @param {number} params.amount - Transaction amount
   * @param {string} params.senderPAN - Sender card number (13-19 digits) - will be encrypted if MLE enabled
   * @param {string} params.currency - Currency code
   * @param {string} params.businessApplicationId - Business application ID
   * @param {object} params.sender - Sender information
   * @param {object} params.cardAcceptor - Card acceptor info (optional)
   * @returns {Promise<object>} Transaction response
   */
  async pullFunds(params) {
    try {
      const {
        amount,
        senderPAN,
        currency = 'USD',
        businessApplicationId = 'AA',
        sender = {},
        cardAcceptor,
        merchantCategoryCode
      } = params;

      // Validate required fields
      if (!amount || !senderPAN) {
        throw new Error('Missing required fields: amount and senderPAN are required');
      }

      // Generate transaction identifiers
      const systemsTraceAuditNumber = this.generateSystemsTraceAuditNumber();
      const retrievalReferenceNumber = this.generateRetrievalReferenceNumber(systemsTraceAuditNumber);

      // Encrypt sensitive card data if MLE is enabled
      let senderPANForRequest = senderPAN;
      let encryptedData = null;

      if (this.useMLE) {
        logger.info('[VisaDirect] Encrypting sender card data with MLE', {
          systemsTraceAuditNumber,
          retrievalReferenceNumber,
          configType: 'visaDirect'
        });

        try {
          encryptedData = mle.encrypt(
            {
              senderPrimaryAccountNumber: senderPAN
            },
            'visaDirect'
          );

          logger.info('[VisaDirect] Card data encrypted successfully', {
            encryptedDataSize: encryptedData.encryptedData?.length || 0,
            keyId: encryptedData.encryptionKeyId,
            systemsTraceAuditNumber
          });

          // Use encrypted data field instead of plain PAN
          senderPANForRequest = null;
        } catch (encryptError) {
          logger.error('[VisaDirect] MLE encryption failed, falling back to plain text', {
            error: encryptError.message,
            systemsTraceAuditNumber
          });
          // Fall back to plain PAN if encryption fails
        }
      } else {
        logger.warn('[VisaDirect] Sending sender PAN in plain text - MLE not configured', {
          systemsTraceAuditNumber
        });
      }

      // Build payload according to Visa Direct API specification
      const payload = {
        // Required fields for AFT
        acquirerCountryCode: this.acquirerCountryCode,
        acquiringBin: this.acquiringBin,
        amount: parseFloat(amount),
        businessApplicationId,
        cardAcceptor: cardAcceptor || this.defaultCardAcceptor,
        localTransactionDateTime: this.getLocalTransactionDateTime(),
        ...(senderPANForRequest && { senderPrimaryAccountNumber: senderPANForRequest }),
        ...(encryptedData && { encryptedData: encryptedData.encryptedData }),
        retrievalReferenceNumber,
        systemsTraceAuditNumber,
        senderCurrencyCode: currency,

        // Optional fields
        ...(merchantCategoryCode && { merchantCategoryCode: parseInt(merchantCategoryCode) }),

        // Sender information
        ...(sender.name && { senderName: sender.name }),
        ...(sender.address && { senderAddress: sender.address }),
        ...(sender.city && { senderCity: sender.city }),
        ...(sender.stateCode && { senderStateCode: sender.stateCode }),
        ...(sender.countryCode && { senderCountryCode: sender.countryCode })
      };

      logger.info('Initiating Pull Funds Transaction (AFT)', {
        amount,
        currency,
        systemsTraceAuditNumber,
        retrievalReferenceNumber
      });

      const response = await this.makeRequest(
        'POST',
        '/visadirect/fundstransfer/v1/pullfundstransactions',
        payload
      );

      // Handle async processing (202 Accepted)
      if (response.statusCode === 202) {
        logger.info('Transaction accepted for async processing', {
          statusIdentifier: response.data.statusIdentifier
        });
        return {
          success: true,
          status: 'pending',
          statusIdentifier: response.data.statusIdentifier,
          message: 'Transaction is being processed. Use getTransactionStatus() to check status.',
          data: response.data
        };
      }

      // Handle immediate success (200 OK)
      logger.info('Pull Funds Transaction successful', {
        transactionIdentifier: response.data.transactionIdentifier,
        approvalCode: response.data.approvalCode,
        responseCode: response.data.responseCode,
        networkId: response.data.networkId
      });

      return {
        success: true,
        status: 'completed',
        transactionIdentifier: response.data.transactionIdentifier,
        approvalCode: response.data.approvalCode,
        responseCode: response.data.responseCode,
        actionCode: response.data.actionCode,
        networkId: response.data.networkId, // Save for potential reversal
        transmissionDateTime: response.data.transmissionDateTime,
        data: response.data
      };

    } catch (error) {
      logger.error('Pull Funds Transaction failed', {
        error: error.message,
        stack: error.stack
      });
      throw this.handleError(error);
    }
  }

  /**
   * Reverse Funds Transaction (AFTR - Account Funding Transaction Reversal)
   * Reverse a previous pull funds transaction (AFT)
   *
   * Security:
   * - If MLE is configured, sender PAN will be encrypted using Visa Direct MLE config
   * - Encrypted data replaces plain PAN in the request
   * - Falls back to plain text if encryption fails (with warning logged)
   *
   * @param {object} params - Reversal parameters
   * @param {object} params.originalTransaction - Original AFT transaction data
   * @param {number} params.originalTransaction.amount - Amount from original AFT
   * @param {string} params.originalTransaction.senderPAN - Sender PAN from original AFT - will be encrypted if MLE enabled
   * @param {number} params.originalTransaction.systemsTraceAuditNumber - STAN from original AFT
   * @param {string} params.originalTransaction.retrievalReferenceNumber - RRN from original AFT
   * @param {string} params.originalTransaction.transmissionDateTime - From original AFT response
   * @param {string} params.originalTransaction.approvalCode - From original AFT response (if present)
   * @param {number} params.originalTransaction.transactionIdentifier - From original AFT response
   * @param {string} params.businessApplicationId - Must match original AFT
   * @param {string} params.currency - Must match original AFT
   * @returns {Promise<object>} Reversal response
   */
  async reverseTransaction(params) {
    try {
      const {
        originalTransaction,
        businessApplicationId,
        currency = 'USD',
        merchantCategoryCode,
        cardAcceptor
      } = params;

      // Validate required original transaction data
      if (!originalTransaction) {
        throw new Error('originalTransaction data is required for reversal');
      }

      const {
        amount,
        senderPAN,
        systemsTraceAuditNumber: originalSTAN,
        retrievalReferenceNumber: originalRRN,
        transmissionDateTime,
        approvalCode,
        transactionIdentifier
      } = originalTransaction;

      if (!amount || !senderPAN || !originalSTAN || !originalRRN || !transmissionDateTime || !transactionIdentifier) {
        throw new Error('Missing required original transaction fields for reversal');
      }

      // Encrypt sensitive card data if MLE is enabled
      let senderPANForRequest = senderPAN;
      let encryptedData = null;

      if (this.useMLE) {
        logger.info('[VisaDirect] Encrypting sender card data for reversal with MLE', {
          originalSTAN,
          originalRRN,
          configType: 'visaDirect'
        });

        try {
          encryptedData = mle.encrypt(
            {
              senderPrimaryAccountNumber: senderPAN
            },
            'visaDirect'
          );

          logger.info('[VisaDirect] Card data encrypted successfully for reversal', {
            encryptedDataSize: encryptedData.encryptedData?.length || 0,
            keyId: encryptedData.encryptionKeyId,
            originalSTAN
          });

          // Use encrypted data field instead of plain PAN
          senderPANForRequest = null;
        } catch (encryptError) {
          logger.error('[VisaDirect] MLE encryption failed for reversal, falling back to plain text', {
            error: encryptError.message,
            originalSTAN
          });
          // Fall back to plain PAN if encryption fails
        }
      } else {
        logger.warn('[VisaDirect] Sending sender PAN in plain text for reversal - MLE not configured', {
          originalSTAN
        });
      }

      // Build payload according to Visa Direct API specification
      const payload = {
        // Required fields for AFTR
        acquirerCountryCode: this.acquirerCountryCode,
        acquiringBin: this.acquiringBin,
        amount: parseFloat(amount), // Must match original AFT
        businessApplicationId: businessApplicationId || 'AA', // Must match original AFT
        cardAcceptor: cardAcceptor || this.defaultCardAcceptor,
        localTransactionDateTime: this.getLocalTransactionDateTime(),
        merchantCategoryCode: merchantCategoryCode ? parseInt(merchantCategoryCode) : 6012,

        // Original data elements - CRITICAL for reversal
        originalDataElements: {
          acquiringBin: this.acquiringBin,
          systemsTraceAuditNumber: originalSTAN,
          transmissionDateTime,
          ...(approvalCode && { approvalCode })
        },

        retrievalReferenceNumber: originalRRN, // Must match original AFT
        senderCurrencyCode: currency,
        ...(senderPANForRequest && { senderPrimaryAccountNumber: senderPANForRequest }),
        ...(encryptedData && { encryptedData: encryptedData.encryptedData }),
        systemsTraceAuditNumber: originalSTAN, // Must match original AFT
        transactionIdentifier
      };

      logger.info('Initiating Reverse Funds Transaction (AFTR)', {
        originalSTAN,
        originalRRN,
        transactionIdentifier,
        amount
      });

      const response = await this.makeRequest(
        'POST',
        '/visadirect/fundstransfer/v1/reversefundstransactions',
        payload
      );

      // Handle async processing (202 Accepted)
      if (response.statusCode === 202) {
        logger.info('Reversal accepted for async processing', {
          statusIdentifier: response.data.statusIdentifier
        });
        return {
          success: true,
          status: 'pending',
          statusIdentifier: response.data.statusIdentifier,
          message: 'Reversal is being processed. Use getTransactionStatus() to check status.',
          data: response.data
        };
      }

      // Handle immediate success (200 OK)
      logger.info('Reverse Funds Transaction successful', {
        approvalCode: response.data.aftrResponseDetail?.approvalCode,
        responseCode: response.data.aftrResponseDetail?.responseCode
      });

      return {
        success: true,
        status: 'completed',
        approvalCode: response.data.aftrResponseDetail?.approvalCode,
        responseCode: response.data.aftrResponseDetail?.responseCode,
        actionCode: response.data.aftrResponseDetail?.actionCode,
        statusIdentifier: response.data.aftrResponseDetail?.statusIdentifier,
        data: response.data
      };

    } catch (error) {
      logger.error('Reverse Funds Transaction failed', {
        error: error.message,
        stack: error.stack
      });
      throw this.handleError(error);
    }
  }

  /**
   * Query Transaction Status
   * Get status and details for async transactions (when initial response was 202)
   *
   * @param {number} statusIdentifier - Status identifier from 202 response
   * @param {string} transactionType - Type of transaction: 'push', 'pull', or 'reverse'
   * @returns {Promise<object>} Transaction status and details
   */
  async getTransactionStatus(statusIdentifier, transactionType = 'push') {
    try {
      if (!statusIdentifier) {
        throw new Error('statusIdentifier is required');
      }

      // Map transaction type to endpoint
      const endpointMap = {
        'push': '/visadirect/fundstransfer/v1/pushfundstransactions',
        'pull': '/visadirect/fundstransfer/v1/pullfundstransactions',
        'reverse': '/visadirect/fundstransfer/v1/reversefundstransactions'
      };

      const endpoint = endpointMap[transactionType];
      if (!endpoint) {
        throw new Error('Invalid transactionType. Must be: push, pull, or reverse');
      }

      logger.info('Querying transaction status', {
        statusIdentifier,
        transactionType
      });

      const response = await this.makeRequest(
        'GET',
        `${endpoint}/${statusIdentifier}`
      );

      logger.info('Transaction status retrieved', {
        statusIdentifier,
        responseCode: response.data.responseCode || response.data.aftrResponseDetail?.responseCode
      });

      return {
        success: true,
        statusIdentifier,
        transactionType,
        data: response.data
      };

    } catch (error) {
      logger.error('Get transaction status failed', {
        statusIdentifier,
        error: error.message
      });
      throw this.handleError(error);
    }
  }

  /**
   * Handle and format errors from Visa API
   * @param {Error} error - Error object
   * @returns {Error} Formatted error
   */
  handleError(error) {
    const formattedError = new Error();

    // Try to parse error response
    try {
      const errorData = JSON.parse(error.message.split(' - ')[1] || '{}');
      formattedError.name = 'VisaDirectError';
      formattedError.message = errorData.message || error.message;
      formattedError.code = errorData.errorCode || errorData.responseStatus || 'UNKNOWN_ERROR';
      formattedError.details = errorData;
    } catch (parseError) {
      formattedError.name = 'VisaDirectError';
      formattedError.message = error.message;
      formattedError.code = 'UNKNOWN_ERROR';
    }

    return formattedError;
  }
}

module.exports = new VisaDirectService();
