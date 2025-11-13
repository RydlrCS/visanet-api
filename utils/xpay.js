/**
 * X-Pay-Token Generator for Visa API
 *
 * The x-pay-token is a dynamic HMAC signature that must be generated for each API request.
 * It uses a shared secret provided by Visa after you submit your public key.
 *
 * Steps to set up:
 * 1. Submit public key to Visa Developer Portal (MLE Configuration)
 * 2. Download encrypted shared secret from portal
 * 3. Decrypt shared secret using your private key
 * 4. Store shared secret in .env as VISA_SHARED_SECRET
 * 5. Use this utility to generate x-pay-token for each request
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class XPayTokenGenerator {
  constructor() {
    this.sharedSecret = process.env.VISA_SHARED_SECRET;
    this.privateKeyPath = process.env.VISA_MLE_PRIVATE_KEY_PATH || './certs/privateKey-c70ff121-977b-4872-9b69-550b1c281755.pem';
  }

  /**
   * Decrypt the shared secret from Visa using your private key
   * @param {string} encryptedSecretPath - Path to the encrypted shared secret file from Visa
   * @returns {string} Decrypted shared secret (base64)
   */
  decryptSharedSecret(encryptedSecretPath) {
    try {
      const privateKey = fs.readFileSync(path.resolve(this.privateKeyPath));
      const encryptedSecret = fs.readFileSync(encryptedSecretPath);

      const decrypted = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        encryptedSecret
      );

      return decrypted.toString('base64');
    } catch (error) {
      throw new Error(`Failed to decrypt shared secret: ${error.message}`);
    }
  }

  /**
   * Generate x-pay-token for a Visa API request
   *
   * The x-pay-token is an HMAC-SHA256 signature of:
   * timestamp + resourcePath + queryString + requestBody
   *
   * @param {string} resourcePath - API endpoint path (e.g., '/visadirect/fundstransfer/v1/pushfundstransactions')
   * @param {string} queryString - URL query parameters (e.g., 'apikey=xxx')
   * @param {object|string} requestBody - Request payload (will be stringified if object)
   * @returns {object} Object containing xPayToken and timestamp
   */
  generateXPayToken(resourcePath, queryString = '', requestBody = '') {
    if (!this.sharedSecret) {
      throw new Error('VISA_SHARED_SECRET not found in environment variables. Please decrypt and set it first.');
    }

    // Generate timestamp (seconds since epoch)
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Prepare request body string
    const bodyString = typeof requestBody === 'object'
      ? JSON.stringify(requestBody)
      : requestBody;

    // Build the pre-hash string: timestamp + resourcePath + queryString + requestBody
    const preHashString = timestamp + resourcePath + queryString + bodyString;

    // Decode shared secret from base64
    const sharedSecretBuffer = Buffer.from(this.sharedSecret, 'base64');

    // Generate HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', sharedSecretBuffer);
    hmac.update(preHashString);
    const hash = hmac.digest('hex');

    return {
      xPayToken: hash,
      timestamp: timestamp
    };
  }

  /**
   * Generate headers for Visa API request including x-pay-token
   * @param {string} resourcePath - API endpoint path
   * @param {string} queryString - URL query parameters
   * @param {object} requestBody - Request payload
   * @returns {object} Headers object
   */
  generateHeaders(resourcePath, queryString = '', requestBody = '') {
    const { xPayToken, timestamp } = this.generateXPayToken(resourcePath, queryString, requestBody);

    return {
      'x-pay-token': xPayToken,
      'x-v-datetime': timestamp,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }
}

module.exports = new XPayTokenGenerator();
