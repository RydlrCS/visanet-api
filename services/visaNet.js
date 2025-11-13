const https = require('https');
const config = require('../config/visa');
const logger = require('../utils/logger');
const mle = require('../utils/mle');

/**
 * VisaNet Connect Service - Payment Authorization and Processing
 * Based on official VisaNet Connect - Acceptance API OpenAPI 3.0.1 specification
 *
 * Supported Operations:
 * - Payment Authorizations (Real-time authorization requests)
 * - Authorization Voids (Cancel/void authorized transactions)
 * - Settlement Position Inquiry (Check settlement status)
 *
 * @see config/api_reference (2).json for complete API specification
 */
class VisaNetService {
  constructor() {
    this.baseURL = process.env.VISA_API_URL || 'https://sandbox.api.visa.com';
    this.agent = config.createHttpsAgent();

    // Use VisaNet Connect credentials
    this.clientId = process.env.VISANET_USER_ID || process.env.VISA_CLIENT_ID || '1VISAGCT000001';

    // Default acceptor information
    this.defaultAcceptor = {
      paymentFacilityId: process.env.VISANET_PAYMENT_FACILITY_ID || '52014057',
      acceptorId: process.env.VISANET_ACCEPTOR_ID || '520142254322',
      customerService: process.env.VISANET_CUSTOMER_SERVICE || '1 4155552235',
      address: {
        postalCode: process.env.VISANET_ACCEPTOR_ZIP || '94404',
        country: process.env.VISANET_ACCEPTOR_COUNTRY_ALPHA2 || 'US',
        countrySubdivisionMajor: process.env.VISANET_ACCEPTOR_STATE_CODE || '06', // California
        countrySubdivisionMinor: process.env.VISANET_ACCEPTOR_COUNTY_CODE || '081'
      }
    };

    // Default terminal information
    this.defaultTerminal = {
      terminalId: process.env.VISANET_TERMINAL_ID || '10012343'
    };
  }

  /**
   * Create authentication headers for Visa API
   */
  createHeaders() {
    // Basic authentication for VisaNet Connect
    const authString = Buffer.from(
      `${process.env.VISANET_USER_ID}:${process.env.VISANET_PASSWORD}`
    ).toString('base64');

    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${authString}`
    };
  }

  /**
   * Generate correlation ID for request tracking
   * Format: Alphanumeric string, max 23 characters
   */
  generateCorrelationId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}${random}`.substring(0, 23);
  }

  /**
   * Get current local date/time in ISO format
   * @returns {string} YYYY-MM-DDTHH:mm:ss
   */
  getLocalDateTime() {
    return new Date().toISOString().split('.')[0];
  }

  /**
   * Make HTTP request to VisaNet API
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
        headers: this.createHeaders(),
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
   * Create Payment Authorization
   * Request authorization for a payment transaction
   *
   * @param {object} params - Authorization parameters
   * @param {string} params.cardNumber - Primary account number (PAN)
   * @param {string} params.expiryDate - Card expiry (YYMM format)
   * @param {string} params.cvv - Card verification value
   * @param {number} params.amount - Transaction amount
   * @param {string} params.currency - Currency code (e.g., '840' for USD)
   * @param {string} params.merchantCategoryCode - MCC (e.g., '4814' for telecom)
   * @param {object} params.cardHolder - Cardholder information
   * @param {object} params.acceptor - Acceptor/merchant info (optional, uses defaults)
   * @param {object} params.terminal - Terminal info (optional, uses defaults)
   * @param {boolean} params.isEcommerce - Is this an e-commerce transaction
   * @returns {Promise<object>} Authorization response
   */
  async authorize(params) {
    try {
      const {
        cardNumber,
        expiryDate,
        cvv,
        amount,
        currency = '840', // USD
        merchantCategoryCode = '6012', // Financial institutions
        cardHolder = {},
        acceptor,
        terminal,
        isEcommerce = false,
        transactionDescription,
        additionalData
      } = params;

      // Validate required fields
      if (!cardNumber || !expiryDate || !amount) {
        throw new Error('Missing required fields: cardNumber, expiryDate, and amount are required');
      }

      const correlationId = this.generateCorrelationId();

      // Prepare sensitive card data for encryption if MLE is configured
      let cardData = {
        PAN: cardNumber,
        CardSeqNb: '01',
        XpryDt: expiryDate
      };

      let cardDataForRequest;
      if (mle.isConfigured) {
        // Encrypt sensitive card data using MLE
        logger.info('Encrypting card data with MLE', { correlationId });
        const encryptedData = mle.encrypt({
          pan: cardNumber,
          cvv: cvv,
          expiryDate: expiryDate
        });

        // Use encrypted data in request
        cardDataForRequest = {
          PrtctdCardData: {
            CardSeqNb: '01',
            XpryDt: expiryDate,
            EncryptedData: encryptedData.encryptedData,
            EncryptionKeyId: encryptedData.encryptionKeyId,
            EncryptionType: encryptedData.encryptionType
          }
        };
        logger.info('Card data encrypted successfully', {
          correlationId,
          keyId: encryptedData.encryptionKeyId
        });
      } else {
        // Use plain card data (not recommended for production)
        logger.warn('MLE not configured - sending card data in plain text', { correlationId });
        cardDataForRequest = {
          PrtctdCardData: {
            CardSeqNb: '01',
            XpryDt: expiryDate
          },
          PlainCardData: cardData,
          ...(cvv && {
            CardCtryCd: this.defaultAcceptor.address.country,
            CardData: {
              Cvc: cvv
            }
          })
        };
      }

      // Build authorization request payload
      const payload = {
        msgIdentfctn: {
          clientId: this.clientId,
          correlatnId: correlationId
        },
        Body: {
          Tx: {
            TxAttr: ['INST'], // Instant transaction
            ...(transactionDescription && { TxDesc: transactionDescription }),
            TxId: {
              LclDtTm: this.getLocalDateTime()
            },
            ...(additionalData && {
              AddtlData: {
                Val: additionalData,
                Tp: 'FreeFormDescData'
              }
            }),
            TxAmts: {
              AmtQlfr: 'ESTM', // Estimated amount
              TxAmt: {
                Ccy: currency,
                Amt: amount.toString()
              }
            }
          },
          Envt: {
            Accptr: acceptor || {
              PaymentFacltId: this.defaultAcceptor.paymentFacilityId,
              Accptr: this.defaultAcceptor.acceptorId,
              CstmrSvc: this.defaultAcceptor.customerService,
              Adr: {
                PstlCd: this.defaultAcceptor.address.postalCode,
                CtrySubDvsnMjr: this.defaultAcceptor.address.countrySubdivisionMajor,
                Ctry: this.defaultAcceptor.address.country,
                CtrySubDvsnMnr: this.defaultAcceptor.address.countrySubdivisionMinor
              }
            },
            Termnl: terminal || {
              TermnlId: {
                Id: this.defaultTerminal.terminalId
              }
            },
            Card: cardDataForRequest,
            ...(cardHolder.name && {
              Crdhldr: {
                Nm: cardHolder.name
              }
            })
          },
          Cntxt: {
            TxCntxt: {
              MrchntCtgyCd: merchantCategoryCode
            },
            PtOfSvcCntxt: {
              CardDataNtryMd: isEcommerce ? 'KEYD' : 'CICC', // KEYD = Keyed, CICC = ICC (chip)
              ...(isEcommerce && {
                EComrcData: [
                  {
                    Val: '3', // E-commerce indicator
                    Tp: 'ECI'
                  }
                ]
              })
            }
          }
        }
      };

      logger.info('Initiating payment authorization', {
        correlationId,
        amount,
        currency,
        merchantCategoryCode,
        isEcommerce
      });

      const response = await this.makeRequest(
        'POST',
        '/acs/v3/payments/authorizations',
        payload
      );

      // Parse response
      const responseBody = response.data.Body || {};
      const processingResult = responseBody.PrcgRslt?.RsltData || {};
      const approvalData = responseBody.PrcgRslt?.ApprvlData || {};

      logger.info('Authorization response received', {
        correlationId,
        requestId: response.data.msgIdentfctn?.reqstId,
        result: processingResult.Rslt,
        resultDetails: processingResult.RsltDtls,
        approvalCode: approvalData.ApprvlCd
      });

      return {
        success: processingResult.Rslt === 'Approved',
        correlationId,
        requestId: response.data.msgIdentfctn?.reqstId,
        authorizationId: response.data.msgIdentfctn?.id,
        result: processingResult.Rslt,
        resultCode: processingResult.RsltDtls,
        approvalCode: approvalData.ApprvlCd,
        cardInfo: responseBody.Envt?.Card,
        transactionAmounts: responseBody.Tx?.TxAmts,
        rawResponse: response.data
      };

    } catch (error) {
      logger.error('Authorization failed', {
        error: error.message,
        stack: error.stack
      });
      throw this.handleError(error);
    }
  }

  /**
   * Void Authorization (with resource ID)
   * Cancel/void a previously authorized transaction
   *
   * @param {object} params - Void parameters
   * @param {string} params.authorizationId - Original authorization ID
   * @param {number} params.amount - Amount to void (should match original)
   * @param {string} params.reason - Reason code for void (e.g., '2501')
   * @param {string} params.merchantCategoryCode - MCC code
   * @param {object} params.acceptor - Acceptor info (optional)
   * @param {object} params.terminal - Terminal info (optional)
   * @returns {Promise<object>} Void response
   */
  async voidAuthorization(params) {
    try {
      const {
        authorizationId,
        amount,
        reason = '2501', // Default void reason
        merchantCategoryCode = '6012',
        acceptor,
        terminal,
        additionalData
      } = params;

      // Validate required fields
      if (!authorizationId || !amount) {
        throw new Error('Missing required fields: authorizationId and amount are required');
      }

      const correlationId = this.generateCorrelationId();

      // Build void request payload
      const payload = {
        msgIdentfctn: {
          clientId: this.clientId,
          correlatnId: correlationId
        },
        Body: {
          Tx: {
            TxAttr: ['INST'],
            ...(additionalData && {
              AddtlData: {
                Val: additionalData,
                Tp: 'FreeFormDescData'
              }
            }),
            AltrnMsgRsn: reason,
            TxAmts: {
              TxAmt: {
                Amt: amount.toString()
              }
            }
          },
          Envt: {
            Accptr: acceptor || {
              PaymentFacltId: this.defaultAcceptor.paymentFacilityId,
              Accptr: this.defaultAcceptor.acceptorId,
              CstmrSvc: this.defaultAcceptor.customerService,
              Adr: {
                PstlCd: this.defaultAcceptor.address.postalCode,
                CtrySubDvsnMjr: this.defaultAcceptor.address.countrySubdivisionMajor,
                Ctry: this.defaultAcceptor.address.country,
                CtrySubDvsnMnr: this.defaultAcceptor.address.countrySubdivisionMinor
              }
            },
            Termnl: terminal || {
              TermnlId: {
                Id: this.defaultTerminal.terminalId
              }
            }
          },
          Cntxt: {
            TxCntxt: {
              MrchntCtgyCd: merchantCategoryCode
            },
            PtOfSvcCntxt: {
              CardDataNtryMd: 'CDFL' // Card data not available
            }
          }
        }
      };

      logger.info('Initiating authorization void', {
        correlationId,
        authorizationId,
        amount,
        reason
      });

      const response = await this.makeRequest(
        'POST',
        `/acs/v3/payments/authorizations/${authorizationId}/voids`,
        payload
      );

      // Parse response
      const responseBody = response.data.Body || {};
      const processingResult = responseBody.PrcgRslt?.RsltData || {};

      logger.info('Void response received', {
        correlationId,
        requestId: response.data.msgIdentfctn?.reqstId,
        result: processingResult.Rslt,
        resultDetails: processingResult.RsltDtls
      });

      return {
        success: processingResult.Rslt === 'Processed',
        correlationId,
        requestId: response.data.msgIdentfctn?.reqstId,
        voidId: response.data.msgIdentfctn?.id,
        result: processingResult.Rslt,
        resultCode: processingResult.RsltDtls,
        rawResponse: response.data
      };

    } catch (error) {
      logger.error('Void authorization failed', {
        error: error.message,
        stack: error.stack
      });
      throw this.handleError(error);
    }
  }

  /**
   * Void Authorization (without resource ID)
   * Cancel/void an authorization using transaction details instead of ID
   *
   * @param {object} params - Void parameters
   * @param {number} params.amount - Amount to void
   * @param {string} params.reason - Reason code for void
   * @param {string} params.merchantCategoryCode - MCC code
   * @param {object} params.acceptor - Acceptor info (optional)
   * @param {object} params.terminal - Terminal info (optional)
   * @returns {Promise<object>} Void response
   */
  async voidAuthorizationWithoutId(params) {
    try {
      const {
        amount,
        reason = '2501',
        merchantCategoryCode = '6012',
        acceptor,
        terminal,
        additionalData
      } = params;

      // Validate required fields
      if (!amount) {
        throw new Error('Missing required field: amount is required');
      }

      const correlationId = this.generateCorrelationId();

      // Build void request payload (same structure as voidAuthorization)
      const payload = {
        msgIdentfctn: {
          clientId: this.clientId,
          correlatnId: correlationId
        },
        Body: {
          Tx: {
            TxAttr: ['INST'],
            ...(additionalData && {
              AddtlData: {
                Val: additionalData,
                Tp: 'FreeFormDescData'
              }
            }),
            AltrnMsgRsn: reason,
            TxAmts: {
              TxAmt: {
                Amt: amount.toString()
              }
            }
          },
          Envt: {
            Accptr: acceptor || {
              PaymentFacltId: this.defaultAcceptor.paymentFacilityId,
              Accptr: this.defaultAcceptor.acceptorId,
              CstmrSvc: this.defaultAcceptor.customerService,
              Adr: {
                PstlCd: this.defaultAcceptor.address.postalCode,
                CtrySubDvsnMjr: this.defaultAcceptor.address.countrySubdivisionMajor,
                Ctry: this.defaultAcceptor.address.country,
                CtrySubDvsnMnr: this.defaultAcceptor.address.countrySubdivisionMinor
              }
            },
            Termnl: terminal || {
              TermnlId: {
                Id: this.defaultTerminal.terminalId
              }
            }
          },
          Cntxt: {
            TxCntxt: {
              MrchntCtgyCd: merchantCategoryCode
            },
            PtOfSvcCntxt: {
              CardDataNtryMd: 'CDFL'
            }
          }
        }
      };

      logger.info('Initiating authorization void without ID', {
        correlationId,
        amount,
        reason
      });

      const response = await this.makeRequest(
        'POST',
        '/acs/v3/payments/authorizations/voids',
        payload
      );

      // Parse response
      const responseBody = response.data.Body || {};
      const processingResult = responseBody.PrcgRslt?.RsltData || {};

      logger.info('Void response received', {
        correlationId,
        requestId: response.data.msgIdentfctn?.reqstId,
        result: processingResult.Rslt,
        resultDetails: processingResult.RsltDtls
      });

      return {
        success: processingResult.Rslt === 'Processed',
        correlationId,
        requestId: response.data.msgIdentfctn?.reqstId,
        voidId: response.data.msgIdentfctn?.id,
        result: processingResult.Rslt,
        resultCode: processingResult.RsltDtls,
        rawResponse: response.data
      };

    } catch (error) {
      logger.error('Void authorization without ID failed', {
        error: error.message,
        stack: error.stack
      });
      throw this.handleError(error);
    }
  }

  /**
   * Handle and format errors from VisaNet API
   * @param {Error} error - Error object
   * @returns {Error} Formatted error
   */
  handleError(error) {
    const formattedError = new Error();

    // Try to parse error response
    try {
      const errorData = JSON.parse(error.message.split(' - ')[1] || '{}');
      formattedError.name = 'VisaNetError';
      formattedError.message = errorData.message || error.message;
      formattedError.code = errorData.errorCode || errorData.responseStatus || 'UNKNOWN_ERROR';
      formattedError.details = errorData;
    } catch (parseError) {
      formattedError.name = 'VisaNetError';
      formattedError.message = error.message;
      formattedError.code = 'UNKNOWN_ERROR';
    }

    return formattedError;
  }
}

module.exports = new VisaNetService();
