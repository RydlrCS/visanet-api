# MLE (Message Level Encryption) Certificate Setup Guide

## What Are MLE Client and Server Certificates?

Message Level Encryption (MLE) is Visa's additional security layer that encrypts sensitive data in the payload. You have two types of certificates:

### 1. **Client Certificate** (your application uses this)
- **Purpose**: Encrypts sensitive payload data (PAN, CVV, etc.) before sending to Visa
- **Contains**: Your public key that Visa uses to verify encrypted data came from you
- **File naming**: Usually `mle_client_cert.pem` or similar
- **What to do**: Install in your application, reference in code

### 2. **Server Certificate** (Visa's public key)
- **Purpose**: You use this to decrypt responses from Visa (if they encrypt response data)
- **Contains**: Visa's public key for encrypting data that only Visa can decrypt
- **File naming**: Usually `mle_server_cert.pem` or `visa_public_key.pem`
- **What to do**: Install in your application for response decryption

## Your MLE Configuration

Based on your information:
- **MLE Key ID**: `68d1367c-6766-49fe-b8ef-bbc7d4763949`
- **Private Key**: `privateKey-68d1367c-6766-49fe-b8ef-bbc7d4763949.pem` (CORRUPTED - needs replacement)
- **Project**: VisaNet Connect

## Step-by-Step Setup

### Step 1: Organize Your Downloaded Certificates

When you download MLE certificates from Visa, you typically get:
- `client_cert.pem` or `mle_cert.pem` - Your client certificate
- `server_cert.pem` or `visa_server_cert.pem` - Visa's server certificate (their public key)
- Sometimes a private key file (if newly generated)

**Rename and place them in the certs directory:**

```bash
cd "/Users/ted/git clone repos/visanet-api/certs"

# If you have MLE client certificate:
cp ~/Downloads/client_cert.pem ./mle-client-cert-68d1367c.pem

# If you have Visa's server certificate:
cp ~/Downloads/server_cert.pem ./mle-server-cert-visa.pem

# If you have a new private key:
cp ~/Downloads/private_key.pem ./mle-private-key-68d1367c.pem

# Set secure permissions (private keys only)
chmod 600 ./mle-private-key-68d1367c.pem
```

### Step 2: Update .env Configuration

Add these to your `.env` file:

```bash
# MLE (Message Level Encryption) Configuration
VISANET_MLE_KEY_ID=68d1367c-6766-49fe-b8ef-bbc7d4763949
VISANET_MLE_CLIENT_CERT=./certs/mle-client-cert-68d1367c.pem
VISANET_MLE_PRIVATE_KEY=./certs/mle-private-key-68d1367c.pem
VISANET_MLE_SERVER_CERT=./certs/mle-server-cert-visa.pem
```

### Step 3: Verify Certificate Files

Check that your certificates are valid:

```bash
# Verify client certificate
openssl x509 -in certs/mle-client-cert-68d1367c.pem -noout -text

# Verify server certificate
openssl x509 -in certs/mle-server-cert-visa.pem -noout -text

# Verify private key (if you have it)
openssl rsa -in certs/mle-private-key-68d1367c.pem -check -noout
```

### Step 4: Extract Public Key (if needed)

If Visa asks you to submit a public key for MLE:

```bash
# Extract public key from your private key
openssl rsa -in certs/mle-private-key-68d1367c.pem -pubout -out certs/mle-public-key-68d1367c.pem

# Display it (to copy and submit to Visa portal)
cat certs/mle-public-key-68d1367c.pem
```

## MLE vs X-Pay-Token vs Mutual TLS

You now have THREE layers of security (all can work together):

| Security Layer | Purpose | What You Need | When Used |
|---------------|---------|---------------|-----------|
| **Mutual TLS** | Authenticates your application to Visa's server | Client cert + private key (cert.pem, key.pem) | Every HTTPS connection |
| **X-Pay-Token** | Prevents replay attacks, ensures message integrity | Shared secret (VISA_SHARED_SECRET) | Every API request (header) |
| **MLE** | Encrypts sensitive payload data (PAN, CVV) | MLE client cert + private key + server cert | When sending/receiving sensitive data |

### How They Work Together:

1. **Mutual TLS** establishes the secure connection
2. **X-Pay-Token** is added to request headers to verify message integrity
3. **MLE** encrypts sensitive fields in the request body (like card numbers)

## Using MLE in Your Code

### Encrypt Sensitive Data Before Sending

```javascript
const crypto = require('crypto');
const fs = require('fs');

function encryptWithMLE(sensitiveData, keyId) {
  // Load Visa's server certificate (their public key)
  const serverCert = fs.readFileSync(process.env.VISANET_MLE_SERVER_CERT);
  
  // Encrypt data with Visa's public key
  const encrypted = crypto.publicEncrypt(
    {
      key: serverCert,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(JSON.stringify(sensitiveData))
  );
  
  return {
    encryptedData: encrypted.toString('base64'),
    encryptionKeyId: keyId
  };
}

// Example: Encrypt PAN before sending
const encryptedPayload = encryptWithMLE({
  pan: '4111111111111111',
  expiryDate: '2512',
  cvv: '123'
}, process.env.VISANET_MLE_KEY_ID);
```

### Decrypt Visa's Response

```javascript
function decryptMLEResponse(encryptedData) {
  // Load your private key
  const privateKey = fs.readFileSync(process.env.VISANET_MLE_PRIVATE_KEY);
  
  // Decrypt data with your private key
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(encryptedData, 'base64')
  );
  
  return JSON.parse(decrypted.toString());
}
```

## Common Issues

### Issue: "privateKey-68d1367c-6766-49fe-b8ef-bbc7d4763949.pem is corrupted"

**Solution**: Download a fresh copy from Visa portal or generate a new key pair:

```bash
# Generate new private key
openssl genrsa -out certs/mle-private-key-68d1367c.pem 2048

# Extract public key
openssl rsa -in certs/mle-private-key-68d1367c.pem -pubout -out certs/mle-public-key-68d1367c.pem

# Submit the public key to Visa portal
cat certs/mle-public-key-68d1367c.pem
```

Then download the signed certificate from Visa.

### Issue: "Which certificate is for what?"

| File | Purpose | Sensitivity |
|------|---------|-------------|
| `cert.pem` | Mutual TLS client cert | Medium (can be in repo if private repo) |
| `key.pem` | Mutual TLS private key | **HIGH - NEVER commit** |
| `mle-client-cert-*.pem` | MLE client certificate | Medium |
| `mle-private-key-*.pem` | MLE private key | **HIGH - NEVER commit** |
| `mle-server-cert-*.pem` | Visa's public key | Low (public) |
| `public-*.pem` | Your public keys | Low (public, submit to Visa) |

## Security Checklist

- [ ] Private keys have 600 permissions (`chmod 600 certs/*private*.pem certs/key.pem`)
- [ ] `.env` file is in `.gitignore` (check with `git check-ignore .env`)
- [ ] Private keys are in `.gitignore` (add: `certs/*private*.pem`)
- [ ] Shared secret is only in `.env`, not hardcoded
- [ ] Certificates are backed up securely (encrypted backup or secrets manager)

## Next Steps

1. **Upload your downloaded MLE certificates** to `certs/` directory with clear names
2. **Update `.env`** with the MLE configuration variables
3. **Test certificate validity** with the openssl commands above
4. **Create MLE utility** (I can help with this) to encrypt/decrypt payloads
5. **Update VisaNet service** to use MLE when sending sensitive data

## Where to Find MLE Certificates in Visa Portal

1. Log into: https://developer.visa.com/portal/app/v2/68d1367c-6766-49fe-b8ef-bbc7d4763949/SBX
2. Go to: **Security** → **Message Level Encryption** or **MLE Configuration**
3. Look for:
   - Your MLE Key ID: `68d1367c-6766-49fe-b8ef-bbc7d4763949`
   - Download buttons for client certificate and server certificate
   - Option to upload public key (if you generated new keys)

---

**Ready to proceed?** Upload your MLE client and server certificates to the `certs/` directory and I'll:
1. Verify they're valid
2. Set up the configuration
3. Create encryption/decryption utilities
4. Integrate into the VisaNet service
