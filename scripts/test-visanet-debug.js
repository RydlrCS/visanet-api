#!/usr/bin/env node

/**
 * VisaNet Connect API Connection Test - DEBUG VERSION
 * Tests with rejectUnauthorized: false to isolate cert/key vs CA issues
 */

require('dotenv').config();
const fs = require('fs');
const https = require('https');
const path = require('path');

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

console.log('\n🔓 VisaNet Connect API DEBUG Test (rejectUnauthorized: false)\n');

const certFiles = {
  cert: process.env.VISA_CERT_PATH || './certs/cert.pem',
  key: process.env.VISA_KEY_PATH || './certs/key.pem'
};

const cert = fs.readFileSync(path.resolve(certFiles.cert));
const key = fs.readFileSync(path.resolve(certFiles.key));

const agent = new https.Agent({
  cert,
  key,
  rejectUnauthorized: false  // DEBUG ONLY - bypasses CA validation
});

log('✅ HTTPS agent created (WARNING: CA validation disabled)', colors.yellow);

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
      acqrrId: process.env.VISANET_USER_ID,
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

const url = `${process.env.VISA_API_URL}/acs/v3/payments/authorizations`;

log(`\nTesting: ${url}\n`, colors.cyan);

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

  log(`Response status: ${res.statusCode} ${res.statusMessage}`, colors.cyan);

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      if (data) {
        const jsonData = JSON.parse(data);

        if (res.statusCode === 200 || res.statusCode === 201) {
          log('\n✅ SUCCESS: Connection and authentication working!', colors.green);
          log('\n📊 Response:', colors.green);
          console.log(JSON.stringify(jsonData, null, 2));
        } else if (res.statusCode === 400) {
          log('\n⚠️  Connection works! (400 = bad request data, expected for test)', colors.yellow);
          log('\n📊 Response:', colors.yellow);
          console.log(JSON.stringify(jsonData, null, 2));
          log('\n✅ Certificate, key, and authentication are VALID!', colors.green);
          log('⚠️  Issue is CA chain validation only. Fix ca.pem for production.', colors.yellow);
        } else if (res.statusCode === 401) {
          log('\n❌ Authentication failed - check credentials', colors.red);
          log('\n📊 Response:', colors.red);
          console.log(JSON.stringify(jsonData, null, 2));
        } else {
          log(`\n⚠️  Status: ${res.statusCode}`, colors.yellow);
          log('\n📊 Response:', colors.yellow);
          console.log(JSON.stringify(jsonData, null, 2));
        }
      } else {
        log(`\n⚠️  No response data (status: ${res.statusCode})`, colors.yellow);
      }
    } catch (error) {
      log(`\n❌ Failed to parse response: ${error.message}`, colors.red);
      log('\nRaw response:', colors.yellow);
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  log(`\n❌ Connection error: ${error.message}`, colors.red);
  log(`Error code: ${error.code}`, colors.red);

  if (error.code === 'ECONNREFUSED') {
    log('\n💡 Connection refused - check VISA_API_URL', colors.cyan);
  } else if (error.code === 'ENOTFOUND') {
    log('\n💡 Host not found - check VISA_API_URL', colors.cyan);
  }

  process.exit(1);
});

req.write(JSON.stringify(testRequest));
req.end();
