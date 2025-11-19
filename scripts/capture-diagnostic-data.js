#!/usr/bin/env node

/**
 * Capture Diagnostic Data for Visa Support Ticket
 * 
 * This script captures all required information for Error 9125 troubleshooting:
 * 1. Endpoint
 * 2. Request Headers
 * 3. Request Body
 * 4. Response Headers (including x-correlation-id)
 * 5. Response Body
 */

require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');
const visaNet = require('../services/visaNet');

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function captureDiagnosticData() {
  log('\n╔════════════════════════════════════════════════════════════════════╗', colors.blue);
  log('║  VISA DIAGNOSTIC DATA CAPTURE - ERROR 9125                         ║', colors.blue);
  log('╚════════════════════════════════════════════════════════════════════╝\n', colors.blue);

  const diagnosticData = {
    timestamp: new Date().toISOString(),
    endpoint: {},
    requestHeaders: {},
    requestBody: {},
    responseHeaders: {},
    responseBody: {},
    configuration: {}
  };

  // Capture configuration
  log('📋 Capturing Configuration...', colors.cyan);
  diagnosticData.configuration = {
    clientId: process.env.VISANET_CLIENT_ID || 'NOT SET',
    userId: process.env.VISANET_USER_ID ? 'SET (hidden)' : 'NOT SET',
    password: process.env.VISANET_PASSWORD ? 'SET (hidden)' : 'NOT SET',
    paymentFacilityId: process.env.VISANET_PAYMENT_FACILITY_ID || 'NOT SET',
    acceptorId: process.env.VISANET_ACCEPTOR_ID || 'NOT SET',
    terminalId: process.env.VISANET_TERMINAL_ID || 'NOT SET',
    mleKeyId: process.env.VISANET_MLE_KEY_ID || 'NOT SET',
    environment: 'sandbox'
  };

  log(`   Client ID: ${diagnosticData.configuration.clientId}`, colors.reset);
  log(`   Payment Facility ID: ${diagnosticData.configuration.paymentFacilityId}`, colors.reset);
  log(`   Acceptor ID: ${diagnosticData.configuration.acceptorId}`, colors.reset);
  log(`   Terminal ID: ${diagnosticData.configuration.terminalId}`, colors.reset);
  log(`   MLE Key ID: ${diagnosticData.configuration.mleKeyId}\n`, colors.reset);

  // Test card data
  const testCard = {
    cardNumber: '4957030420210454',
    expiryDate: '2512',
    cvv: '123',
    amount: 100.00
  };

  try {
    log('🔐 Initiating authorization request...', colors.cyan);
    
    // Intercept the actual request to capture headers and body
    const originalRequest = https.request;
    let capturedRequest = null;
    let capturedRequestBody = null;

    https.request = function(...args) {
      const options = args[0];
      
      // Capture endpoint
      diagnosticData.endpoint = {
        method: options.method,
        protocol: 'https:',
        hostname: options.hostname,
        port: options.port || 443,
        path: options.path,
        fullUrl: `https://${options.hostname}${options.path}`
      };

      // Capture request headers
      diagnosticData.requestHeaders = {
        ...options.headers,
        // Add note about auth header
        '_note': 'Authorization header contains Basic Auth credentials (base64 encoded userId:password)'
      };

      const req = originalRequest.apply(this, args);
      
      // Intercept write to capture body
      const originalWrite = req.write;
      req.write = function(data) {
        capturedRequestBody = data;
        try {
          diagnosticData.requestBody = typeof data === 'string' ? JSON.parse(data) : data;
        } catch (e) {
          diagnosticData.requestBody = data.toString();
        }
        return originalWrite.call(this, data);
      };

      return req;
    };

    // Make the authorization request
    const result = await visaNet.authorize({
      cardNumber: testCard.cardNumber,
      expiryDate: testCard.expiryDate,
      cvv: testCard.cvv,
      amount: testCard.amount
    });

    // This won't be reached if error occurs
    log('✅ Authorization successful (unexpected)', colors.green);
    diagnosticData.responseBody = result;

  } catch (error) {
    log('❌ Authorization failed (expected Error 9125)', colors.red);
    
    // Capture error response
    if (error.response) {
      diagnosticData.responseHeaders = error.response.headers || {};
      diagnosticData.responseBody = error.response.data || error.message;
    } else if (error.message) {
      // Parse error message to extract response data
      const match = error.message.match(/API Error: (\d+) - ({.*})/);
      if (match) {
        diagnosticData.responseBody = {
          statusCode: parseInt(match[1]),
          body: JSON.parse(match[2])
        };
      } else {
        diagnosticData.responseBody = {
          error: error.message,
          stack: error.stack
        };
      }
    }
  } finally {
    // Restore original request
    https.request = originalRequest;
  }

  // Generate report
  log('\n' + '═'.repeat(80), colors.blue);
  log('DIAGNOSTIC REPORT FOR VISA SUPPORT', colors.blue);
  log('═'.repeat(80) + '\n', colors.blue);

  // 1. ENDPOINT
  log('1️⃣  ENDPOINT', colors.cyan);
  log('─'.repeat(80), colors.cyan);
  log(`   Method: ${diagnosticData.endpoint.method || 'POST'}`, colors.reset);
  log(`   URL: ${diagnosticData.endpoint.fullUrl || 'https://sandbox.api.visa.com/acs/v3/payments/authorizations'}`, colors.reset);
  log(`   Protocol: HTTPS`, colors.reset);
  log(`   Environment: Sandbox\n`, colors.reset);

  // 2. REQUEST HEADERS
  log('2️⃣  REQUEST HEADERS', colors.cyan);
  log('─'.repeat(80), colors.cyan);
  if (diagnosticData.requestHeaders && Object.keys(diagnosticData.requestHeaders).length > 0) {
    Object.entries(diagnosticData.requestHeaders).forEach(([key, value]) => {
      if (key === 'Authorization') {
        log(`   ${key}: Basic [REDACTED - Base64(${diagnosticData.configuration.userId}:***)]`, colors.reset);
      } else if (key !== '_note') {
        log(`   ${key}: ${value}`, colors.reset);
      }
    });
  } else {
    log('   Content-Type: application/json', colors.reset);
    log('   Accept: application/json', colors.reset);
    log(`   Authorization: Basic [credentials from VISANET_USER_ID:VISANET_PASSWORD]`, colors.reset);
    log('   x-client-transaction-id: [generated]', colors.reset);
    log('   x-correlation-id: [generated]', colors.reset);
  }
  log('', colors.reset);

  // 3. REQUEST BODY
  log('3️⃣  REQUEST BODY', colors.cyan);
  log('─'.repeat(80), colors.cyan);
  if (diagnosticData.requestBody && Object.keys(diagnosticData.requestBody).length > 0) {
    log(JSON.stringify(diagnosticData.requestBody, null, 2), colors.reset);
  } else {
    log('   [Request body will be shown during actual API call]', colors.yellow);
    log('   Structure includes:', colors.yellow);
    log('   - msgIdentfctn.clientId: ' + diagnosticData.configuration.clientId, colors.yellow);
    log('   - Body.Envt.Accptr.PaymentFacltId: ' + diagnosticData.configuration.paymentFacilityId, colors.yellow);
    log('   - Body.Envt.Accptr.Accptr: ' + diagnosticData.configuration.acceptorId, colors.yellow);
    log('   - Body.Envt.Card.PrtctdCardNb: [MLE encrypted]', colors.yellow);
  }
  log('', colors.reset);

  // 4. RESPONSE HEADERS
  log('4️⃣  RESPONSE HEADERS', colors.cyan);
  log('─'.repeat(80), colors.cyan);
  if (diagnosticData.responseHeaders && Object.keys(diagnosticData.responseHeaders).length > 0) {
    Object.entries(diagnosticData.responseHeaders).forEach(([key, value]) => {
      log(`   ${key}: ${value}`, colors.reset);
      if (key.toLowerCase() === 'x-correlation-id') {
        log(`   ⚠️  IMPORTANT: Include this x-correlation-id in support ticket`, colors.yellow);
      }
    });
  } else {
    log('   [Response headers not captured - will be available in actual API call]', colors.yellow);
    log('   ⚠️  x-correlation-id: [CRITICAL - needed for support ticket]', colors.yellow);
  }
  log('', colors.reset);

  // 5. RESPONSE BODY
  log('5️⃣  RESPONSE BODY', colors.cyan);
  log('─'.repeat(80), colors.cyan);
  if (diagnosticData.responseBody) {
    log(JSON.stringify(diagnosticData.responseBody, null, 2), colors.reset);
  } else {
    log('   [No response body captured]', colors.yellow);
  }
  log('', colors.reset);

  // Save to file
  const reportPath = path.join(__dirname, '..', 'diagnostic-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(diagnosticData, null, 2));
  
  log('═'.repeat(80), colors.green);
  log(`✅ Diagnostic data saved to: ${reportPath}`, colors.green);
  log('═'.repeat(80) + '\n', colors.green);

  // Summary for support ticket
  log('📧 EMAIL TO VISA SUPPORT (Nikolay Orlenko)', colors.blue);
  log('─'.repeat(80), colors.blue);
  log('Subject: Error 9125 - Diagnostic Data - Account: [Your VDP Account]', colors.reset);
  log('', colors.reset);
  log('Dear Nikolay,', colors.reset);
  log('', colors.reset);
  log('Please find the requested diagnostic information below for Error 9125:', colors.reset);
  log('"Expected input credential was not present"', colors.reset);
  log('', colors.reset);
  log('1. Endpoint: https://sandbox.api.visa.com/acs/v3/payments/authorizations', colors.reset);
  log('2. Request Headers: [See above output]', colors.reset);
  log('3. Request Body: [See above output]', colors.reset);
  log('4. Response Headers with x-correlation-id: [See above output]', colors.reset);
  log('5. Response Body: [See above output]', colors.reset);
  log('', colors.reset);
  log('Configuration:', colors.reset);
  log(`   - Client ID: ${diagnosticData.configuration.clientId}`, colors.reset);
  log(`   - Payment Facility ID: ${diagnosticData.configuration.paymentFacilityId}`, colors.reset);
  log(`   - Acceptor ID: ${diagnosticData.configuration.acceptorId}`, colors.reset);
  log('', colors.reset);
  log('Best regards,', colors.reset);
  log('Ted', colors.reset);
  log('─'.repeat(80) + '\n', colors.blue);

  return diagnosticData;
}

// Run capture
captureDiagnosticData()
  .then(() => {
    log('✅ Diagnostic capture complete\n', colors.green);
    process.exit(0);
  })
  .catch(error => {
    log(`❌ Diagnostic capture failed: ${error.message}\n`, colors.red);
    console.error(error);
    process.exit(1);
  });
