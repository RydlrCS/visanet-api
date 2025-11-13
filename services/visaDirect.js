const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const visaConfig = require('../config/visa');
const logger = require('../utils/logger');

class VisaDirectService {
  constructor() {
    this.baseURL = visaConfig.baseURL;
    this.httpsAgent = visaConfig.getHttpsAgent();
    this.headers = visaConfig.getHeaders();
  }

  /**
   * Push Payment - Send money to a card (AFT - Account Funding Transaction)
   */
  async pushPayment(paymentData) {
    try {
      const {
        amount,
        currency = 'USD',
        recipientPAN,
        recipientName,
        senderPAN,
        senderName,
        senderAddress,
        transactionId
      } = paymentData;

      const payload = {
        systemsTraceAuditNumber: this.generateSTAN(),
        retrievalReferenceNumber: transactionId || this.generateRRN(),
        localTransactionDateTime: this.getLocalDateTime(),
        acquiringBin: process.env.VISA_ACQUIRING_BIN || '408999',
        acquirerCountryCode: '840', // USA
        senderPrimaryAccountNumber: senderPAN,
        senderName: senderName,
        senderAddress: senderAddress,
        senderCountryCode: '840',
        transactionCurrencyCode: this.getCurrencyCode(currency),
        amount: amount.toString(),
        businessApplicationId: 'AA', // Account-to-Account
        recipientPrimaryAccountNumber: recipientPAN,
        recipientName: recipientName,
        merchantCategoryCode: '6012', // Financial Institutions
        cardAcceptor: {
          idCode: process.env.VISA_MERCHANT_ID || 'LOCAPAY001',
          name: 'LocaPay Rydlr',
          terminalId: '001',
          address: {
            state: 'CA',
            county: '840',
            country: 'USA',
            zipCode: '94404'
          }
        }
      };

      logger.info('Initiating Push Payment:', { transactionId, amount, currency });

      const response = await axios.post(
        `${this.baseURL}/visadirect/fundstransfer/v1/pushfundstransactions`,
        payload,
        {
          headers: this.headers,
          httpsAgent: this.httpsAgent,
          timeout: 30000
        }
      );

      logger.info('Push Payment Success:', response.data);
      return {
        success: true,
        data: response.data,
        transactionId: response.data.transactionIdentifier
      };

    } catch (error) {
      logger.error('Push Payment Failed:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Pull Funds - Request money from a card (OCT - Original Credit Transaction)
   */
  async pullFunds(pullData) {
    try {
      const {
        amount,
        currency = 'USD',
        senderPAN,
        senderName,
        recipientPAN,
        transactionId
      } = pullData;

      const payload = {
        systemsTraceAuditNumber: this.generateSTAN(),
        retrievalReferenceNumber: transactionId || this.generateRRN(),
        localTransactionDateTime: this.getLocalDateTime(),
        acquiringBin: process.env.VISA_ACQUIRING_BIN || '408999',
        acquirerCountryCode: '840',
        senderPrimaryAccountNumber: senderPAN,
        senderName: senderName,
        transactionCurrencyCode: this.getCurrencyCode(currency),
        amount: amount.toString(),
        businessApplicationId: 'PP', // Person-to-Person
        recipientPrimaryAccountNumber: recipientPAN,
        merchantCategoryCode: '6012',
        cardAcceptor: {
          idCode: process.env.VISA_MERCHANT_ID || 'LOCAPAY001',
          name: 'LocaPay Rydlr',
          terminalId: '001',
          address: {
            state: 'CA',
            county: '840',
            country: 'USA',
            zipCode: '94404'
          }
        }
      };

      logger.info('Initiating Pull Funds:', { transactionId, amount, currency });

      const response = await axios.post(
        `${this.baseURL}/visadirect/fundstransfer/v1/pullfundstransactions`,
        payload,
        {
          headers: this.headers,
          httpsAgent: this.httpsAgent,
          timeout: 30000
        }
      );

      logger.info('Pull Funds Success:', response.data);
      return {
        success: true,
        data: response.data,
        transactionId: response.data.transactionIdentifier
      };

    } catch (error) {
      logger.error('Pull Funds Failed:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Reverse Transaction
   */
  async reverseTransaction(reversalData) {
    try {
      const {
        originalTransactionId,
        amount,
        currency = 'USD',
        reason
      } = reversalData;

      const payload = {
        systemsTraceAuditNumber: this.generateSTAN(),
        retrievalReferenceNumber: this.generateRRN(),
        localTransactionDateTime: this.getLocalDateTime(),
        acquiringBin: process.env.VISA_ACQUIRING_BIN || '408999',
        acquirerCountryCode: '840',
        originalDataElements: {
          systemsTraceAuditNumber: originalTransactionId,
          retrievalReferenceNumber: originalTransactionId,
          approvalCode: '123456'
        },
        amount: amount.toString(),
        transactionCurrencyCode: this.getCurrencyCode(currency),
        reasonCode: reason || '10' // Duplicate Transaction
      };

      logger.info('Initiating Reversal:', { originalTransactionId, amount });

      const response = await axios.post(
        `${this.baseURL}/visadirect/fundstransfer/v1/reversefundstransactions`,
        payload,
        {
          headers: this.headers,
          httpsAgent: this.httpsAgent,
          timeout: 30000
        }
      );

      logger.info('Reversal Success:', response.data);
      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      logger.error('Reversal Failed:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Get Transaction Status
   */
  async getTransactionStatus(transactionId) {
    try {
      logger.info('Checking Transaction Status:', transactionId);

      const response = await axios.get(
        `${this.baseURL}/visadirect/fundstransfer/v1/transactions/${transactionId}`,
        {
          headers: this.headers,
          httpsAgent: this.httpsAgent,
          timeout: 30000
        }
      );

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      logger.error('Get Transaction Status Failed:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  // Helper Methods
  generateSTAN() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  generateRRN() {
    const timestamp = Date.now().toString().slice(-12);
    return timestamp;
  }

  getLocalDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  getCurrencyCode(currency) {
    const codes = {
      'USD': '840',
      'EUR': '978',
      'GBP': '826',
      'JPY': '392',
      'CAD': '124'
    };
    return codes[currency] || '840';
  }

  handleError(error) {
    if (error.response) {
      return {
        success: false,
        error: {
          code: error.response.data?.errorCode || 'VISA_ERROR',
          message: error.response.data?.errorMessage || 'Visa API Error',
          details: error.response.data
        },
        status: error.response.status
      };
    }
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error.message
      }
    };
  }
}

module.exports = new VisaDirectService();
