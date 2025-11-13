# Visa Direct API Field Reference

This document provides a detailed reference of required and optional fields for Visa Direct API endpoints based on the official OpenAPI specification.

## Base URL
**Sandbox:** `https://sandbox.api.visa.com`

## Common Required Headers
- `Authorization`: Basic Auth (Base64 encoded userId:password)
- `Content-Type`: `application/json`
- `Accept`: `application/json`

## 1. Push Funds Transaction (OCT - Original Credit Transaction)

**Endpoint:** `POST /visadirect/fundstransfer/v1/pushfundstransactions`

**Description:** Send money to a recipient's Visa card (Person-to-Person, Funds Disbursement, etc.)

### Required Fields

```javascript
{
  "acquirerCountryCode": 840,              // 3-digit numeric country code
  "acquiringBin": 408999,                  // BIN under which Visa Direct is registered
  "amount": 100.00,                        // Transaction amount (max 999999999.999)
  "businessApplicationId": "AA",           // AA = P2P (same person), PP = P2P (different persons), FD = Funds Disbursement
  "cardAcceptor": {                        // Originator information
    "name": "Locapay Limited",             // Max 25 chars
    "idCode": "LOCAPAY001",                // Unique identifier (max 15 chars)
    "terminalId": "12345678",              // Terminal ID (max 8 chars)
    "address": {
      "city": "San Francisco",             // Max 13 chars
      "country": "USA"                     // 3-char alpha or numeric code
    }
  },
  "localTransactionDateTime": "2024-01-15T10:30:00",  // YYYY-MM-DDThh:mm:ss
  "recipientPrimaryAccountNumber": "4957030420210454", // Recipient PAN (13-19 digits)
  "retrievalReferenceNumber": "401010101011",         // ydddhhnnnnnn format (12 chars)
  "systemsTraceAuditNumber": 101011,                  // 6 digits, unique per transaction
  "transactionCurrencyCode": "USD"                    // 3-char alpha or numeric
}
```

### Conditionally Required Fields

#### For Money Transfer (Cross-border or US Domestic)
```javascript
{
  "senderName": "John Doe",                // Format: Last Name + First Name + Middle Initial
  "senderAddress": "123 Main St",
  "senderCity": "New York",
  "senderStateCode": "NY",                 // Required if senderCountryCode is USA/CAN
  "senderCountryCode": "USA",
  "sourceOfFundsCode": "01"                // 01=Credit, 02=Debit, 03=Prepaid, 05=Deposit Account
}
```

#### Alternative to senderAccountNumber
```javascript
{
  "senderReference": "ABC123XYZ",          // Required if no senderAccountNumber, max 16 chars
  // OR
  "senderAccountNumber": "4005520000011126" // Sender PAN (13-19 digits)
}
```

#### For Cross-border Transactions
```javascript
{
  "recipientName": "Jane Smith",
  "recipientCity": "Toronto",
  "recipientState": "ON",                  // Required if Canada/USA
  "recipientCountryCode": "CAN",
  "recipientPostalCode": "M5H2N2"
}
```

### Optional Fields

```javascript
{
  "merchantCategoryCode": 6012,            // Defaults to onboarding value
  "accountType": "00",                     // 00=N/A, 10=Savings, 20=Checking, 30=Credit, 40=Universal
  "feeProgramIndicator": "123",
  "surcharge": "1.50",                     // Sender surcharge
  "senderPostalCode": "10001",
  "senderDateOfBirth": "1990-05-15",       // YYYY-MM-DD
  "senderFirstName": "John",               // For non-Visa networks
  "senderLastName": "Doe",
  "senderMiddleName": "Michael",
  "recipientFirstName": "Jane",
  "recipientLastName": "Smith",
  "recipientMiddleName": "Ann",
  "messageReasonCode": 5120,               // For specific use cases (e.g., VAT refund)
  "purposeOfPayment": "FAMILY_SUPPORT",    // Market-specific
  "settlementServiceIndicator": 9,         // 0=International, 8=National, 9=VIP decides
  "pointOfServiceData": {                  // Required for card-present scenarios
    "panEntryMode": 90,
    "posConditionCode": 0,
    "motoECIIndicator": "5"
  }
}
```

---

## 2. Pull Funds Transaction (AFT - Account Funding Transaction)

**Endpoint:** `POST /visadirect/fundstransfer/v1/pullfundstransactions`

**Description:** Request money from a sender's Visa card

### Required Fields

```javascript
{
  "acquirerCountryCode": 840,
  "acquiringBin": 408999,
  "amount": 100.00,
  "businessApplicationId": "AA",
  "cardAcceptor": {
    "name": "Locapay Limited",
    "idCode": "LOCAPAY001",
    "terminalId": "12345678",
    "address": {
      "country": "USA"
    }
  },
  "localTransactionDateTime": "2024-01-15T10:30:00",
  "senderPrimaryAccountNumber": "4005520000011126",   // Sender PAN
  "retrievalReferenceNumber": "401010101011",
  "systemsTraceAuditNumber": 101011,
  "senderCurrencyCode": "USD"
}
```

### Conditionally Required Fields

Similar to Push Funds with sender-focused data requirements.

---

## 3. Reverse Funds Transaction (AFTR - Account Funding Transaction Reversal)

**Endpoint:** `POST /visadirect/fundstransfer/v1/reversefundstransactions`

**Description:** Reverse a previous pull funds transaction (AFT)

### Required Fields

```javascript
{
  "acquirerCountryCode": 840,
  "acquiringBin": 408999,
  "amount": 100.00,                        // Must match original AFT
  "businessApplicationId": "AA",           // Must match original AFT
  "cardAcceptor": {                        // Same structure as original
    "name": "Locapay Limited",
    "idCode": "LOCAPAY001",
    "terminalId": "12345678",
    "address": {
      "country": "USA"
    }
  },
  "localTransactionDateTime": "2024-01-15T11:00:00",
  "merchantCategoryCode": 6012,
  "originalDataElements": {                // Data from original AFT
    "acquiringBin": 408999,                // From original AFT
    "systemsTraceAuditNumber": 101011,     // From original AFT
    "transmissionDateTime": "2024-01-15T10:30:00",  // From original AFT response
    "approvalCode": "50607D"               // From original AFT response (if present)
  },
  "retrievalReferenceNumber": "401010101011", // Must match original AFT
  "senderCurrencyCode": "USD",
  "senderPrimaryAccountNumber": "4005520000011126",
  "systemsTraceAuditNumber": 101011,       // Must match original AFT
  "transactionIdentifier": 234234234234234 // From original AFT response
}
```

---

## 4. Transaction Status Query

**Endpoint:** `GET /visadirect/fundstransfer/v1/pushfundstransactions/{statusIdentifier}`

**Description:** Query the status of an async transaction (when initial response was 202)

### URL Parameters
- `statusIdentifier`: The statusIdentifier value returned in the 202 response

### Response Fields
```javascript
{
  "localTransactionDateTime": "2024-01-15T10:30:00",
  "acquirerCountryCode": 840,
  "acquiringBin": 408999,
  "approvalCode": "50607D",
  "responseCode": "00",                    // 00 = Approved
  "actionCode": "00",
  "transmissionDateTime": "2024-01-15T10:30:05",
  "statusIdentifier": 234234322342343,
  "systemsTraceAuditNumber": 101011,
  "transactionIdentifier": 123456789012345
}
```

---

## Response Codes

### Success Codes
- `200 OK`: Transaction processed successfully
- `202 Accepted`: Transaction accepted for async processing (use statusIdentifier to query status)

### Common Response Codes (Field: responseCode)
- `00`: Approved
- `05`: Do not honor
- `51`: Insufficient funds
- `54`: Expired card
- `57`: Transaction not permitted to cardholder
- `58`: Transaction not permitted to acquirer/terminal
- `91`: Issuer unavailable
- `96`: System malfunction

### Action Codes (Field: actionCode)
- `00`: Approved
- `81`: Negative online approval
- `85`: No reason to decline

---

## Business Application IDs

| Code | Description | Use Case |
|------|-------------|----------|
| AA | Account to Account | P2P - sender and recipient are same person |
| PP | Person to Person | P2P - sender and recipient are different persons |
| FD | Funds Disbursement | Government/merchant sending funds to consumers |
| PL | Prepaid Load | Loading prepaid cards |
| BP | Bill Payment | Credit card bill payments |
| PS | Purchase (Argentina) | Argentina domestic purchase transactions |
| RP | Request to Pay | C2B payment requests |

---

## Source of Funds Codes

| Code | Description |
|------|-------------|
| 01 | Credit card |
| 02 | Debit card |
| 03 | Prepaid card |
| 04 | Cash |
| 05 | Deposit account |
| 06 | Mobile money account |

---

## Network IDs

Used for US domestic transactions to specify network routing:
- Network ID determines which network to use
- Sharing Group Code specifies network access priority

**Note:** For AFTR and Multi-AFTR, must use networkId from original AFT response.

---

## Settlement Service Indicators

| Code | Description |
|------|-------------|
| 0 | International Settlement |
| 8 | National Settlement |
| 9 | VIP to decide (default) |

---

## Multi-Transaction Endpoints

For batch processing:
- `POST /visadirect/fundstransfer/v1/multipushfundstransactions`
- `POST /visadirect/fundstransfer/v1/multipullfundstransactions`
- `POST /visadirect/fundstransfer/v1/multireversefundstransactions`

Structure includes `request[]` array with multiple transaction objects.

---

## Important Notes

1. **Retrieval Reference Number Format:** Recommended `ydddhhnnnnnn`
   - `y`: Last digit of year (0-9)
   - `ddd`: Day of year (001-366)
   - `hh`: Hour (00-23)
   - `nnnnnn`: 6-digit number (can use systemsTraceAuditNumber)

2. **Systems Trace Audit Number:** 
   - Must be unique for each API call
   - For AFTR, must match the original AFT value

3. **Amount Formatting:**
   - Maximum: 999999999.999
   - Fractional digits: Max 3
   - Respect currency decimal rules (e.g., JPY has 0 decimals)

4. **Transaction Identifier:**
   - Returned in response
   - Required for reversals
   - 15-digit positive integer

5. **Card Acceptor:**
   - Name should reflect actual originator/service name
   - idCode must be unique per originator
   - terminalId can be static for card-not-present

6. **Conditional Fields:**
   - Many fields are conditionally required based on:
     - Transaction type (P2P, disbursement, etc.)
     - Geography (cross-border, US domestic, etc.)
     - Business rules (MasterCard routing, specific markets)

7. **Market-Specific Data:**
   - Colombia: `colombiaNationalServiceData`
   - Argentina: `argentinaNationalServiceData`
   - Mexico: `mexicoNationalServiceData`

---

## Testing Credentials

**Visa Developer Portal:** https://developer.visa.com/login/
- Email: locapaylimited@gmail.com
- Password: Locapay$1999

**Test Cards:** Available in Visa Developer Portal under project resources.

---

## References

- Full OpenAPI Spec: `/config/api_reference (1).json`
- Request/Response Codes: https://developer.visa.com/request_response_codes
- ISO Country & Currency Codes: https://developer.visa.com/request_response_codes#iso_country_and_currency_codes
- Business Application IDs: https://developer.visa.com/request_response_codes#business_application_identifier
- Source of Funds: https://developer.visa.com/request_response_codes#source_of_funds
