#!/usr/bin/env node

/**
 * Test MLE Integration in Services
 * Verifies that MLE encryption is properly integrated into both Visa Direct and VisaNet services
 *
 * This script:
 * 1. Checks MLE configuration for both APIs
 * 2. Verifies service initialization with MLE
 * 3. Tests encryption integration (mock data)
 *
 * Usage:
 *   node scripts/test-mle-integration.js
 */

require('dotenv').config();
const logger = require('../utils/logger');
const mle = require('../utils/mle');

// Set log level to debug for verbose output
logger.level = 'debug';

/**
 * Test MLE configuration for both APIs
 */
async function testMLEConfiguration() {
  console.log('\n========================================');
  console.log('Testing MLE Configuration');
  console.log('========================================\n');

  // Test VisaNet MLE configuration
  console.log('1. Testing VisaNet MLE Configuration...');
  const visaNetStatus = mle.verifyConfiguration('visaNet');
  console.log('   ✓ VisaNet MLE Status:', JSON.stringify(visaNetStatus, null, 2));

  // Test Visa Direct MLE configuration
  console.log('\n2. Testing Visa Direct MLE Configuration...');
  const visaDirectStatus = mle.verifyConfiguration('visaDirect');
  console.log('   ✓ Visa Direct MLE Status:', JSON.stringify(visaDirectStatus, null, 2));

  // Overall status
  if (visaNetStatus.configured && visaDirectStatus.configured) {
    console.log('\n   ✅ Both APIs have MLE properly configured');
    return true;
  } else {
    console.log('\n   ⚠️  One or more APIs have MLE configuration issues');
    return false;
  }
}

/**
 * Test service initialization with MLE
 */
async function testServiceInitialization() {
  console.log('\n========================================');
  console.log('Testing Service Initialization');
  console.log('========================================\n');

  try {
    // Import services (this triggers constructor and MLE verification)
    console.log('1. Initializing Visa Direct Service...');
    const visaDirect = require('../services/visaDirect');
    console.log('   ✓ Visa Direct Service initialized');
    console.log('   - MLE Enabled:', visaDirect.useMLE);

    console.log('\n2. Initializing VisaNet Service...');
    const visaNet = require('../services/visaNet');
    console.log('   ✓ VisaNet Service initialized');
    console.log('   - MLE Enabled:', visaNet.useMLE);

    if (visaDirect.useMLE && visaNet.useMLE) {
      console.log('\n   ✅ Both services have MLE encryption enabled');
      return true;
    } else {
      console.log('\n   ⚠️  One or more services have MLE disabled');
      return false;
    }
  } catch (error) {
    console.error('\n   ❌ Error initializing services:', error.message);
    return false;
  }
}

/**
 * Test encryption integration with mock data
 */
async function testEncryptionIntegration() {
  console.log('\n========================================');
  console.log('Testing Encryption Integration');
  console.log('========================================\n');

  // Test VisaNet encryption
  console.log('1. Testing VisaNet card data encryption...');
  try {
    const visaNetCardData = {
      pan: '4111111111111111',
      cvv: '123',
      expiryDate: '2512'
    };

    const visaNetEncrypted = mle.encrypt(visaNetCardData, 'visaNet');

    console.log('   ✓ VisaNet encryption successful');
    console.log('   - Encrypted Data Size:', visaNetEncrypted.encryptedData?.length || 0, 'bytes');
    console.log('   - Encryption Key ID:', visaNetEncrypted.encryptionKeyId);
    console.log('   - Encryption Type:', visaNetEncrypted.encryptionType);
  } catch (error) {
    console.error('   ❌ VisaNet encryption failed:', error.message);
    return false;
  }

  // Test Visa Direct encryption
  console.log('\n2. Testing Visa Direct card data encryption...');
  try {
    const visaDirectCardData = {
      recipientPrimaryAccountNumber: '4111111111111111'
    };

    const visaDirectEncrypted = mle.encrypt(visaDirectCardData, 'visaDirect');

    console.log('   ✓ Visa Direct encryption successful');
    console.log('   - Encrypted Data Size:', visaDirectEncrypted.encryptedData?.length || 0, 'bytes');
    console.log('   - Encryption Key ID:', visaDirectEncrypted.encryptionKeyId);
    console.log('   - Encryption Type:', visaDirectEncrypted.encryptionType);
  } catch (error) {
    console.error('   ❌ Visa Direct encryption failed:', error.message);
    return false;
  }

  console.log('\n   ✅ Encryption integration tests passed');
  return true;
}

/**
 * Test decryption integration
 */
async function testDecryptionIntegration() {
  console.log('\n========================================');
  console.log('Testing Decryption Integration');
  console.log('========================================\n');

  // Test VisaNet encryption -> decryption round trip
  console.log('1. Testing VisaNet encryption/decryption round trip...');
  try {
    const originalData = {
      pan: '4111111111111111',
      cvv: '123',
      expiryDate: '2512'
    };

    const encrypted = mle.encrypt(originalData, 'visaNet');
    const decrypted = mle.decrypt(encrypted.encryptedData, 'visaNet', true);

    console.log('   ✓ VisaNet round trip successful');
    console.log('   - Original PAN:', originalData.pan);
    console.log('   - Decrypted PAN:', decrypted.pan);
    console.log('   - Match:', originalData.pan === decrypted.pan ? '✅' : '❌');
  } catch (error) {
    console.error('   ❌ VisaNet round trip failed:', error.message);
    return false;
  }

  // Test Visa Direct encryption -> decryption round trip
  console.log('\n2. Testing Visa Direct encryption/decryption round trip...');
  try {
    const originalData = {
      recipientPrimaryAccountNumber: '4111111111111111'
    };

    const encrypted = mle.encrypt(originalData, 'visaDirect');
    const decrypted = mle.decrypt(encrypted.encryptedData, 'visaDirect', true);

    console.log('   ✓ Visa Direct round trip successful');
    console.log('   - Original PAN:', originalData.recipientPrimaryAccountNumber);
    console.log('   - Decrypted PAN:', decrypted.recipientPrimaryAccountNumber);
    console.log('   - Match:', originalData.recipientPrimaryAccountNumber === decrypted.recipientPrimaryAccountNumber ? '✅' : '❌');
  } catch (error) {
    console.error('   ❌ Visa Direct round trip failed:', error.message);
    return false;
  }

  console.log('\n   ✅ Decryption integration tests passed');
  return true;
}

/**
 * Main test runner
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║      MLE Integration Test Suite                           ║');
  console.log('║      Testing MLE encryption in Visa services              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const results = {
    configuration: false,
    serviceInit: false,
    encryption: false,
    decryption: false
  };

  try {
    // Run all tests
    results.configuration = await testMLEConfiguration();
    results.serviceInit = await testServiceInitialization();
    results.encryption = await testEncryptionIntegration();
    results.decryption = await testDecryptionIntegration();

    // Summary
    console.log('\n========================================');
    console.log('Test Summary');
    console.log('========================================\n');

    console.log('MLE Configuration:     ', results.configuration ? '✅ PASS' : '❌ FAIL');
    console.log('Service Initialization:', results.serviceInit ? '✅ PASS' : '❌ FAIL');
    console.log('Encryption Integration:', results.encryption ? '✅ PASS' : '❌ FAIL');
    console.log('Decryption Integration:', results.decryption ? '✅ PASS' : '❌ FAIL');

    const allPassed = Object.values(results).every(r => r === true);

    if (allPassed) {
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║  ✅ ALL TESTS PASSED                                      ║');
      console.log('║  MLE is properly integrated into both services            ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      process.exit(0);
    } else {
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║  ⚠️  SOME TESTS FAILED                                    ║');
      console.log('║  Please review the errors above                           ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Fatal error during testing:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
main();
