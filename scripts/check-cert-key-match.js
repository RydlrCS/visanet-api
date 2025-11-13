#!/usr/bin/env node

/**
 * Certificate and Key Matching Checker
 * Helps identify which certificate matches which private key
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, '..', 'certs');

console.log('🔍 Checking certificate and key matching...\n');

// Find all certificate files
const certFiles = fs.readdirSync(certsDir)
  .filter(f => f.endsWith('.pem') || f.endsWith('.crt'))
  .filter(f => !f.includes('Root') && !f.includes('Inter') && !f.includes('CA') && !f.includes('privateKey'));

// Find all private key files
const keyFiles = fs.readdirSync(certsDir)
  .filter(f => f.includes('privateKey') || f === 'key.pem');

console.log(`Found ${certFiles.length} certificate(s):`);
certFiles.forEach(f => console.log(`  - ${f}`));

console.log(`\nFound ${keyFiles.length} private key(s):`);
keyFiles.forEach(f => console.log(`  - ${f}`));

console.log('\n📝 Certificate Details:\n');

certFiles.forEach(certFile => {
  const certPath = path.join(certsDir, certFile);
  try {
    const modulus = execSync(`openssl x509 -noout -modulus -in "${certPath}" | openssl md5`, { encoding: 'utf8' }).trim();
    const subject = execSync(`openssl x509 -noout -subject -in "${certPath}"`, { encoding: 'utf8' }).trim();
    const dates = execSync(`openssl x509 -noout -dates -in "${certPath}"`, { encoding: 'utf8' }).trim();

    console.log(`Certificate: ${certFile}`);
    console.log(`  ${subject}`);
    console.log(`  ${dates.split('\n')[0]}`);
    console.log(`  ${dates.split('\n')[1]}`);
    console.log(`  Modulus MD5: ${modulus.replace('(stdin)= ', '')}`);
    console.log('');
  } catch (error) {
    console.log(`Certificate: ${certFile}`);
    console.log(`  ❌ Error reading: ${error.message}`);
    console.log('');
  }
});

console.log('🔑 Private Key Details:\n');

keyFiles.forEach(keyFile => {
  const keyPath = path.join(certsDir, keyFile);
  try {
    const modulus = execSync(`openssl rsa -noout -modulus -in "${keyPath}" 2>/dev/null | openssl md5`, { encoding: 'utf8' }).trim();
    const keyCheck = execSync(`openssl rsa -noout -check -in "${keyPath}" 2>&1 | head -1`, { encoding: 'utf8' }).trim();

    console.log(`Private Key: ${keyFile}`);
    console.log(`  Check: ${keyCheck}`);
    console.log(`  Modulus MD5: ${modulus.replace('(stdin)= ', '')}`);
    console.log('');
  } catch (error) {
    console.log(`Private Key: ${keyFile}`);
    console.log(`  ❌ Error reading: ${error.message}`);
    console.log('');
  }
});

console.log('🔗 Matching Analysis:\n');

certFiles.forEach(certFile => {
  const certPath = path.join(certsDir, certFile);
  try {
    const certModulus = execSync(`openssl x509 -noout -modulus -in "${certPath}" | openssl md5`, { encoding: 'utf8' }).trim().replace('(stdin)= ', '');

    let matched = false;
    keyFiles.forEach(keyFile => {
      const keyPath = path.join(certsDir, keyFile);
      try {
        const keyModulus = execSync(`openssl rsa -noout -modulus -in "${keyPath}" 2>/dev/null | openssl md5`, { encoding: 'utf8' }).trim().replace('(stdin)= ', '');

        if (certModulus === keyModulus) {
          console.log(`✅ MATCH: ${certFile} ↔ ${keyFile}`);
          matched = true;
        }
      } catch (error) {
        // Skip invalid keys
      }
    });

    if (!matched) {
      console.log(`❌ NO MATCH: ${certFile} (no matching private key found)`);
    }
  } catch (error) {
    // Skip invalid certs
  }
});

console.log('\n💡 Recommendation:');
console.log('If no matches are found, you need to:');
console.log('1. Download the certificate from Visa Developer Portal that matches the private key');
console.log('2. Or generate a new certificate pair in the Visa portal');
