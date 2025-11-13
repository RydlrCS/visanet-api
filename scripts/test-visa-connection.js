#!/usr/bin/env node

/**
 * Visa API Connection Test Script
 * Tests connectivity and authentication with Visa Developer Platform
 */

require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

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

function checkEnvVar(name, required = true) {
  const value = process.env[name];
  if (!value || value.includes('your_')) {
    if (required) {
      log(`✗ ${name} is not configured`, 'red');
      return false;
    }
    log(`⚠ ${name} is not configured (optional)`, 'yellow');
    return true;
  }
  log(`✓ ${name} is configured`, 'green');
  return true;
}

function checkFile(filePath, name) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    log(`✗ ${name} not found at: ${fullPath}`, 'red');
    return false;
  }
  
  const stats = fs.statSync(fullPath);
  const permissions = (stats.mode & parseInt('777', 8)).toString(8);
  
  if (permissions !== '600') {
    log(`⚠ ${name} has permissions ${permissions}, should be 600`, 'yellow');
    log(`  Run: chmod 600 ${filePath}`, 'cyan');
  } else {
    log(`✓ ${name} found with correct permissions`, 'green');
  }
  
  return true;
}

async function testVisaConnection() {
  log('\n========================================', 'cyan');
  log('  Visa API Connection Test', 'cyan');
  log('========================================\n', 'cyan');

  // Step 1: Check environment variables
  log('Step 1: Checking Environment Variables...', 'blue');
  const envChecks = [
    checkEnvVar('VISA_API_URL'),
    checkEnvVar('VISA_USER_ID'),
    checkEnvVar('VISA_PASSWORD'),
    checkEnvVar('VISA_CERT_PATH'),
    checkEnvVar('VISA_KEY_PATH'),
    checkEnvVar('VISA_CA_PATH'),
    checkEnvVar('WEBHOOK_URL'),
    checkEnvVar('WEBHOOK_SECRET'),
    checkEnvVar('VISA_ACQUIRING_BIN', false),
    checkEnvVar('VISA_MERCHANT_ID', false)
  ];

  if (!envChecks.every(check => check)) {
    log('\n✗ Environment configuration incomplete', 'red');
    log('Please update your .env file with Visa API credentials', 'yellow');
    log('See VISA_SETUP_GUIDE.md for instructions', 'cyan');
    process.exit(1);
  }

  console.log('');

  // Step 2: Check certificate files
  log('Step 2: Checking Certificate Files...', 'blue');
  const certChecks = [
    checkFile(process.env.VISA_CERT_PATH, 'Client Certificate'),
    checkFile(process.env.VISA_KEY_PATH, 'Private Key'),
    checkFile(process.env.VISA_CA_PATH, 'CA Certificate')
  ];

  if (!certChecks.every(check => check)) {
    log('\n✗ Certificate files missing', 'red');
    log('Please download certificates from Visa Developer Portal', 'yellow');
    log('See VISA_SETUP_GUIDE.md for instructions', 'cyan');
    process.exit(1);
  }

  console.log('');

  // Step 3: Test API connection
  log('Step 3: Testing Visa API Connection...', 'blue');
  
  try {
    // Read certificates
    const cert = fs.readFileSync(path.resolve(process.env.VISA_CERT_PATH));
    const key = fs.readFileSync(path.resolve(process.env.VISA_KEY_PATH));
    const ca = fs.readFileSync(path.resolve(process.env.VISA_CA_PATH));

    // Create HTTPS agent with certificates
    const httpsAgent = new https.Agent({
      cert: cert,
      key: key,
      ca: ca,
      rejectUnauthorized: true
    });

    // Create Basic Auth header
    const auth = Buffer.from(
      `${process.env.VISA_USER_ID}:${process.env.VISA_PASSWORD}`
    ).toString('base64');

    // Test endpoint (health check or simple query)
    const url = new URL('/visadirect/fundstransfer/v1/pushfundstransactions', process.env.VISA_API_URL);

    const options = {
      method: 'GET',
      hostname: url.hostname,
      path: url.pathname,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      agent: httpsAgent
    };

    log(`Testing connection to: ${process.env.VISA_API_URL}`, 'cyan');
    
    const req = https.request(options, (res) => {
      log(`Response Status: ${res.statusCode}`, res.statusCode === 200 ? 'green' : 'yellow');
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('');
        if (res.statusCode === 200 || res.statusCode === 401) {
          log('✓ Connection successful!', 'green');
          if (res.statusCode === 401) {
            log('⚠ Authentication failed - check your credentials', 'yellow');
            log('  Make sure you\'re using API credentials, not portal login', 'cyan');
          } else {
            log('✓ Authentication successful!', 'green');
          }
        } else if (res.statusCode === 404 || res.statusCode === 405) {
          log('✓ Connection established (endpoint method not allowed for GET)', 'green');
          log('  This is expected - use POST for actual transactions', 'cyan');
        } else {
          log(`⚠ Unexpected response: ${res.statusCode}`, 'yellow');
          if (data) {
            log(`Response: ${data}`, 'yellow');
          }
        }

        console.log('');
        log('========================================', 'cyan');
        log('  Test Complete', 'cyan');
        log('========================================\n', 'cyan');

        if (res.statusCode === 200 || res.statusCode === 404 || res.statusCode === 405) {
          log('Next Steps:', 'green');
          log('1. Your Visa API connection is working!', 'green');
          log('2. Start the development server: npm run dev', 'cyan');
          log('3. Test the API endpoints with Postman', 'cyan');
          log('4. Review VISA_SETUP_GUIDE.md for webhook setup\n', 'cyan');
        } else {
          log('Action Required:', 'yellow');
          log('1. Verify your API credentials in .env', 'cyan');
          log('2. Check VISA_SETUP_GUIDE.md for help', 'cyan');
          log('3. Login to https://developer.visa.com', 'cyan');
          log('4. Get correct User ID and Password from dashboard\n', 'cyan');
        }
      });
    });

    req.on('error', (error) => {
      log('\n✗ Connection failed', 'red');
      log(`Error: ${error.message}`, 'red');
      
      if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        log('\nPossible causes:', 'yellow');
        log('- CA certificate is incorrect', 'yellow');
        log('- Certificate chain is incomplete', 'yellow');
        log('- Using production cert with sandbox URL (or vice versa)', 'yellow');
      } else if (error.code === 'ENOTFOUND') {
        log('\nPossible causes:', 'yellow');
        log('- VISA_API_URL is incorrect', 'yellow');
        log('- No internet connection', 'yellow');
      } else if (error.code === 'EACCES') {
        log('\nPossible causes:', 'yellow');
        log('- Certificate file permissions are too restrictive', 'yellow');
        log('- Run: chmod 600 ./certs/*.pem', 'cyan');
      }
      
      log('\nSee VISA_SETUP_GUIDE.md for troubleshooting\n', 'cyan');
      process.exit(1);
    });

    req.end();

  } catch (error) {
    log('\n✗ Test failed', 'red');
    log(`Error: ${error.message}`, 'red');
    
    if (error.code === 'ENOENT') {
      log('\nCertificate file not found', 'yellow');
      log('Download certificates from Visa Developer Portal', 'cyan');
    }
    
    log('See VISA_SETUP_GUIDE.md for help\n', 'cyan');
    process.exit(1);
  }
}

// Run the test
testVisaConnection();
