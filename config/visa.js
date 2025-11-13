const fs = require('fs');
const https = require('https');
const logger = require('../utils/logger');

class VisaConfig {
  constructor() {
    this.userId = process.env.VISA_USER_ID;
    this.password = process.env.VISA_PASSWORD;
    this.baseURL = process.env.VISA_API_URL || 'https://sandbox.api.visa.com';

    // Load certificates
    this.cert = this.loadCertificate(process.env.VISA_CERT_PATH);
    this.key = this.loadCertificate(process.env.VISA_KEY_PATH);
    this.ca = this.loadCertificate(process.env.VISA_CA_PATH);
  }

  loadCertificate(path) {
    try {
      if (path && fs.existsSync(path)) {
        return fs.readFileSync(path);
      } else {
        logger.warn(`Certificate file not found: ${path}`);
        return null;
      }
    } catch (error) {
      logger.error(`Error loading certificate from ${path}:`, error);
      return null;
    }
  }

  getHttpsAgent() {
    return new https.Agent({
      cert: this.cert,
      key: this.key,
      ca: this.ca,
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    });
  }

  getAuthHeader() {
    const credentials = Buffer.from(`${this.userId}:${this.password}`).toString('base64');
    return `Basic ${credentials}`;
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': this.getAuthHeader()
    };
  }
}

module.exports = new VisaConfig();
