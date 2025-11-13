/**
 * MLE (Message Level Encryption) Utility
 *
 * Provides encryption/decryption services for both Visa Direct and VisaNet Connect APIs
 *
 * - Encrypts sensitive payload data (PAN, CVV, PIN, etc.) before sending to Visa
 * - Decrypts encrypted responses from Visa
 * - Supports multiple MLE configurations (one per API)
 * - Uses RSA-OAEP with SHA-256 for encryption
 *
 * Security Layers:
 * 1. Mutual TLS: HTTPS connection authentication
 * 2. X-Pay-Token: Request signature and replay prevention
 * 3. MLE: End-to-end payload encryption (this module)
 *
 * @module utils/mle
 * @requires crypto
 * @requires fs
 * @requires path
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * MLE Configuration Types
 * @typedef {'visaDirect'|'visaNet'} MLEConfigType
 */

/**
 * MLE Encryption Class
 * Handles encryption/decryption for Visa APIs with proper logging and error handling
 */
class MLEEncryption {
  /**
   * Initialize MLE encryption utility
   * Loads configuration from environment variables
   *
   * @constructor
   */
  constructor() {
    logger.debug('Initializing MLE encryption utility');

    // VisaNet Connect MLE Configuration
    this.visaNet = {
      keyId: process.env.VISANET_MLE_KEY_ID,
      clientCertPath: process.env.VISANET_MLE_CLIENT_CERT,
      privateKeyPath: process.env.VISANET_MLE_PRIVATE_KEY,
      serverCertPath: process.env.VISANET_MLE_SERVER_CERT,
      isConfigured: false
    };

    // Visa Direct MLE Configuration
    this.visaDirect = {
      keyId: process.env.VISA_DIRECT_MLE_KEY_ID,
      clientCertPath: process.env.VISA_DIRECT_MLE_CLIENT_CERT,
      privateKeyPath: process.env.VISA_DIRECT_MLE_PRIVATE_KEY,
      serverCertPath: process.env.VISA_DIRECT_MLE_SERVER_CERT,
      isConfigured: false
    };

    // Check if configurations are complete
    this.visaNet.isConfigured = !!(
      this.visaNet.keyId &&
      this.visaNet.serverCertPath &&
      this.visaNet.privateKeyPath
    );

    this.visaDirect.isConfigured = !!(
      this.visaDirect.keyId &&
      this.visaDirect.serverCertPath &&
      this.visaDirect.privateKeyPath
    );

    // Log configuration status
    logger.info('MLE Configuration Status', {
      visaNet: this.visaNet.isConfigured ? 'Configured' : 'Not Configured',
      visaDirect: this.visaDirect.isConfigured ? 'Configured' : 'Not Configured',
      visaNetKeyId: this.visaNet.keyId || 'Not Set',
      visaDirectKeyId: this.visaDirect.keyId || 'Not Set'
    });

    // Backward compatibility: default to VisaNet if accessing properties directly
    this.keyId = this.visaNet.keyId;
    this.clientCertPath = this.visaNet.clientCertPath;
    this.privateKeyPath = this.visaNet.privateKeyPath;
    this.serverCertPath = this.visaNet.serverCertPath;
    this.isConfigured = this.visaNet.isConfigured;
  }

  /**
   * Get MLE configuration for specified API
   *
   * @param {MLEConfigType} configType - Type of configuration ('visaDirect' or 'visaNet')
   * @returns {object} MLE configuration object
   * @private
   */
  _getConfig(configType = 'visaNet') {
    const config = this[configType];

    if (!config) {
      logger.error(`Invalid MLE config type: ${configType}`);
      throw new Error(`Invalid MLE configuration type: ${configType}. Use 'visaDirect' or 'visaNet'`);
    }

    return config;
  }

  /**
   * Encrypt sensitive data using Visa's server certificate (public key)
   *
   * @param {object|string} data - Data to encrypt (will be JSON stringified if object)
   * @param {MLEConfigType} configType - Which API configuration to use
   * @returns {object} Encrypted data with key ID and encryption type
   * @throws {Error} If MLE not configured or encryption fails
   *
   * @example
   * const encrypted = mle.encrypt({ pan: '4111111111111111', cvv: '123' }, 'visaDirect');
   * // Returns: { encryptedData: '...', encryptionKeyId: '...', encryptionType: 'RSA-OAEP-SHA256' }
   */
  encrypt(data, configType = 'visaNet') {
    const startTime = Date.now();
    logger.debug(`MLE encryption started for ${configType}`, { dataType: typeof data });

    const config = this._getConfig(configType);

    // Validate configuration
    if (!config.isConfigured) {
      const errorMsg = `MLE not configured for ${configType}. Set ${configType.toUpperCase()}_MLE_* variables in .env`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    const serverCertFullPath = path.resolve(config.serverCertPath);
    if (!fs.existsSync(serverCertFullPath)) {
      const errorMsg = `MLE server certificate not found at: ${config.serverCertPath}`;
      logger.error(errorMsg, { configType, path: serverCertFullPath });
      throw new Error(errorMsg);
    }

    try {
      // Load Visa's server certificate (their public key)
      logger.debug(`Loading MLE server certificate from ${config.serverCertPath}`);
      const serverCert = fs.readFileSync(serverCertFullPath);

      // Convert data to string if it's an object
      const dataString = typeof data === 'object' ? JSON.stringify(data) : data;
      const dataLength = dataString.length;

      logger.debug('Encrypting data with Visa\'s public key', {
        configType,
        keyId: config.keyId,
        dataLength
      });

      // Encrypt with Visa's public key using RSA-OAEP-SHA256
      const encrypted = crypto.publicEncrypt(
        {
          key: serverCert,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        Buffer.from(dataString)
      );

      const encryptedBase64 = encrypted.toString('base64');
      const duration = Date.now() - startTime;

      logger.info('MLE encryption successful', {
        configType,
        keyId: config.keyId,
        originalLength: dataLength,
        encryptedLength: encryptedBase64.length,
        duration: `${duration}ms`
      });

      return {
        encryptedData: encryptedBase64,
        encryptionKeyId: config.keyId,
        encryptionType: 'RSA-OAEP-SHA256'
      };
    } catch (error) {
      logger.error(`MLE encryption failed for ${configType}`, {
        error: error.message,
        stack: error.stack,
        configType,
        keyId: config.keyId
      });
      throw new Error(`MLE encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data from Visa using your private key
   *
   * @param {string} encryptedData - Base64 encoded encrypted data
   * @param {MLEConfigType} configType - Which API configuration to use
   * @param {boolean} parseJSON - Whether to parse the decrypted data as JSON
   * @returns {object|string} Decrypted data
   * @throws {Error} If MLE not configured or decryption fails
   *
   * @example
   * const decrypted = mle.decrypt(encryptedString, 'visaDirect', true);
   */
  decrypt(encryptedData, configType = 'visaNet', parseJSON = true) {
    const startTime = Date.now();
    logger.debug(`MLE decryption started for ${configType}`, {
      encryptedLength: encryptedData?.length
    });

    const config = this._getConfig(configType);

    // Validate configuration
    if (!config.isConfigured) {
      const errorMsg = `MLE not configured for ${configType}`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    const privateKeyFullPath = path.resolve(config.privateKeyPath);
    if (!fs.existsSync(privateKeyFullPath)) {
      const errorMsg = `MLE private key not found at: ${config.privateKeyPath}`;
      logger.error(errorMsg, { configType, path: privateKeyFullPath });
      throw new Error(errorMsg);
    }

    try {
      // Load your private key
      logger.debug(`Loading MLE private key from ${config.privateKeyPath}`);
      const privateKey = fs.readFileSync(privateKeyFullPath);

      // Decrypt with your private key using RSA-OAEP-SHA256
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        Buffer.from(encryptedData, 'base64')
      );

      const decryptedString = decrypted.toString();
      const duration = Date.now() - startTime;

      logger.info('MLE decryption successful', {
        configType,
        keyId: config.keyId,
        decryptedLength: decryptedString.length,
        duration: `${duration}ms`
      });

      // Parse as JSON if requested
      if (parseJSON) {
        try {
          const parsed = JSON.parse(decryptedString);
          logger.debug('Decrypted data parsed as JSON', { configType });
          return parsed;
        } catch (e) {
          logger.warn('Failed to parse decrypted data as JSON, returning as string', {
            configType,
            error: e.message
          });
          return decryptedString;
        }
      }

      return decryptedString;
    } catch (error) {
      logger.error(`MLE decryption failed for ${configType}`, {
        error: error.message,
        stack: error.stack,
        configType,
        keyId: config.keyId
      });
      throw new Error(`MLE decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt sensitive fields in a transaction payload
   * Removes sensitive fields from payload and replaces with encrypted data
   *
   * @param {object} payload - Transaction payload
   * @param {string[]} sensitiveFields - Array of field names to encrypt
   * @param {MLEConfigType} configType - Which API configuration to use
   * @returns {object} Payload with encrypted fields removed and encrypted data added
   *
   * @example
   * const payload = { amount: 100, pan: '4111111111111111', cvv: '123' };
   * const encrypted = mle.encryptPayloadFields(payload, ['pan', 'cvv'], 'visaDirect');
   * // Returns: { amount: 100, encryptedData: '...', encryptionKeyId: '...', encryptionType: '...' }
   */
  encryptPayloadFields(payload, sensitiveFields = ['pan', 'cvv', 'pin', 'expiryDate'], configType = 'visaNet') {
    logger.debug(`Encrypting payload fields for ${configType}`, {
      fields: sensitiveFields,
      payloadKeys: Object.keys(payload)
    });

    const config = this._getConfig(configType);

    if (!config.isConfigured) {
      logger.warn(`MLE not configured for ${configType}, returning payload without encryption`, {
        configType
      });
      return payload; // Return unencrypted if MLE not configured
    }

    const encryptedPayload = { ...payload };
    const dataToEncrypt = {};
    let fieldsFound = 0;

    // Extract sensitive fields from payload
    sensitiveFields.forEach(field => {
      if (payload[field]) {
        dataToEncrypt[field] = payload[field];
        delete encryptedPayload[field];
        fieldsFound++;
        logger.debug(`Found sensitive field: ${field}`, { configType });
      }
    });

    // If we have sensitive data, encrypt it
    if (Object.keys(dataToEncrypt).length > 0) {
      logger.info(`Encrypting ${fieldsFound} sensitive fields`, {
        configType,
        fields: Object.keys(dataToEncrypt),
        keyId: config.keyId
      });

      const encrypted = this.encrypt(dataToEncrypt, configType);

      // Add encrypted data to payload
      encryptedPayload.encryptedData = encrypted.encryptedData;
      encryptedPayload.encryptionKeyId = encrypted.encryptionKeyId;
      encryptedPayload.encryptionType = encrypted.encryptionType;

      logger.info('Payload fields encrypted successfully', {
        configType,
        fieldsEncrypted: fieldsFound,
        keyId: config.keyId
      });
    } else {
      logger.debug('No sensitive fields found in payload', {
        configType,
        requestedFields: sensitiveFields,
        payloadKeys: Object.keys(payload)
      });
    }

    return encryptedPayload;
  }

  /**
   * Decrypt sensitive fields from Visa response
   * Extracts encrypted data and merges decrypted fields back into response
   *
   * @param {object} response - Response from Visa containing encrypted data
   * @param {MLEConfigType} configType - Which API configuration to use
   * @returns {object} Response with decrypted fields merged in
   *
   * @example
   * const response = { status: 'approved', encryptedData: '...' };
   * const decrypted = mle.decryptResponseFields(response, 'visaDirect');
   * // Returns: { status: 'approved', pan: '****1111', ... }
   */
  decryptResponseFields(response, configType = 'visaNet') {
    logger.debug(`Attempting to decrypt response fields for ${configType}`);

    const config = this._getConfig(configType);

    if (!config.isConfigured) {
      logger.warn(`MLE not configured for ${configType}, returning response as-is`);
      return response;
    }

    if (!response.encryptedData) {
      logger.debug(`No encrypted data in response for ${configType}`);
      return response; // Return as-is if no encrypted data
    }

    try {
      logger.info(`Decrypting response fields for ${configType}`, {
        keyId: config.keyId,
        encryptedDataLength: response.encryptedData.length
      });

      const decryptedData = this.decrypt(response.encryptedData, configType);

      // Merge decrypted fields back into response
      const decryptedResponse = { ...response };
      delete decryptedResponse.encryptedData;
      delete decryptedResponse.encryptionKeyId;
      delete decryptedResponse.encryptionType;

      const finalResponse = {
        ...decryptedResponse,
        ...decryptedData
      };

      logger.info('Response fields decrypted successfully', {
        configType,
        keyId: config.keyId,
        decryptedFields: Object.keys(decryptedData)
      });

      return finalResponse;
    } catch (error) {
      // If decryption fails, return original response
      logger.error(`Failed to decrypt response fields for ${configType}`, {
        error: error.message,
        keyId: config.keyId
      });
      return response;
    }
  }

  /**
   * Verify MLE configuration is valid
   * Checks if all required files and environment variables are properly configured
   *
   * @param {MLEConfigType} configType - Which API configuration to verify (defaults to both)
   * @returns {object} Configuration status with detailed error information
   *
   * @example
   * const status = mle.verifyConfiguration('visaDirect');
   * if (!status.configured) {
   *   console.log('Errors:', status.errors);
   * }
   */
  verifyConfiguration(configType = null) {
    logger.debug('Verifying MLE configuration', { configType });

    // If no specific config type, check both
    if (!configType) {
      return {
        visaNet: this.verifyConfiguration('visaNet'),
        visaDirect: this.verifyConfiguration('visaDirect')
      };
    }

    const config = this._getConfig(configType);
    const prefix = configType === 'visaNet' ? 'VISANET' : 'VISA_DIRECT';

    const status = {
      configType,
      configured: config.isConfigured,
      keyId: !!config.keyId,
      clientCert: false,
      serverCert: false,
      privateKey: false,
      errors: [],
      encryptionType: 'RSA-OAEP-SHA256'
    };

    // Verify Key ID
    if (!config.keyId) {
      status.errors.push(`${prefix}_MLE_KEY_ID not set in .env`);
    }

    // Verify Client Certificate
    if (config.clientCertPath) {
      const clientCertFullPath = path.resolve(config.clientCertPath);
      if (fs.existsSync(clientCertFullPath)) {
        status.clientCert = true;
        logger.debug(`Client certificate found for ${configType}`, { path: config.clientCertPath });
      } else {
        const error = `Client certificate not found: ${config.clientCertPath}`;
        status.errors.push(error);
        logger.warn(error, { configType });
      }
    } else {
      status.errors.push(`${prefix}_MLE_CLIENT_CERT not set in .env`);
    }

    // Verify Server Certificate
    if (config.serverCertPath) {
      const serverCertFullPath = path.resolve(config.serverCertPath);
      if (fs.existsSync(serverCertFullPath)) {
        status.serverCert = true;
        logger.debug(`Server certificate found for ${configType}`, { path: config.serverCertPath });
      } else {
        const error = `Server certificate not found: ${config.serverCertPath}`;
        status.errors.push(error);
        logger.warn(error, { configType });
      }
    } else {
      status.errors.push(`${prefix}_MLE_SERVER_CERT not set in .env`);
    }

    // Verify Private Key
    if (config.privateKeyPath) {
      const privateKeyFullPath = path.resolve(config.privateKeyPath);
      if (fs.existsSync(privateKeyFullPath)) {
        status.privateKey = true;
        logger.debug(`Private key found for ${configType}`, { path: config.privateKeyPath });

        // Check file permissions (should be 600 for security)
        try {
          const stats = fs.statSync(privateKeyFullPath);
          const mode = stats.mode & parseInt('777', 8);
          if (mode !== parseInt('600', 8)) {
            const warning = `Insecure permissions on private key (${mode.toString(8)}). Should be 600`;
            status.errors.push(warning);
            logger.warn(warning, { configType, path: config.privateKeyPath });
          }
        } catch (err) {
          logger.error('Failed to check private key permissions', {
            configType,
            error: err.message
          });
        }
      } else {
        const error = `Private key not found: ${config.privateKeyPath}`;
        status.errors.push(error);
        logger.warn(error, { configType });
      }
    } else {
      status.errors.push(`${prefix}_MLE_PRIVATE_KEY not set in .env`);
    }

    // Log verification results
    if (status.configured) {
      logger.info(`MLE configuration verified for ${configType}`, {
        configType,
        keyId: config.keyId,
        allFilesPresent: status.clientCert && status.serverCert && status.privateKey
      });
    } else {
      logger.warn(`MLE configuration incomplete for ${configType}`, {
        configType,
        errorCount: status.errors.length,
        errors: status.errors
      });
    }

    return status;
  }
}

// Export singleton instance
logger.debug('Creating MLE encryption singleton instance');
const mleInstance = new MLEEncryption();
logger.info('MLE encryption utility initialized');

module.exports = mleInstance;
