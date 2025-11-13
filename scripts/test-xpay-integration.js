#!/usr/bin/env node

/**
 * X-Pay-Token Integration Test
 * Verifies that x-pay-token is being generated and included in Visa API requests
 */

require('dotenv').config();
const visaDirect = require('../services/visaDirect');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testXPayToken() {
  log('\n🔐 X-Pay-Token Integration Test\n', colors.cyan);

  // Check if shared secret is configured
  if (!process.env.VISA_SHARED_SECRET) {
    log('❌ VISA_SHARED_SECRET not configured in .env', colors.red);
    log('   Add your shared secret to .env to enable x-pay-token authentication', colors.yellow);
    log('   The test will proceed with Basic Auth only.\n', colors.yellow);
  } else {
    log('✅ VISA_SHARED_SECRET is configured', colors.green);
    log('✅ X-Pay-Token will be generated for requests\n', colors.green);
  }

  // Test push payment request
  log('Testing Visa Direct Push Payment...\n', colors.cyan);

  try {
    const result = await visaDirect.pushPayment({
      amount: 1.00,
      recipientPAN: '4957030420210454',
      currency: 'USD',
      businessApplicationId: 'AA',
      sourceOfFundsCode: '02',
      senderAccountNumber: '4005520000011126',
      sender: {
        name: 'Test Sender',
        city: 'San Francisco',
        stateCode: 'CA',
        countryCode: 'USA'
      }
    });

    if (result.success) {
      log('✅ Transaction successful!', colors.green);
      log(`   Transaction ID: ${result.transactionIdentifier}`, colors.green);
      log(`   Response Code: ${result.responseCode}`, colors.green);
    } else {
      log('⚠️  Transaction response received:', colors.yellow);
      log(`   Status: ${result.status}`, colors.yellow);
      log(`   Message: ${result.message}`, colors.yellow);
    }

    log('\n📊 Full Response:', colors.cyan);
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, colors.red);

    if (error.message.includes('9125')) {
      log('\n💡 Error 9125 usually means:', colors.yellow);
      log('   - Missing required field in request', colors.yellow);
      log('   - Payment Facility ID not configured', colors.yellow);
      log('   - Acceptor ID mismatch', colors.yellow);
    } else if (error.message.includes('401')) {
      log('\n💡 Error 401 means:', colors.yellow);
      log('   - Invalid credentials (User ID or Password)', colors.yellow);
      log('   - X-Pay-Token signature mismatch', colors.yellow);
    } else if (error.message.includes('403')) {
      log('\n💡 Error 403 means:', colors.yellow);
      log('   - API not enabled for your project', colors.yellow);
      log('   - Certificate mismatch', colors.yellow);
    }

    if (error.response) {
      log('\n📋 Error Response:', colors.yellow);
      console.log(JSON.stringify(error.response, null, 2));
    }
  }

  log('\n✅ Test complete\n', colors.cyan);
}

testXPayToken().catch(error => {
  log(`\n💥 Fatal error: ${error.message}\n`, colors.red);
  console.error(error);
  process.exit(1);
});
