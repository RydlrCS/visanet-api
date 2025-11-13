#!/usr/bin/env node

/**
 * VisaNet Connect Authorization Test with MLE Encryption
 *
 * Tests payment authorization with Message Level Encryption (MLE) for sensitive card data
 * Demonstrates real-world usage of MLE with VisaNet Connect API
 */

require('dotenv').config();
const visaNet = require('../services/visaNet');
const mle = require('../utils/mle');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testAuthorizationWithMLE() {
  log('\n🔐 VisaNet Connect Authorization Test with MLE Encryption\n', colors.blue);

  // Check MLE configuration
  const mleConfig = mle.verifyConfiguration();
  if (mleConfig.configured) {
    log('✅ MLE is configured and ready', colors.green);
    log(`   Key ID: ${mleConfig.keyId}`, colors.cyan);
    log(`   Encryption: ${mleConfig.encryptionType || 'RSA-OAEP-SHA256'}`, colors.cyan);
  } else {
    log('⚠️  MLE is NOT configured - card data will be sent in plain text', colors.yellow);
    log('   This is NOT recommended for production!', colors.yellow);
    if (mleConfig.errors.length > 0) {
      log('\n   Configuration errors:', colors.yellow);
      mleConfig.errors.forEach(err => log(`     - ${err}`, colors.yellow));
    }
  }

  log('\n' + '─'.repeat(80), colors.cyan);

  // Test data - Visa test card numbers
  const testCards = [
    {
      name: 'Valid Visa Card (Approval Expected)',
      cardNumber: '4957030420210454',
      expiryDate: '2512',
      cvv: '123',
      amount: 100.00,
      description: 'Test MLE authorization'
    },
    {
      name: 'Another Valid Visa Card',
      cardNumber: '4111111111111111',
      expiryDate: '2512',
      cvv: '123',
      amount: 50.00,
      description: 'MLE encryption test'
    }
  ];

  log('\nRunning authorization tests with MLE encryption...\n', colors.magenta);

  for (let i = 0; i < testCards.length; i++) {
    const card = testCards[i];

    log(`\nTest ${i + 1}: ${card.name}`, colors.cyan);
    log('─'.repeat(80), colors.cyan);

    try {
      // Show what we're sending (masked for security)
      log('\nCard Details:', colors.yellow);
      log(`  Card Number: ${'*'.repeat(12)}${card.cardNumber.slice(-4)}`, colors.reset);
      log(`  Expiry: ${card.expiryDate}`, colors.reset);
      log('  CVV: ***', colors.reset);
      log(`  Amount: $${card.amount.toFixed(2)} USD`, colors.reset);
      log(`  Description: ${card.description}`, colors.reset);

      if (mleConfig.configured) {
        log('\n🔒 Encrypting sensitive card data with MLE...', colors.magenta);
      } else {
        log('\n⚠️  Sending card data WITHOUT encryption...', colors.yellow);
      }

      // Make authorization request (MLE encryption happens automatically in the service)
      const result = await visaNet.authorize({
        cardNumber: card.cardNumber,
        expiryDate: card.expiryDate,
        cvv: card.cvv,
        amount: card.amount,
        currency: '840', // USD
        merchantCategoryCode: '6012', // Financial institutions
        cardHolder: {
          name: 'John Doe'
        },
        isEcommerce: true,
        transactionDescription: card.description
      });

      log('\n✅ Authorization Response:', colors.green);
      log(`  Success: ${result.success}`, result.success ? colors.green : colors.red);
      log(`  Result: ${result.result}`, colors.cyan);
      log(`  Correlation ID: ${result.correlationId}`, colors.cyan);
      log(`  Request ID: ${result.requestId}`, colors.cyan);

      if (result.authorizationId) {
        log(`  Authorization ID: ${result.authorizationId}`, colors.cyan);
      }

      if (result.approvalCode) {
        log(`  Approval Code: ${result.approvalCode}`, colors.green);
      }

      if (result.resultCode) {
        log(`  Result Code: ${result.resultCode}`, colors.cyan);
      }

      // Show transaction amounts if available
      if (result.transactionAmounts) {
        log('\n  Transaction Amounts:', colors.yellow);
        const txAmt = result.transactionAmounts.TxAmt;
        if (txAmt) {
          log(`    Amount: ${txAmt.Amt} ${txAmt.Ccy}`, colors.reset);
        }
      }

      // Check if response contains encrypted data
      if (result.rawResponse?.Body?.Envt?.Card?.PrtctdCardData?.EncryptedData) {
        log('\n  📦 Response contains encrypted card data', colors.magenta);
        log('     (Visa encrypted the response using your client certificate)', colors.cyan);
      }

    } catch (error) {
      log(`\n❌ Authorization Failed: ${error.message}`, colors.red);

      // Parse error details if available
      try {
        const errorMatch = error.message.match(/API Error: (\d+) - (.+)/);
        if (errorMatch) {
          const [, statusCode, errorBody] = errorMatch;
          const errorData = JSON.parse(errorBody);

          log('\n  Error Details:', colors.yellow);
          log(`    Status Code: ${statusCode}`, colors.red);

          if (errorData.errors) {
            errorData.errors.forEach(err => {
              log(`    Error Code: ${err.code || 'N/A'}`, colors.red);
              log(`    Message: ${err.message || err.description || 'N/A'}`, colors.red);
              if (err.field) {
                log(`    Field: ${err.field}`, colors.red);
              }
            });
          }

          // Common error codes and solutions
          if (statusCode === '400') {
            log('\n  💡 Common causes of 400 errors:', colors.yellow);
            log('     - Missing or invalid Payment Facility ID', colors.yellow);
            log('     - Invalid card data format', colors.yellow);
            log('     - Missing required fields', colors.yellow);
            log('     - Check .env for VISA_PAYMENT_FACILITY_ID and VISA_ACCEPTOR_ID', colors.yellow);
          } else if (statusCode === '401') {
            log('\n  💡 Authentication failed:', colors.yellow);
            log('     - Check VISANET_USER_ID and VISANET_PASSWORD in .env', colors.yellow);
            log('     - Verify credentials are for VisaNet Connect API', colors.yellow);
          } else if (statusCode === '403') {
            log('\n  💡 Access forbidden:', colors.yellow);
            log('     - Mutual TLS certificate may not be authorized', colors.yellow);
            log('     - API endpoint may require different permissions', colors.yellow);
          }
        }
      } catch (parseError) {
        // Error parsing failed, just show original error
      }

      log('\n  Stack trace:', colors.yellow);
      console.error('  ', error.stack);
    }

    // Wait between requests
    if (i < testCards.length - 1) {
      log('\n  Waiting 2 seconds before next test...', colors.cyan);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  log('\n' + '═'.repeat(80), colors.cyan);
  log('Test Complete', colors.green);
  log('═'.repeat(80), colors.cyan);

  log('\n📊 Summary:', colors.magenta);
  log(`   MLE Encryption: ${mleConfig.configured ? '✅ ENABLED' : '❌ DISABLED'}`,
    mleConfig.configured ? colors.green : colors.yellow);
  log(`   Mutual TLS: ${process.env.VISA_CERT_PATH ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}`,
    process.env.VISA_CERT_PATH ? colors.green : colors.yellow);
  log(`   X-Pay-Token: ${process.env.VISA_SHARED_SECRET ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}`,
    process.env.VISA_SHARED_SECRET ? colors.green : colors.yellow);

  log('\n🔐 Security Layers:', colors.cyan);
  log('   1. Mutual TLS: Encrypts entire HTTPS connection', colors.cyan);
  log('   2. X-Pay-Token: Prevents request tampering/replay attacks', colors.cyan);
  log('   3. MLE: Encrypts sensitive card data in payload', colors.cyan);

  if (!mleConfig.configured) {
    log('\n⚠️  IMPORTANT: Configure MLE before production use!', colors.yellow);
    log('   See docs/MLE_CERTIFICATE_SETUP.md for setup instructions\n', colors.yellow);
  } else {
    log('\n✅ All security layers configured correctly!\n', colors.green);
  }
}

// Run the test
testAuthorizationWithMLE().catch(error => {
  log(`\n💥 Fatal error: ${error.message}\n`, colors.red);
  console.error(error);
  process.exit(1);
});
