# Visa Direct API Integration - Implementation Summary

## Overview

This document summarizes the Visa Direct API integration implementation based on the official OpenAPI 3.0.1 specification files provided in `config/api_reference (1).json` and `config/api_reference (2).json`.

## What Was Updated

### 1. Visa Direct Service (`services/visaDirect.js`)

**Complete rewrite to match official Visa Direct API specification:**

#### Key Changes:

- **Removed** dependency on `axios` → Now uses native Node.js `https` module
- **Updated** all field names to match official API spec exactly
- **Added** proper transaction identifier generation:
  - `systemsTraceAuditNumber`: 6-digit unique number
  - `retrievalReferenceNumber`: ydddhhnnnnnn format (year-day-hour-trace)
- **Implemented** async transaction handling (202 Accepted responses)
- **Added** comprehensive JSDoc documentation for all methods
- **Created** proper error handling with detailed error formatting

#### API Methods:

1. **`pushPayment(params)`** - Push Funds Transaction (OCT)
   - Endpoint: `POST /visadirect/fundstransfer/v1/pushfundstransactions`
   - Send money to recipient's Visa card
   - Use cases: P2P, Funds Disbursement, Prepaid Load, Bill Payment

2. **`pullFunds(params)`** - Pull Funds Transaction (AFT)
   - Endpoint: `POST /visadirect/fundstransfer/v1/pullfundstransactions`
   - Request money from sender's Visa card
   - Use cases: Account funding from cardholder

3. **`reverseTransaction(params)`** - Reverse Funds Transaction (AFTR)
   - Endpoint: `POST /visadirect/fundstransfer/v1/reversefundstransactions`
   - Reverse a previous pull funds transaction
   - Requires original transaction data

4. **`getTransactionStatus(statusIdentifier, type)`** - Query Transaction Status
   - Endpoint: `GET /visadirect/fundstransfer/v1/{type}transactions/{statusIdentifier}`
   - Query async transaction status (when initial response was 202)

### 2. Documentation

#### Created `docs/VISA_DIRECT_API_FIELDS.md`

Comprehensive field reference documentation including:
- Required fields for each transaction type
- Conditionally required fields (based on transaction type, geography, etc.)
- Optional fields with descriptions
- Business Application IDs (AA, PP, FD, PL, BP, PS, RP)
- Source of Funds codes
- Response codes and their meanings
- Settlement service indicators
- Multi-transaction batch endpoints
- Market-specific data structures (Colombia, Argentina, Mexico)
- Testing information

## API Specification Summary

### Base Configuration

```javascript
// Sandbox Environment
baseURL: 'https://sandbox.api.visa.com'

// Authentication
Authorization: Basic Base64(userId:password)

// Default Headers
Content-Type: application/json
Accept: application/json
```

### Core Required Fields (All Transactions)

```javascript
{
  acquirerCountryCode: 840,        // 3-digit numeric (840 = USA)
  acquiringBin: 408999,            // Your registered BIN
  amount: 100.00,                  // Max 999999999.999
  businessApplicationId: "AA",     // Transaction type code
  cardAcceptor: {                  // Originator information
    name: "Locapay Limited",
    idCode: "LOCAPAY001",
    terminalId: "12345678",
    address: {
      city: "San Francisco",
      country: "USA"
    }
  },
  localTransactionDateTime: "2024-01-15T10:30:00",
  retrievalReferenceNumber: "401010101011",  // ydddhhnnnnnn format
  systemsTraceAuditNumber: 101011,           // 6-digit unique
  transactionCurrencyCode: "USD"             // Or senderCurrencyCode for AFT
}
```

### Push Funds Additional Required Fields

```javascript
{
  recipientPrimaryAccountNumber: "4957030420210454"  // 13-19 digits
}
```

### Pull Funds Additional Required Fields

```javascript
{
  senderPrimaryAccountNumber: "4005520000011126"  // 13-19 digits
}
```

### Reverse Funds Additional Required Fields

```javascript
{
  merchantCategoryCode: 6012,
  originalDataElements: {
    acquiringBin: 408999,
    systemsTraceAuditNumber: 101011,      // From original AFT
    transmissionDateTime: "2024-01-15T10:30:00",  // From AFT response
    approvalCode: "50607D"                // From AFT response
  },
  transactionIdentifier: 234234234234234  // From AFT response
}
```

## Business Application IDs

| Code | Use Case | Sender/Recipient Relationship |
|------|----------|------------------------------|
| AA | Account to Account | Same person |
| PP | Person to Person | Different persons |
| FD | Funds Disbursement | Government/merchant to consumer |
| PL | Prepaid Load | Card loading |
| BP | Bill Payment | Credit card bill payment |
| PS | Purchase (Argentina) | Argentina domestic POS |
| RP | Request to Pay | C2B payment request |

## Source of Funds Codes

| Code | Description |
|------|-------------|
| 01 | Credit card |
| 02 | Debit card |
| 03 | Prepaid card |
| 04 | Cash |
| 05 | Deposit account |
| 06 | Mobile money account |

## Response Handling

### Success Responses

**200 OK** - Transaction completed immediately:
```javascript
{
  success: true,
  status: 'completed',
  transactionIdentifier: 123456789012345,
  approvalCode: "50607D",
  responseCode: "00",  // 00 = Approved
  actionCode: "00",
  transmissionDateTime: "2024-01-15T10:30:05"
}
```

**202 Accepted** - Transaction processing asynchronously:
```javascript
{
  success: true,
  status: 'pending',
  statusIdentifier: 234234322342343,
  message: 'Transaction is being processed. Use getTransactionStatus() to check status.'
}
```

### Common Response Codes

- `00`: Approved
- `05`: Do not honor
- `51`: Insufficient funds
- `54`: Expired card
- `57`: Transaction not permitted to cardholder
- `58`: Transaction not permitted to acquirer/terminal
- `91`: Issuer unavailable
- `96`: System malfunction

## Environment Variables

Add to `.env`:

```bash
# Visa API Configuration
VISA_URL=https://sandbox.api.visa.com
VISA_USER_ID=your_user_id_here
VISA_PASSWORD=your_password_here

# Acquiring Information (from enrollment)
VISA_ACQUIRING_BIN=408999
VISA_ACQUIRER_COUNTRY_CODE=840

# Card Acceptor Information (from enrollment)
VISA_CARD_ACCEPTOR_NAME=Locapay Limited
VISA_CARD_ACCEPTOR_ID=LOCAPAY001
VISA_TERMINAL_ID=12345678
VISA_ACCEPTOR_CITY=San Francisco
VISA_ACCEPTOR_STATE=CA
VISA_ACCEPTOR_COUNTRY=USA
VISA_ACCEPTOR_COUNTY=081
VISA_ACCEPTOR_ZIP=94404

# Certificates (for mutual TLS)
VISA_CERT_PATH=./certs/cert.pem
VISA_KEY_PATH=./certs/key.pem
VISA_CA_PATH=./certs/ca.pem
```

## Usage Examples

### Example 1: Push Payment (P2P - Same Person)

```javascript
const visaDirect = require('./services/visaDirect');

const result = await visaDirect.pushPayment({
  amount: 100.00,
  recipientPAN: '4957030420210454',
  currency: 'USD',
  businessApplicationId: 'AA',  // Account to Account
  senderAccountNumber: '4005520000011126',
  sourceOfFundsCode: '02',  // Debit card
  sender: {
    name: 'John Doe',
    address: '123 Main St',
    city: 'New York',
    stateCode: 'NY',
    countryCode: 'USA'
  },
  recipient: {
    name: 'John Doe'
  }
});

console.log(result);
// {
//   success: true,
//   status: 'completed',
//   transactionIdentifier: 123456789012345,
//   approvalCode: '50607D',
//   responseCode: '00'
// }
```

### Example 2: Pull Funds (Account Funding)

```javascript
const result = await visaDirect.pullFunds({
  amount: 50.00,
  senderPAN: '4005520000011126',
  currency: 'USD',
  businessApplicationId: 'AA',
  sender: {
    name: 'Jane Smith',
    city: 'Los Angeles',
    stateCode: 'CA',
    countryCode: 'USA'
  }
});

// Save the response for potential reversal
const originalTransaction = {
  amount: result.data.amount,
  senderPAN: '4005520000011126',
  systemsTraceAuditNumber: result.data.systemsTraceAuditNumber,
  retrievalReferenceNumber: result.data.retrievalReferenceNumber,
  transmissionDateTime: result.transmissionDateTime,
  approvalCode: result.approvalCode,
  transactionIdentifier: result.transactionIdentifier
};
```

### Example 3: Reverse Transaction

```javascript
const result = await visaDirect.reverseTransaction({
  originalTransaction: {
    amount: 50.00,
    senderPAN: '4005520000011126',
    systemsTraceAuditNumber: 123456,
    retrievalReferenceNumber: '401010101011',
    transmissionDateTime: '2024-01-15T10:30:05',
    approvalCode: '50607D',
    transactionIdentifier: 123456789012345
  },
  businessApplicationId: 'AA',
  currency: 'USD'
});
```

### Example 4: Check Async Transaction Status

```javascript
// If initial response was 202 Accepted
const statusResult = await visaDirect.getTransactionStatus(
  234234322342343,  // statusIdentifier from 202 response
  'push'            // Transaction type: 'push', 'pull', or 'reverse'
);

console.log(statusResult);
```

## Next Steps

### 1. Get API Credentials

1. Log in to Visa Developer Portal: https://developer.visa.com/login/
   - Use your LocaPay credentials (contact admin if needed)

2. Navigate to your project → Credentials tab

3. Download certificates:
   - `cert.pem` (Client certificate)
   - `key.pem` (Private key)
   - `ca.pem` (Certificate Authority)

4. Place certificates in `certs/` directory

5. Copy User ID and Password from portal

6. Update `.env` file with credentials

### 2. Test API Connection

```bash
npm run test:visa
```

This will run `scripts/test-visa-connection.js` to verify:
- Credentials are configured
- Certificates are valid
- Can connect to Visa API
- Can make a test API call

### 3. Update Transaction Routes

Update `routes/transactions.js` to use the new service methods with proper parameter mapping.

### 4. Add Service Tests

Create `tests/services/visaDirect.test.js` with comprehensive unit tests for all methods.

### 5. Test with Visa Test Cards

Use test card numbers provided in Visa Developer Portal to test different scenarios:
- Successful transactions
- Declined transactions
- Insufficient funds
- Expired cards
- Invalid PANs

## Important Notes

1. **Transaction Identifiers Must Be Unique:**
   - `systemsTraceAuditNumber`: Generate new for each API call
   - `retrievalReferenceNumber`: Use recommended ydddhhnnnnnn format
   - For AFTR, these must match the original AFT values

2. **Amount Formatting:**
   - Maximum: 999999999.999
   - Respect currency decimal rules (e.g., JPY has 0 decimals, USD has 2)

3. **Card Acceptor Information:**
   - Must match what was provided during Visa Direct enrollment
   - Keep in sync with environment variables

4. **Conditional Fields:**
   - Many fields are required based on:
     - Transaction type (P2P, disbursement, etc.)
     - Geography (cross-border, US domestic, etc.)
     - Card network routing (Visa, MasterCard, etc.)
   - See `docs/VISA_DIRECT_API_FIELDS.md` for complete details

5. **Async Processing:**
   - Some transactions may return 202 instead of 200
   - Use `getTransactionStatus()` to poll for completion
   - Save `statusIdentifier` from 202 response

6. **Reversals:**
   - Only AFT transactions can be reversed (not OCT)
   - Must save original transaction data for reversal
   - Reversal must use exact STAN and RRN from original

7. **Error Handling:**
   - Check `responseCode` field in response
   - `00` = Approved, other codes indicate issues
   - See response codes table in field reference doc

## Files Modified/Created

### Modified
- ✅ `services/visaDirect.js` - Complete rewrite

### Created
- ✅ `docs/VISA_DIRECT_API_FIELDS.md` - Field reference guide
- ✅ `docs/IMPLEMENTATION_SUMMARY.md` - This file
- ✅ `services/visaDirect.js.backup` - Backup of old implementation

### Pending Updates
- ⏳ `routes/transactions.js` - Update to use new service methods
- ⏳ `tests/services/visaDirect.test.js` - Add comprehensive tests
- ⏳ `.env` - Add Visa API credentials
- ⏳ `certs/` - Add certificate files

## Testing Checklist

- [ ] Configure API credentials in `.env`
- [ ] Download and place certificates in `certs/`
- [ ] Run `npm run test:visa` - verify connection
- [ ] Test push payment with test card
- [ ] Test pull funds with test card
- [ ] Test transaction reversal
- [ ] Test async transaction status query
- [ ] Test error scenarios (declined, insufficient funds, etc.)
- [ ] Add unit tests for service
- [ ] Add integration tests
- [ ] Test webhooks with actual transactions

## References

- Official API Spec: `config/api_reference (1).json` (48,889 lines)
- VisaNet Connect Spec: `config/api_reference (2).json` (6,001 lines)
- Field Reference: `docs/VISA_DIRECT_API_FIELDS.md`
- Visa Developer Portal: https://developer.visa.com
- Credentials Checklist: `CREDENTIALS_CHECKLIST.md`
- Setup Guide: `VISA_SETUP_GUIDE.md`

---

**Status:** Implementation complete. Ready for credential configuration and testing.

**Last Updated:** January 2025
