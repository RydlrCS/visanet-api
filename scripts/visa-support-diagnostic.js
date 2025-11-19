#!/usr/bin/env node

/**
 * Complete Diagnostic Data Capture for Visa Support
 * Captures all 5 items requested by Nikolay Orlenko
 */

require('dotenv').config();
const axios = require('axios');

// Store captured data
const diagnosticData = {
  timestamp: new Date().toISOString(),
  endpoint: null,
  requestHeaders: null,
  requestBody: null,
  responseHeaders: null,
  responseBody: null,
  httpStatusCode: null
};

// Setup axios interceptors to capture request/response
axios.interceptors.request.use(
  (config) => {
    // Capture endpoint
    diagnosticData.endpoint = {
      method: config.method?.toUpperCase() || 'POST',
      baseURL: config.baseURL || '',
      url: config.url || '',
      fullUrl: `${config.baseURL || ''}${config.url || ''}`,
      params: config.params || {}
    };

    // Capture request headers
    diagnosticData.requestHeaders = { ...config.headers };

    // Capture request body
    diagnosticData.requestBody = config.data;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    // Capture response headers
    diagnosticData.responseHeaders = { ...response.headers };
    diagnosticData.httpStatusCode = response.status;
    diagnosticData.responseBody = response.data;
    return response;
  },
  (error) => {
    // Capture error response
    if (error.response) {
      diagnosticData.responseHeaders = { ...error.response.headers };
      diagnosticData.httpStatusCode = error.response.status;
      diagnosticData.responseBody = error.response.data;
    }
    return Promise.reject(error);
  }
);

// Now load the service (after interceptors are set up)
const visaNet = require('../services/visaNet');

async function captureDiagnosticData() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║   DIAGNOSTIC DATA CAPTURE FOR VISA DEVELOPER SUPPORT          ║');
  console.log('║   Error 9125 - Complete Request/Response Details              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('Executing authorization request...\n');

  try {
    await visaNet.authorize({
      cardNumber: '4957030420210454',
      expiryDate: '2512',
      cvv: '123',
      amount: 10.00
    });
    console.log('✅ Authorization successful (unexpected)\n');
  } catch (error) {
    console.log('❌ Authorization failed with Error 9125 (expected)\n');
  }

  // Generate formatted report
  const separator = '═'.repeat(80);
  const line = '─'.repeat(80);

  console.log(separator);
  console.log('VISA DEVELOPER SUPPORT - DIAGNOSTIC REPORT');
  console.log('Error: 9125 - Expected input credential was not present');
  console.log('Contact: Nikolay Orlenko');
  console.log('Date: ' + new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  console.log('Repository: https://github.com/RydlrCS/visanet-api');
  console.log(separator);
  console.log();

  // 1. ENDPOINT
  console.log('1️⃣  ENDPOINT');
  console.log(line);
  if (diagnosticData.endpoint) {
    console.log(`Method:   ${diagnosticData.endpoint.method}`);
    console.log(`URL:      ${diagnosticData.endpoint.fullUrl}`);
  } else {
    console.log('Not captured');
  }
  console.log();

  // 2. REQUEST HEADERS
  console.log('2️⃣  REQUEST HEADERS');
  console.log(line);
  if (diagnosticData.requestHeaders) {
    Object.entries(diagnosticData.requestHeaders).forEach(([key, value]) => {
      if (key.toLowerCase() === 'authorization') {
        // Show format but redact credentials
        const authType = value.split(' ')[0];
        console.log(`${key}: ${authType} [REDACTED]`);
      } else {
        console.log(`${key}: ${value}`);
      }
    });
  } else {
    console.log('Not captured');
  }
  console.log();

  // 3. REQUEST BODY
  console.log('3️⃣  REQUEST BODY');
  console.log(line);
  if (diagnosticData.requestBody) {
    console.log(JSON.stringify(diagnosticData.requestBody, null, 2));
  } else {
    console.log('Not captured');
  }
  console.log();

  // 4. RESPONSE HEADERS (including x-correlation-id)
  console.log('4️⃣  RESPONSE HEADERS (including x-correlation-id)');
  console.log(line);
  if (diagnosticData.responseHeaders) {
    Object.entries(diagnosticData.responseHeaders).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    console.log();
    // Highlight x-correlation-id
    const correlationId = diagnosticData.responseHeaders['x-correlation-id'] || 
                         diagnosticData.responseHeaders['X-Correlation-Id'];
    if (correlationId) {
      console.log(`⚠️  IMPORTANT FOR VISA SUPPORT: x-correlation-id = ${correlationId}`);
    } else {
      console.log('⚠️  WARNING: x-correlation-id not found in response headers');
    }
  } else {
    console.log('Not captured');
  }
  console.log();

  // 5. RESPONSE BODY
  console.log('5️⃣  RESPONSE BODY');
  console.log(line);
  console.log(`HTTP Status Code: ${diagnosticData.httpStatusCode || 'Unknown'}`);
  console.log();
  if (diagnosticData.responseBody) {
    if (typeof diagnosticData.responseBody === 'object') {
      console.log(JSON.stringify(diagnosticData.responseBody, null, 2));
    } else {
      console.log(diagnosticData.responseBody);
    }
  } else {
    console.log('Not captured');
  }
  console.log();

  console.log(separator);
  console.log();

  // Configuration Summary
  console.log('📋 CONFIGURATION SUMMARY');
  console.log(line);
  console.log(`Client ID:           ${process.env.VISANET_CLIENT_ID || 'NOT SET'}`);
  console.log(`User ID (Auth):      ${process.env.VISANET_USER_ID ? '[SET]' : 'NOT SET'}`);
  console.log(`Password (Auth):     ${process.env.VISANET_PASSWORD ? '[SET]' : 'NOT SET'}`);
  console.log(`Payment Facility ID: ${process.env.VISANET_PAYMENT_FACILITY_ID || 'NOT SET'}`);
  console.log(`Acceptor ID:         ${process.env.VISANET_ACCEPTOR_ID || 'NOT SET'}`);
  console.log(`Terminal ID:         ${process.env.VISANET_TERMINAL_ID || 'NOT SET'}`);
  console.log(`MLE Key ID:          ${process.env.VISANET_MLE_KEY_ID || 'NOT SET'}`);
  console.log(`MLE Encryption:      ${process.env.VISANET_MLE_KEY_ID ? 'ENABLED' : 'DISABLED'}`);
  console.log();

  // Save to file
  const fs = require('fs');
  const reportData = {
    ...diagnosticData,
    configuration: {
      clientId: process.env.VISANET_CLIENT_ID,
      paymentFacilityId: process.env.VISANET_PAYMENT_FACILITY_ID,
      acceptorId: process.env.VISANET_ACCEPTOR_ID,
      terminalId: process.env.VISANET_TERMINAL_ID,
      mleKeyId: process.env.VISANET_MLE_KEY_ID,
      mleEnabled: !!process.env.VISANET_MLE_KEY_ID
    },
    note: 'Diagnostic data for Visa Support - Error 9125',
    contact: 'Nikolay Orlenko',
    repository: 'https://github.com/RydlrCS/visanet-api'
  };

  // Redact sensitive data
  if (reportData.requestHeaders?.authorization) {
    reportData.requestHeaders.authorization = 'Basic [REDACTED]';
  }

  fs.writeFileSync('./VISA_SUPPORT_DIAGNOSTIC_DATA.json', JSON.stringify(reportData, null, 2));
  console.log('✅ Full diagnostic data saved to: VISA_SUPPORT_DIAGNOSTIC_DATA.json');
  console.log(separator);
  console.log();

  // Email Template
  console.log('📧 EMAIL TEMPLATE FOR NIKOLAY ORLENKO');
  console.log(separator);
  console.log();
  console.log('Dear Nikolay,');
  console.log();
  console.log('Thank you for your assistance with Error 9125.');
  console.log('Below is the complete diagnostic information you requested:');
  console.log();
  console.log('**1. ENDPOINT:**');
  if (diagnosticData.endpoint) {
    console.log(`   ${diagnosticData.endpoint.method} ${diagnosticData.endpoint.fullUrl}`);
  }
  console.log();
  console.log('**2. REQUEST HEADERS:**');
  if (diagnosticData.requestHeaders) {
    Object.entries(diagnosticData.requestHeaders).forEach(([key, value]) => {
      if (key.toLowerCase() === 'authorization') {
        console.log(`   ${key}: Basic [Base64 encoded credentials]`);
      } else {
        console.log(`   ${key}: ${value}`);
      }
    });
  }
  console.log();
  console.log('**3. REQUEST BODY:**');
  console.log('   (See JSON output above)');
  console.log();
  console.log('**4. RESPONSE HEADERS (including x-correlation-id):**');
  if (diagnosticData.responseHeaders) {
    const correlationId = diagnosticData.responseHeaders['x-correlation-id'] || 
                         diagnosticData.responseHeaders['X-Correlation-Id'];
    if (correlationId) {
      console.log(`   x-correlation-id: ${correlationId}`);
    }
    console.log(`   HTTP Status: ${diagnosticData.httpStatusCode}`);
  }
  console.log();
  console.log('**5. RESPONSE BODY:**');
  if (diagnosticData.responseBody) {
    console.log('   ' + JSON.stringify(diagnosticData.responseBody));
  }
  console.log();
  console.log('Despite configuring all identified credentials (Client ID, Payment Facility ID,');
  console.log('Acceptor ID, Terminal ID), Error 9125 persists. Could you please review the');
  console.log('request data and advise which credential is missing or incorrect?');
  console.log();
  console.log('Best regards,');
  console.log('Ted');
  console.log();
  console.log(separator);
}

// Run the diagnostic capture
captureDiagnosticData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
