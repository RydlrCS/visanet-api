#!/usr/bin/env node

/**
 * VisaNet Connect - Live API Test with Test Card Data
 *
 * This script tests the VisaNet Connect authorization API with valid test card data.
 * Uses the credentials from project: c70ff121-977b-4872-9b69-550b1c281755
 *
 * Test Data Portal: https://developer.visa.com/portal/app/v2/c70ff121-977b-4872-9b69-550b1c281755/SBX
 *
 * Usage: node scripts/test-visanet-live.js
 */

require('dotenv').config();
const visaNet = require('../services/visaNet');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function runTests() {
  log('\n🧪 VisaNet Connect Live API Test\n', colors.blue);
  log('Project: c70ff121-977b-4872-9b69-550b1c281755', colors.cyan);
  log('Environment: Visa Sandbox', colors.cyan);
  log('', colors.reset);

  // Test Card Data (standard Visa test cards)
  const testCards = [
    {
      name: 'Visa Classic',
      pan: '4895142232120006',
      expiry: '2512',
      cvv: '123',
      expectedResult: 'Approved'
    },
    {
      name: 'Visa Gold',
      pan: '4957030420210454',
      expiry: '2512',
      cvv: '123',
      expectedResult: 'Approved'
    },
    {
      name: 'Visa Platinum',
      pan: '4005520000011126',
      expiry: '2512',
      cvv: '123',
      expectedResult: 'Approved'
    }
  ];

  log('═'.repeat(80), colors.cyan);
  log('Test 1: E-commerce Authorization (KEYD - Keyed Entry)', colors.yellow);
  log('═'.repeat(80), colors.cyan);

  try {
    const card = testCards[0];
    log(`\nCard: ${card.name} (${card.pan.substring(0, 6)}****${card.pan.substring(12)})`, colors.cyan);

    const result = await visaNet.authorize({
      amount: 25.50,
      currency: 'USD',
      cardNumber: card.pan,
      expiryDate: card.expiry,
      cardEntryMode: 'KEYD',  // Keyed entry (e-commerce)
      merchantCategoryCode: '5999',  // Miscellaneous retail
      merchantName: 'Locapay Test Merchant',
      merchantId: '123456789012345',
      terminalId: '12345678',
      postalCode: '94404',
      transactionId: `ECOM${Date.now()}`
    });

    if (result.approved) {
      log('\n✅ Authorization APPROVED', colors.green);
      log(`   Transaction ID: ${result.transactionId}`, colors.green);
      log(`   Authorization ID: ${result.authorizationId}`, colors.green);
      log(`   Approval Code: ${result.approvalCode}`, colors.green);
      log(`   Response Code: ${result.responseCode}`, colors.green);
    } else {
      log('\n❌ Authorization DECLINED', colors.red);
      log(`   Reason: ${result.message}`, colors.red);
      log(`   Response Code: ${result.responseCode}`, colors.red);
    }

    log('\n📋 Full Response:', colors.cyan);
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, colors.red);
    if (error.response) {
      log('\n📋 Error Response:', colors.yellow);
      console.log(JSON.stringify(error.response, null, 2));
    }
  }

  log('\n' + '═'.repeat(80), colors.cyan);
  log('Test 2: POS Authorization (CICC - Chip Card)', colors.yellow);
  log('═'.repeat(80), colors.cyan);

  try {
    const card = testCards[1];
    log(`\nCard: ${card.name} (${card.pan.substring(0, 6)}****${card.pan.substring(12)})`, colors.cyan);

    const result = await visaNet.authorize({
      amount: 150.00,
      currency: 'USD',
      cardNumber: card.pan,
      expiryDate: card.expiry,
      cardEntryMode: 'CICC',  // Chip card (ICC)
      merchantCategoryCode: '5411',  // Grocery stores
      merchantName: 'Locapay Grocery Store',
      merchantId: '987654321098765',
      terminalId: '87654321',
      postalCode: '10001',
      transactionId: `POS${Date.now()}`
    });

    if (result.approved) {
      log('\n✅ Authorization APPROVED', colors.green);
      log(`   Transaction ID: ${result.transactionId}`, colors.green);
      log(`   Authorization ID: ${result.authorizationId}`, colors.green);
      log(`   Approval Code: ${result.approvalCode}`, colors.green);
      log(`   Response Code: ${result.responseCode}`, colors.green);
    } else {
      log('\n❌ Authorization DECLINED', colors.red);
      log(`   Reason: ${result.message}`, colors.red);
      log(`   Response Code: ${result.responseCode}`, colors.red);
    }

    log('\n📋 Full Response:', colors.cyan);
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, colors.red);
    if (error.response) {
      log('\n📋 Error Response:', colors.yellow);
      console.log(JSON.stringify(error.response, null, 2));
    }
  }

  log('\n' + '═'.repeat(80), colors.cyan);
  log('Test 3: Contactless Payment (CTLS)', colors.yellow);
  log('═'.repeat(80), colors.cyan);

  try {
    const card = testCards[2];
    log(`\nCard: ${card.name} (${card.pan.substring(0, 6)}****${card.pan.substring(12)})`, colors.cyan);

    const result = await visaNet.authorize({
      amount: 8.99,
      currency: 'USD',
      cardNumber: card.pan,
      expiryDate: card.expiry,
      cardEntryMode: 'CTLS',  // Contactless
      merchantCategoryCode: '5812',  // Eating places, restaurants
      merchantName: 'Locapay Coffee Shop',
      merchantId: '555666777888999',
      terminalId: '99988877',
      postalCode: '90210',
      transactionId: `CTLS${Date.now()}`
    });

    if (result.approved) {
      log('\n✅ Authorization APPROVED', colors.green);
      log(`   Transaction ID: ${result.transactionId}`, colors.green);
      log(`   Authorization ID: ${result.authorizationId}`, colors.green);
      log(`   Approval Code: ${result.approvalCode}`, colors.green);
      log(`   Response Code: ${result.responseCode}`, colors.green);
    } else {
      log('\n❌ Authorization DECLINED', colors.red);
      log(`   Reason: ${result.message}`, colors.red);
      log(`   Response Code: ${result.responseCode}`, colors.red);
    }

    log('\n📋 Full Response:', colors.cyan);
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, colors.red);
    if (error.response) {
      log('\n📋 Error Response:', colors.yellow);
      console.log(JSON.stringify(error.response, null, 2));
    }
  }

  log('\n' + '═'.repeat(80), colors.green);
  log('✅ All Tests Complete', colors.green);
  log('═'.repeat(80) + '\n', colors.green);
}

// Run tests
runTests().catch(error => {
  log(`\n💥 Fatal error: ${error.message}\n`, colors.red);
  console.error(error);
  process.exit(1);
});
