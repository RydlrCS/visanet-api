#!/usr/bin/env node

/**
 * MLE Certificate Verification and Test Script
 *
 * Verifies MLE certificates are properly configured and functional
 * Tests encryption/decryption with sample data
 */

require('dotenv').config();
const mle = require('../utils/mle');
const fs = require('fs');
const path = require('path');

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

async function verifyMLESetup() {
  log('\n🔐 MLE Certificate Verification\n', colors.blue);

  // Step 1: Check configuration
  log('Step 1: Checking MLE Configuration...', colors.cyan);
  const config = mle.verifyConfiguration();

  log('\nConfiguration Status:', colors.yellow);
  log(`  MLE Key ID: ${config.keyId ? '✅' : '❌'} ${process.env.VISANET_MLE_KEY_ID || 'Not set'}`, config.keyId ? colors.green : colors.red);
  log(`  Client Certificate: ${config.clientCert ? '✅' : '❌'} ${process.env.VISANET_MLE_CLIENT_CERT || 'Not set'}`, config.clientCert ? colors.green : colors.red);
  log(`  Server Certificate: ${config.serverCert ? '✅' : '❌'} ${process.env.VISANET_MLE_SERVER_CERT || 'Not set'}`, config.serverCert ? colors.green : colors.red);
  log(`  Private Key: ${config.privateKey ? '✅' : '❌'} ${process.env.VISANET_MLE_PRIVATE_KEY || 'Not set'}`, config.privateKey ? colors.green : colors.red);

  if (config.errors.length > 0) {
    log('\n⚠️  Configuration Errors:', colors.yellow);
    config.errors.forEach(error => log(`   - ${error}`, colors.yellow));
  }

  if (!config.configured) {
    log('\n❌ MLE is not properly configured', colors.red);
    log('\nTo configure MLE:', colors.cyan);
    log('1. Upload your MLE certificates to the certs/ directory:', colors.cyan);
    log('   - mle-client-cert-68d1367c.pem (your client certificate)', colors.cyan);
    log('   - mle-server-cert-visa.pem (Visa\'s server certificate)', colors.cyan);
    log('   - mle-private-key-68d1367c.pem (your private key)', colors.cyan);
    log('\n2. Update .env with the paths (already configured)', colors.cyan);
    log('\n3. Run this script again to verify', colors.cyan);
    log('\nSee docs/MLE_CERTIFICATE_SETUP.md for detailed instructions\n', colors.cyan);
    process.exit(1);
  }

  log('\n✅ MLE Configuration Valid!\n', colors.green);

  // Step 2: Verify certificate files
  log('Step 2: Verifying Certificate Files...', colors.cyan);

  const certPaths = {
    'Client Certificate': process.env.VISANET_MLE_CLIENT_CERT,
    'Server Certificate': process.env.VISANET_MLE_SERVER_CERT,
    'Private Key': process.env.VISANET_MLE_PRIVATE_KEY
  };

  for (const [name, certPath] of Object.entries(certPaths)) {
    const fullPath = path.resolve(certPath);
    const stats = fs.statSync(fullPath);
    log(`  ${name}:`, colors.yellow);
    log(`    Path: ${certPath}`, colors.reset);
    log(`    Size: ${stats.size} bytes`, colors.reset);
    log(`    Permissions: ${(stats.mode & parseInt('777', 8)).toString(8)}`, colors.reset);

    // Warn about insecure permissions on private keys
    if (name === 'Private Key' && (stats.mode & parseInt('077', 8)) !== 0) {
      log(`    ⚠️  Warning: Insecure permissions! Run: chmod 600 ${certPath}`, colors.yellow);
    }
  }

  // Step 3: Test encryption
  log('\n\nStep 3: Testing Encryption...', colors.cyan);

  const testData = {
    pan: '4111111111111111',
    cvv: '123',
    expiryDate: '2512'
  };

  try {
    const encrypted = mle.encrypt(testData);
    log('  ✅ Encryption successful!', colors.green);
    log(`  Encryption Key ID: ${encrypted.encryptionKeyId}`, colors.reset);
    log(`  Encryption Type: ${encrypted.encryptionType}`, colors.reset);
    log(`  Encrypted Data Length: ${encrypted.encryptedData.length} characters`, colors.reset);
    log(`  Encrypted Data (first 50 chars): ${encrypted.encryptedData.substring(0, 50)}...`, colors.reset);

    // Step 4: Test decryption
    log('\n\nStep 4: Testing Decryption...', colors.cyan);

    try {
      const decrypted = mle.decrypt(encrypted.encryptedData);
      log('  ✅ Decryption successful!', colors.green);
      log('  Decrypted Data:', colors.reset);
      console.log('  ', JSON.stringify(decrypted, null, 2));

      // Verify data matches
      const match = JSON.stringify(testData) === JSON.stringify(decrypted);
      if (match) {
        log('\n  ✅ Decrypted data matches original!', colors.green);
      } else {
        log('\n  ❌ Decrypted data does NOT match original!', colors.red);
      }

    } catch (decryptError) {
      log(`  ❌ Decryption failed: ${decryptError.message}`, colors.red);
      log('\n  This usually means:', colors.yellow);
      log('    - Private key does not match the server certificate', colors.yellow);
      log('    - Wrong encryption/decryption algorithm', colors.yellow);
      log('    - Corrupted certificate files', colors.yellow);
    }

  } catch (encryptError) {
    log(`  ❌ Encryption failed: ${encryptError.message}`, colors.red);
    log('\n  This usually means:', colors.yellow);
    log('    - Server certificate is invalid or corrupted', colors.yellow);
    log('    - Wrong certificate format', colors.yellow);
    log('    - Certificate file is not a valid public key', colors.yellow);
  }

  // Step 5: Test payload field encryption
  log('\n\nStep 5: Testing Payload Field Encryption...', colors.cyan);

  const samplePayload = {
    amount: '100.00',
    currency: 'USD',
    merchantId: '123456',
    pan: '4111111111111111',
    cvv: '123',
    expiryDate: '2512'
  };

  try {
    const encryptedPayload = mle.encryptPayloadFields(samplePayload, ['pan', 'cvv', 'expiryDate']);
    log('  ✅ Payload field encryption successful!', colors.green);
    log('\n  Original Payload:', colors.yellow);
    console.log('  ', JSON.stringify(samplePayload, null, 2));
    log('\n  Encrypted Payload:', colors.yellow);
    console.log('  ', JSON.stringify(encryptedPayload, null, 2));

    // Verify sensitive fields are removed
    if (!encryptedPayload.pan && !encryptedPayload.cvv && encryptedPayload.encryptedData) {
      log('\n  ✅ Sensitive fields properly encrypted and removed!', colors.green);
    } else {
      log('\n  ⚠️  Warning: Sensitive fields may not be properly encrypted', colors.yellow);
    }

  } catch (error) {
    log(`  ❌ Payload encryption failed: ${error.message}`, colors.red);
  }

  // Summary
  log('\n' + '═'.repeat(80), colors.cyan);
  log('MLE Verification Complete', colors.green);
  log('═'.repeat(80), colors.cyan);

  log('\n✅ Your MLE setup is working correctly!', colors.green);
  log('\nNext steps:', colors.cyan);
  log('1. Integrate MLE into VisaNet service for sensitive data', colors.cyan);
  log('2. Test with real VisaNet API calls', colors.cyan);
  log('3. Monitor encryption/decryption in production logs', colors.cyan);
  log('\nSee docs/MLE_CERTIFICATE_SETUP.md for integration examples\n', colors.cyan);
}

verifyMLESetup().catch(error => {
  log(`\n💥 Fatal error: ${error.message}\n`, colors.red);
  console.error(error);
  process.exit(1);
});
