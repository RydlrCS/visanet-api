# X-Pay-Token Setup Guide

## Overview

The `x-pay-token` is a security mechanism used by Visa APIs that requires:
1. **Public/Private Key Pair** - For encrypting the shared secret
2. **Shared Secret** - Provided by Visa after you submit your public key
3. **Dynamic Token Generation** - Generate a new x-pay-token for each API request

## Step 1: Extract Your Public Key

Your public key has been extracted from your private key and saved to:
```
/Users/ted/git clone repos/visanet-api/certs/public-c70ff121.pem
```

**Public Key Content:**
```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA16tsqEvTlJHWRwfwX6fu
xt61MZLVZEbZUISpTvTTIj+LcIVg/4Jui/6jDAAmtrg9i2Z6HEUjWFGUeNtrC3yB
GLGrWhL1sDOCmTPIk2iIjKEZ/dKk6PTZULCd6SF27gl68bhZieyhPCqP2z9KS/hV
uhTTq1DlbCzrp7auPGeEckqlOnBKgTKE1g1zN8Py6f95qe+HYp2H1nxGM11/2oG6
Iap3TUT9U0tPl3+D0FhS0OuGRloYJu6VyewDCnLaqsmRzPKABsoFSNxJRByyjiyS
zW4VWNWPnefDf4exldjxgPUyzNSGI/iriodOQI79i/b4tl4RxI8IfQWuwIim1piS
4wIDAQAB
-----END PUBLIC KEY-----
```

## Step 2: Submit Public Key to Visa Developer Portal

1. **Log into Visa Developer Portal:**
   - URL: https://developer.visa.com/portal/app/v2/c70ff121-977b-4872-9b69-550b1c281755/SBX
   - Email: locapaylimited@gmail.com
   - Password: Locapay$1999

2. **Navigate to MLE (Message Level Encryption) Configuration:**
   - Go to your project dashboard
   - Look for "Security" → "Message Level Encryption" or "X-Pay-Token Setup"
   - Or check "Project Settings" → "Encryption Keys"

3. **Upload Your Public Key:**
   - Click "Add Public Key" or "Register Public Key"
   - Copy the content from `certs/public-c70ff121.pem`
   - Paste it into the form
   - Submit

4. **Download Encrypted Shared Secret:**
   - After submitting your public key, Visa will provide an encrypted shared secret
   - Download this file (usually named something like `shared_secret.enc` or `shared_secret.dat`)
   - Save it to: `certs/shared_secret.enc`

## Step 3: Decrypt the Shared Secret

Once you've downloaded the encrypted shared secret from Visa:

```bash
cd "/Users/ted/git clone repos/visanet-api"

# Decrypt the shared secret using your private key
node -e "
const crypto = require('crypto');
const fs = require('fs');

const privateKey = fs.readFileSync('./certs/privateKey-c70ff121-977b-4872-9b69-550b1c281755.pem');
const encryptedSecret = fs.readFileSync('./certs/shared_secret.enc');

const decrypted = crypto.privateDecrypt(
  {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  },
  encryptedSecret
);

const sharedSecret = decrypted.toString('base64');
console.log('Shared Secret (base64):', sharedSecret);
console.log('\\nAdd this to your .env file as:');
console.log('VISA_SHARED_SECRET=' + sharedSecret);
"
```

## Step 4: Update .env File

Add the decrypted shared secret to your `.env` file:

```bash
# X-Pay-Token Configuration
VISA_SHARED_SECRET=<base64_shared_secret_from_step_3>
VISA_MLE_PRIVATE_KEY_PATH=./certs/privateKey-c70ff121-977b-4872-9b69-550b1c281755.pem
VISA_MLE_KEY_ID=c70ff121-977b-4872-9b69-550b1c281755
```

## Step 5: Generate X-Pay-Token for API Requests

The x-pay-token must be generated dynamically for **each API request**. Use the utility:

```javascript
const xpay = require('./utils/xpay');

// Example: Generate x-pay-token for a push funds request
const resourcePath = '/visadirect/fundstransfer/v1/pushfundstransactions';
const queryString = '';  // Empty if no query params
const requestBody = {
  acquiringBin: "408999",
  amount: "100.00",
  // ... rest of your request body
};

const headers = xpay.generateHeaders(resourcePath, queryString, requestBody);

console.log('Headers:', headers);
// Output:
// {
//   'x-pay-token': 'a1b2c3d4e5f6...',  // HMAC-SHA256 hash
//   'x-v-datetime': '1699876543',       // Unix timestamp
//   'Content-Type': 'application/json',
//   'Accept': 'application/json'
// }
```

## Step 6: Update Visa Services to Use X-Pay-Token

The services need to be updated to include x-pay-token headers:

```javascript
// In services/visaDirect.js or services/visaNet.js
const xpay = require('../utils/xpay');

// When making a request:
const headers = {
  ...xpay.generateHeaders(endpoint, '', payload),
  'Authorization': `Basic ${authString}`
};
```

## Important Notes

### Security
- **NEVER commit** your private key or shared secret to git
- Add `shared_secret.enc` to `.gitignore`
- Keep `VISA_SHARED_SECRET` only in `.env` (which is already gitignored)

### Token Generation
- x-pay-token is **NOT reusable** - generate a new one for each request
- The token includes a timestamp, so it expires quickly
- The signature includes the full request payload, so it's request-specific

### Key Association
- **MLE Key ID**: `c70ff121-977b-4872-9b69-550b1c281755` (matches your project ID)
- **Private Key**: `privateKey-c70ff121-977b-4872-9b69-550b1c281755.pem`
- **Public Key**: `public-c70ff121.pem` (generated from private key)

### Not the Same As Basic Auth
- x-pay-token is **in addition to** Basic Authentication
- You still need `Authorization: Basic <base64(userId:password)>`
- x-pay-token provides message integrity and prevents replay attacks

## Troubleshooting

### "Invalid x-pay-token" Error
- Verify your shared secret is correctly decrypted
- Ensure timestamp is current (not old)
- Check that resourcePath matches exactly (including leading /)
- Verify request body is serialized the same way when generating token vs sending request

### "Shared secret not found" Error
- Make sure `VISA_SHARED_SECRET` is set in `.env`
- Restart your application after updating `.env`
- Verify the shared secret was decrypted correctly

### Public Key Submission Failed
- Ensure the public key is in PEM format
- Check that it starts with `-----BEGIN PUBLIC KEY-----`
- Verify you're submitting to the correct project

## Testing

Test the x-pay-token generation:

```bash
node -e "
require('dotenv').config();
const xpay = require('./utils/xpay');

const { xPayToken, timestamp } = xpay.generateXPayToken(
  '/visadirect/fundstransfer/v1/pushfundstransactions',
  '',
  { test: 'payload' }
);

console.log('X-Pay-Token:', xPayToken);
console.log('Timestamp:', timestamp);
"
```

## Next Steps

1. ✅ Public key extracted → `certs/public-c70ff121.pem`
2. ⏳ Submit public key to Visa Developer Portal
3. ⏳ Download encrypted shared secret from portal
4. ⏳ Decrypt shared secret and add to `.env`
5. ⏳ Update Visa services to use x-pay-token
6. ⏳ Test API calls with x-pay-token authentication
