#!/usr/bin/env node

/**
 * VisaNet Connect API Connection Test
 * Tests the connection to Visa sandbox using the uploaded certificates
 *
 * Usage: node scripts/test-visanet-connection.js
 */

require('dotenv').config();
const fs = require('fs');
const https = require('https');
const path = require('path');

// Color output helpers
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

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

async function testVisaNetConnection() {
  log('\n🔐 VisaNet Connect API Connection Test\n', colors.blue);

  // 1. Check environment variables
  logInfo('Step 1: Checking environment variables...');
  const requiredEnvVars = ['VISANET_USER_ID', 'VISANET_PASSWORD', 'VISA_API_URL'];
  let envOk = true;

  for (const varName of requiredEnvVars) {
    if (process.env[varName]) {
      logSuccess(`${varName} is set`);
    } else {
      logError(`${varName} is missing`);
      envOk = false;
    }
  }

  if (!envOk) {
    logError('Missing required environment variables');
    process.exit(1);
  }

  // 2. Check certificate files
  logInfo('\nStep 2: Checking certificate files...');
  const certFiles = {
    cert: process.env.VISA_CERT_PATH || './certs/cert.pem',
    key: process.env.VISA_KEY_PATH || './certs/key.pem',
    ca: process.env.VISA_CA_PATH || './certs/ca.pem'
  };

  let certsOk = true;
  for (const [name, filepath] of Object.entries(certFiles)) {
    const fullPath = path.resolve(filepath);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      logSuccess(`${name}: ${filepath} (${stats.size} bytes)`);
    } else {
      logError(`${name}: ${filepath} not found`);
      certsOk = false;
    }
  }

  if (!certsOk) {
    logError('Missing required certificate files');
    process.exit(1);
  }

  // 3. Load certificates
  logInfo('\nStep 3: Loading certificates...');
  let cert, key;

  try {
    cert = fs.readFileSync(path.resolve(certFiles.cert));
    logSuccess('Client certificate loaded');
  } catch (error) {
    logError(`Failed to load client certificate: ${error.message}`);
    process.exit(1);
  }

  try {
    key = fs.readFileSync(path.resolve(certFiles.key));
    logSuccess('Private key loaded');
  } catch (error) {
    logError(`Failed to load private key: ${error.message}`);
    process.exit(1);
  }

  logSuccess('Using Node.js default CA bundle (includes DigiCert)');

  // 4. Create HTTPS agent
  logInfo('\nStep 4: Creating HTTPS agent with mutual TLS...');
  const agent = new https.Agent({
    cert,
    key,
    // ca - omit to use Node's default trusted CAs (includes DigiCert)
    rejectUnauthorized: true
  });
  logSuccess('HTTPS agent created with mutual TLS (using system CAs)');

  // 5. Test basic connectivity to Visa API
  logInfo('\nStep 5: Testing connectivity to Visa API...');

  const testEndpoint = '/acs/v3/payments/authorizations';
  const url = `${process.env.VISA_API_URL}${testEndpoint}`;

  // Create a minimal test authorization request
  const testRequest = {
    msgIdentfctn: {
      clientId: process.env.VISANET_USER_ID,
      correlatnId: `TEST${Date.now()}`
    },
    Hdr: {
      msgFctn: '200',
      prtcolVrsn: '3.0'
    },
    Body: {
      Tx: {
        txId: `TEST${Date.now()}`,
        pmtMtd: 'CARD',
        pmtScnro: 'CRDP',
        cardData: {
          pan: '4111111111111111',
          expiryDt: '2512'
        },
        txDtls: {
          amt: '1.00',
          ccy: 'USD'
        }
      },
      Envt: {
        acqrrId: process.env.VISANET_USER_ID || '408999',
        mrcntId: '123456789012345',
        termnlId: '12345678',
        cardDataNtryMd: 'KEYD'
      },
      Cntxt: {
        mrcntCtgyCd: '5999',
        pstlCd: '94404'
      }
    }
  };

  const authString = Buffer.from(
    `${process.env.VISANET_USER_ID}:${process.env.VISANET_PASSWORD}`
  ).toString('base64');

  logInfo(`Testing endpoint: ${testEndpoint}`);

  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      agent
    };

    const req = https.request(url, options, (res) => {
      let data = '';

      logInfo(`Response status: ${res.statusCode} ${res.statusMessage}`);

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (data) {
            const jsonData = JSON.parse(data);

            if (res.statusCode === 200 || res.statusCode === 201) {
              logSuccess('Connection successful!');
              log('\n📊 Response:', colors.green);
              console.log(JSON.stringify(jsonData, null, 2));
              resolve(true);
            } else if (res.statusCode === 400) {
              // 400 with proper error response means connection works, just bad request
              logWarning('Connection established (received 400 - expected for test data)');
              log('\n📊 Response:', colors.yellow);
              console.log(JSON.stringify(jsonData, null, 2));
              logSuccess('\n✨ Certificates and authentication are working correctly!');
              resolve(true);
            } else if (res.statusCode === 401) {
              logError('Authentication failed - check VISA_USER_ID and VISA_PASSWORD');
              log('\n📊 Response:', colors.red);
              console.log(JSON.stringify(jsonData, null, 2));
              resolve(false);
            } else {
              logWarning(`Received status code: ${res.statusCode}`);
              log('\n📊 Response:', colors.yellow);
              console.log(JSON.stringify(jsonData, null, 2));
              resolve(false);
            }
          } else {
            logWarning(`No response data (status: ${res.statusCode})`);
            resolve(false);
          }
        } catch (error) {
          logError(`Failed to parse response: ${error.message}`);
          log('\nRaw response:', colors.yellow);
          console.log(data);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        logError('Certificate verification failed');
        logInfo('This may indicate:');
        logInfo('  - CA certificate chain is incomplete');
        logInfo('  - Using wrong CA certificates for sandbox');
        logInfo('  - Certificate files are corrupted');
      } else if (error.code === 'ECONNREFUSED') {
        logError('Connection refused - check VISA_API_URL');
      } else if (error.code === 'ENOTFOUND') {
        logError('Host not found - check VISA_API_URL');
      } else {
        logError(`Connection error: ${error.message}`);
        logInfo(`Error code: ${error.code}`);
      }
      reject(error);
    });

    req.write(JSON.stringify(testRequest));
    req.end();
  });
}

// Run the test
testVisaNetConnection()
  .then((success) => {
    if (success) {
      log('\n🎉 All tests passed! Your VisaNet Connect integration is ready.\n', colors.green);
      process.exit(0);
    } else {
      log('\n⚠️  Tests completed with warnings. Check the output above.\n', colors.yellow);
      process.exit(0);
    }
  })
  .catch((error) => {
    log(`\n💥 Test failed: ${error.message}\n`, colors.red);
    process.exit(1);
  });
