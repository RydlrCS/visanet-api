# VisaNet Connect Integration Status

## ✅ Completed

### 1. Certificate Setup
- ✅ Uploaded VisaNet Connect certificate (`cert.pem`) for project `c70ff121-977b-4872-9b69-550b1c281755`
- ✅ Matched certificate with private key (`privateKey-c70ff121-977b-4872-9b69-550b1c281755.pem` → `key.pem`)
- ✅ Fixed CA chain issue by using Node.js system CA bundle (includes DigiCert)
- ✅ Verified mutual TLS works (connection test passed with 400 response - cert/key/auth valid)

### 2. Credentials Configuration
- ✅ Added VisaNet Connect credentials to `.env`:
  - `VISANET_USER_ID`: [Configured in .env]
  - `VISANET_PASSWORD`: [Configured in .env]
- ✅ Separated Visa Direct and VisaNet Connect credentials
- ✅ Updated `config/visa.js` to use system CAs instead of requiring `ca.pem`

### 3. Service Implementation
- ✅ Created `services/visaNet.js` with complete VisaNet Connect API integration
- ✅ Updated service to use `VISANET_USER_ID` as `clientId`
- ✅ Created connection test scripts:
  - `scripts/test-visanet-connection.js` - Basic connectivity test
  - `scripts/test-visanet-debug.js` - Debug version (bypasses CA validation)
  - `scripts/test-visanet-live.js` - Live API test with test cards

### 4. Documentation
- ✅ Created `docs/VISANET_CONNECT_API_FIELDS.md` - Complete field reference
- ✅ Created `examples/visanet-examples.js` - 8 usage examples
- ✅ Updated README with VisaNet Connect integration details
- ✅ Updated `.env.example` with all required variables

## ⚠️ Blocked - Action Required

### Error 9125: "Expected input credential was not present"

The API is returning error code `9125` which means a required credential field is missing from the request. Based on the API specification, this is likely the **Payment Facility ID**.

**What you need to do:**

1. **Log into Visa Developer Portal:**
   - URL: https://developer.visa.com/portal/app/v2/c70ff121-977b-4872-9b69-550b1c281755/SBX
   - Use your LocaPay credentials (contact admin if needed)

2. **Find Test Data Section:**
   - Navigate to "Test Data" or "Sandbox Configuration"
   - Look for:
     - **Payment Facility ID** (e.g., `52014057`)
     - **Acceptor ID** (e.g., `520142254322`)
     - **Merchant ID** (if different)
     - **Terminal ID** (if specific)

3. **Update `.env` file:**
   ```bash
   VISANET_PAYMENT_FACILITY_ID=52014057  # Replace with actual value from portal
   VISANET_ACCEPTOR_ID=520142254322      # Replace with actual value from portal
   ```

4. **Re-run the test:**
   ```bash
   node scripts/test-visanet-live.js
   ```

### Alternative: Check Project Settings

If you can't find the Payment Facility ID in the test data section, check:
- Project Settings → Credentials
- Sandbox Configuration → Merchant Setup
- API Documentation → Sample Requests (might show your project-specific IDs)

## 📋 Test Results Summary

### Connection Test Results:
```
✅ Certificate and key match: VERIFIED
✅ Mutual TLS handshake: SUCCESS
✅ Basic Authentication: SUCCESS  
✅ Server certificate validation: SUCCESS (DigiCert)
❌ Authorization API call: BLOCKED (missing Payment Facility ID)
```

### Debug Test (with `rejectUnauthorized: false`):
```
Status: 400
Response: {
  "responseStatus": {
    "status": 400,
    "code": "9125",
    "severity": "ERROR",
    "message": "Expected input credential was not present",
    "info": ""
  }
}
```

This confirms:
- ✅ Certificate/key pairing is correct
- ✅ Authentication (username/password) is working
- ❌ Request payload is missing a required credential field (likely Payment Facility ID)

## 🔄 Next Steps (in order)

1. **Get Payment Facility ID from Visa portal** (see instructions above)
2. **Update `.env` with the correct Payment Facility ID**
3. **Update `services/visaNet.js` to use env vars for payment facility and acceptor IDs**
4. **Re-run `node scripts/test-visanet-live.js`** - should get successful authorizations
5. **Get Visa Direct certificate** (different project, likely has its own cert/key)
6. **Test Visa Direct API** with push/pull/reverse operations
7. **Run full test suite:** `npm run test:visa`
8. **Document the working test data** in `docs/VISA_SETUP_GUIDE.md`

## 📚 Reference

- **Project ID:** c70ff121-977b-4872-9b69-550b1c281755
- **Test Portal:** https://developer.visa.com/portal/app/v2/c70ff121-977b-4872-9b69-550b1c281755/SBX
- **API Endpoint:** https://sandbox.api.visa.com/acs/v3/payments/authorizations
- **Certificate Expiry:** Nov 13, 2026
- **API Specification:** `config/api_reference (2).json` (VisaNet Connect - OpenAPI 3.0.1)

## 💡 Notes

- The VisaNet Connect API uses a nested message structure (`msgIdentfctn`, `Body`, `Envt`, `Cntxt`)
- Different from Visa Direct which uses a flat structure
- Both APIs use the same authentication method (Basic Auth) and certificates
- System CA bundle works for both sandbox and production (no custom `ca.pem` needed)
- Each Visa project may have its own certificate/key pair
