#!/usr/bin/env node

/**
 * Complete Diagnostic Data Capture for Visa Support
 * Captures all 5 items requested by Nikolay Orlenko
 * FIXED: Now captures response headers and body from error
 */

require('dotenv').config();
const https = require('https');
const fs = require('fs');

// Store captured data
const diagnosticData = {
  timestamp: new Date().toISOString(),
  endpoint: {
    method: 'POST',
    endpoint: '/acs/v3/payments/authorizations',
    fullUrl: 'https://sandbox.api.visa.com/acs/v3/payments/authorizations'
  },
  requestHeaders: null,
  requestBody: null,
  responseHeaders: null,
  responseBody: null,
  httpStatusCode: null,
  error: null
};

// Monkey-patch https.request to capture all data
const originalHttpsRequest = https.request;
https.request = function(url, options, callback) {
  // Capture request headers
  if (options && options.headers) {
    diagnosticData.requestHeaders = { ...options.headers };
  }

  // Wrap the callback to capture response
  const wrappedCallback = function(res) {
    // Capture response headers
    diagnosticData.responseHeaders = { ...res.headers };
    diagnosticData.httpStatusCode = res.statusCode;

    let responseData = '';

    // Save original on method
    const originalOn = res.on.bind(res);
    
    // Intercept 'data' events to capture response
    res.on = function(event, listener) {
      if (event === 'data') {
        const wrappedListener = function(chunk) {
          responseData += chunk;
          if (listener) listener(chunk);
        };
        return originalOn(event, wrappedListener);
      } else if (event === 'end') {
        const wrappedListener = function() {
          // Capture response body
          try {
            diagnosticData.responseBody = JSON.parse(responseData);
          } catch (e) {
            diagnosticData.responseBody = responseData;
          }
          if (listener) listener();
        };
        return originalOn(event, wrappedListener);
      }
      return originalOn(event, listener);
    };

    // Call original callback
    if (callback) {
      return callback(res);
    }
  };

  // Create the request with wrapped callback
  const req = originalHttpsRequest(url, options, wrappedCallback);

  // Intercept write to capture request body
  const originalWrite = req.write.bind(req);
  req.write = function(data) {
    try {
      diagnosticData.requestBody = JSON.parse(data);
    } catch (e) {
      diagnosticData.requestBody = data;
    }
    return originalWrite(data);
  };

  return req;
};

async function captureDiagnosticData() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║   DIAGNOSTIC DATA CAPTURE FOR VISA DEVELOPER SUPPORT          ║');
  console.log('║   Error 9125 - Complete Request/Response Details              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('Executing authorization request...\n');

  // Load visaNet service AFTER monkey-patching
  const visaNet = require('../services/visaNet');

  try {
    await visaNet.authorize({
      cardNumber: '4957030420210454',
      expiryDate: '2512',
      cvv: '123',
      amount: 10.00
    });
    console.log('✅ Authorization successful (unexpected)\n');
  } catch (error) {
    diagnosticData.error = error.message;
    console.log('❌ Authorization failed with Error 9125 (expected)\n');
  }

  // Give a moment for all async operations to complete
  await new Promise(resolve => setTimeout(resolve, 500));

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
  console.log(`Method:   ${diagnosticData.endpoint.method}`);
  console.log(`URL:      ${diagnosticData.endpoint.fullUrl}`);
  console.log();

  // 2. REQUEST HEADERS
  console.log('2️⃣  REQUEST HEADERS');
  console.log(line);
  if (diagnosticData.requestHeaders) {
    Object.entries(diagnosticData.requestHeaders).forEach(([key, value]) => {
      if (key.toLowerCase() === 'authorization') {
        console.log(`${key}: Basic [REDACTED - Base64 encoded]`);
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
  console.log(`HTTP Status Code: ${diagnosticData.httpStatusCode || 'Unknown'}`);
  console.log();
  if (diagnosticData.responseHeaders) {
    Object.entries(diagnosticData.responseHeaders).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    console.log();
    // Highlight x-correlation-id
    const correlationId = diagnosticData.responseHeaders['x-correlation-id'] || 
                         diagnosticData.responseHeaders['X-Correlation-Id'] ||
                         diagnosticData.responseHeaders['x-correlation-ID'];
    if (correlationId) {
      console.log(`⚠️  IMPORTANT FOR VISA SUPPORT: x-correlation-id = ${correlationId}`);
    } else {
      console.log('⚠️  x-correlation-id not found in response headers');
      console.log('Available headers:', Object.keys(diagnosticData.responseHeaders).join(', '));
    }
  } else {
    console.log('Not captured');
  }
  console.log();

  // 5. RESPONSE BODY
  console.log('5️⃣  RESPONSE BODY');
  console.log(line);
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
  console.log(`User ID (Auth):      ${process.env.VISANET_USER_ID ? '[SET - Redacted]' : 'NOT SET'}`);
  console.log(`Password (Auth):     ${process.env.VISANET_PASSWORD ? '[SET - Redacted]' : 'NOT SET'}`);
  console.log(`Payment Facility ID: ${process.env.VISANET_PAYMENT_FACILITY_ID || 'NOT SET'}`);
  console.log(`Acceptor ID:         ${process.env.VISANET_ACCEPTOR_ID || 'NOT SET'}`);
  console.log(`Terminal ID:         ${process.env.VISANET_TERMINAL_ID || 'NOT SET'}`);
  console.log(`MLE Key ID:          ${process.env.VISANET_MLE_KEY_ID || 'NOT SET'}`);
  console.log(`MLE Encryption:      ${process.env.VISANET_MLE_KEY_ID ? 'ENABLED' : 'DISABLED'}`);
  console.log();

  // Save to file
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
    note: 'Diagnostic data for Visa Support - Error 9125 - COMPLETE',
    contact: 'Nikolay Orlenko',
    repository: 'https://github.com/RydlrCS/visanet-api'
  };

  // Redact sensitive data
  if (reportData.requestHeaders?.Authorization || reportData.requestHeaders?.authorization) {
    reportData.requestHeaders.Authorization = 'Basic [REDACTED]';
    delete reportData.requestHeaders.authorization;
  }

  fs.writeFileSync('./VISA_SUPPORT_DIAGNOSTIC_DATA_COMPLETE.json', JSON.stringify(reportData, null, 2));
  console.log('✅ Full diagnostic data saved to: VISA_SUPPORT_DIAGNOSTIC_DATA_COMPLETE.json');
  console.log(separator);
  console.log();

  // Email Template
  console.log('📧 EMAIL READY TO SEND TO NIKOLAY ORLENKO');
  console.log(separator);
  console.log();
  console.log('Copy the text below for your email to Visa Support:');
  console.log();
  console.log(line);
  console.log();
  console.log('Dear Nikolay,');
  console.log();
  console.log('Thank you for your assistance with Error 9125.');
  console.log('Below is the complete diagnostic information you requested:');
  console.log();
  console.log('━'.repeat(60));
  console.log('1. ENDPOINT:');
  console.log(`   ${diagnosticData.endpoint.method} ${diagnosticData.endpoint.fullUrl}`);
  console.log();
  console.log('2. REQUEST HEADERS:');
  if (diagnosticData.requestHeaders) {
    Object.entries(diagnosticData.requestHeaders).forEach(([key, value]) => {
      if (key.toLowerCase() === 'authorization') {
        console.log(`   ${key}: Basic [Base64 credentials - available if needed]`);
      } else {
        console.log(`   ${key}: ${value}`);
      }
    });
  }
  console.log();
  console.log('3. REQUEST BODY:');
  console.log('   (Full JSON available in attached file, key fields below)');
  if (diagnosticData.requestBody) {
    console.log(`   clientId: ${diagnosticData.requestBody.msgIdentfctn?.clientId}`);
    console.log(`   PaymentFacltId: ${diagnosticData.requestBody.Body?.Envt?.Accptr?.PaymentFacltId}`);
    console.log(`   Accptr (Acceptor ID): ${diagnosticData.requestBody.Body?.Envt?.Accptr?.Accptr}`);
    console.log(`   TermnlId: ${diagnosticData.requestBody.Body?.Envt?.Termnl?.TermnlId?.Id}`);
  }
  console.log();
  console.log('4. RESPONSE HEADERS (including x-correlation-id):');
  if (diagnosticData.responseHeaders) {
    const correlationId = diagnosticData.responseHeaders['x-correlation-id'] || 
                         diagnosticData.responseHeaders['X-Correlation-Id'];
    if (correlationId) {
      console.log(`   x-correlation-id: ${correlationId}`);
    } else {
      console.log('   x-correlation-id: Not found in response headers');
    }
    console.log(`   HTTP Status: ${diagnosticData.httpStatusCode}`);
    const contentType = diagnosticData.responseHeaders['content-type'] || 
                       diagnosticData.responseHeaders['Content-Type'];
    console.log(`   Content-Type: ${contentType || 'Not provided'}`);
  }
  console.log();
  console.log('5. RESPONSE BODY:');
  if (diagnosticData.responseBody) {
    console.log('   ' + JSON.stringify(diagnosticData.responseBody));
  }
  console.log('━'.repeat(60));
  console.log();
  console.log('Despite configuring all identified credentials (Client ID: 1DLMLAPPKDJ04301701,');
  console.log('Payment Facility ID, Acceptor ID, Terminal ID), Error 9125 persists.');
  console.log();
  console.log('Could you please review the complete request/response data and advise:');
  console.log('1. Which specific credential is missing or incorrect?');
  console.log('2. Is the Client ID (1DLMLAPPKDJ04301701) valid for the Authorization API?');
  console.log('3. Are there additional permissions or credentials needed on our VDP account?');
  console.log();
  console.log('Full diagnostic data attached: VISA_SUPPORT_DIAGNOSTIC_DATA_COMPLETE.json');
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
