#!/usr/bin/env node

/**
 * VisaNet Connect Authorization Test Script
 * Tests VisaNet authorization API with MLE encryption
 */

require('dotenv').config();
const VisaNetService = require('../services/visaNet');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testVisaNetAuthorization() {
  log('\n========================================', 'cyan');
  log('  VisaNet Authorization Test', 'cyan');
  log('========================================\n', 'cyan');

  try {
    // Get VisaNet service instance
    log('Step 1: Initializing VisaNet service...', 'blue');
    const visaNet = VisaNetService; // Already an instance
    
    // Check configuration
    log('Payment Facility ID: ' + (process.env.VISANET_PAYMENT_FACILITY_ID || 'NOT SET'), 
        process.env.VISANET_PAYMENT_FACILITY_ID && !process.env.VISANET_PAYMENT_FACILITY_ID.includes('your_') ? 'green' : 'red');
    log('Acceptor ID: ' + (process.env.VISANET_ACCEPTOR_ID || 'NOT SET'),
        process.env.VISANET_ACCEPTOR_ID && !process.env.VISANET_ACCEPTOR_ID.includes('your_') ? 'green' : 'red');
    log('MLE Enabled: ' + (visaNet.useMLE ? 'Yes' : 'No'), visaNet.useMLE ? 'green' : 'yellow');
    
    console.log('');

    // Test data - VisaNet Connect test card
    log('Step 2: Preparing test transaction...', 'blue');
    const testData = {
      amount: '124.05',
      currency: '840', // USD
      cardNumber: '4895142232120006', // VisaNet test card
      expiryDate: '2512', // MM/YY format (December 2025)
      cvv: '123',
      merchantCategoryCode: '5812', // Eating places, restaurants
      posConditionCode: '00',
      merchantId: process.env.VISANET_ACCEPTOR_ID || 'vdcuntdbkafricang',
      terminalId: '12345678',
      acquirerBIN: '408999',
      retrievalReferenceNumber: Date.now().toString().slice(-12),
      cardAcceptorName: 'United Bank for Africa',
      cardAcceptorCity: 'Lagos',
      cardAcceptorState: 'LA',
      cardAcceptorCountry: 'NGA',
      cardAcceptorZip: '100001'
    };

    log(`Amount: $${testData.amount}`, 'cyan');
    log(`Card: ${testData.cardNumber.slice(0, 6)}******${testData.cardNumber.slice(-4)}`, 'cyan');
    log(`Merchant: ${testData.cardAcceptorName}`, 'cyan');
    log(`Payment Facility: ${process.env.VISANET_PAYMENT_FACILITY_ID}`, 'cyan');
    
    console.log('');

    // Make authorization request
    log('Step 3: Sending authorization request...', 'blue');
    log('This may take a few seconds...', 'yellow');
    
    const result = await visaNet.authorize(testData);
    
    console.log('');
    log('========================================', 'cyan');
    log('  Authorization Response', 'cyan');
    log('========================================\n', 'cyan');

    if (result.success) {
      log('✓ Authorization Successful!', 'green');
      log(`Response Code: ${result.responseCode}`, 'green');
      log(`Approval Code: ${result.approvalCode || 'N/A'}`, 'green');
      log(`Transaction ID: ${result.transactionId || 'N/A'}`, 'cyan');
      log(`Action Code: ${result.actionCode || 'N/A'}`, 'cyan');
      
      if (result.response) {
        console.log('\nFull Response:', 'cyan');
        console.log(JSON.stringify(result.response, null, 2));
      }
    } else {
      log('✗ Authorization Failed', 'red');
      log(`Error: ${result.error}`, 'red');
      log(`Response Code: ${result.responseCode || 'N/A'}`, 'yellow');
      
      if (result.response) {
        console.log('\nError Response:', 'yellow');
        console.log(JSON.stringify(result.response, null, 2));
      }
    }

    console.log('');
    log('========================================', 'cyan');
    log('  Test Complete', 'cyan');
    log('========================================\n', 'cyan');

    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.log('');
    log('========================================', 'red');
    log('  Test Failed', 'red');
    log('========================================\n', 'red');
    
    log(`Error: ${error.message}`, 'red');
    
    if (error.stack) {
      console.log('\nStack Trace:', 'yellow');
      console.log(error.stack);
    }
    
    console.log('');
    log('Troubleshooting Tips:', 'cyan');
    log('1. Verify Payment Facility ID is correct', 'cyan');
    log('2. Check VisaNet credentials in .env', 'cyan');
    log('3. Ensure MLE certificates are properly configured', 'cyan');
    log('4. Review error details above', 'cyan');
    
    process.exit(1);
  }
}

// Run the test
testVisaNetAuthorization();
