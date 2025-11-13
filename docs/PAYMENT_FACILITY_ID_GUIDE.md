# Payment Facility ID - VisaNet Connect API

## What is Payment Facility ID?

**Payment Facility ID** (also called Payment Facilitator Identifier) identifies the marketplace or payment facilitator processing the transaction.

- **Field Name in API:** `PaymentFacltId` (note: "Faclt" not "Facility")
- **Type:** String (1-11 characters)
- **Example:** `"52014057"`
- **Required:** Yes - Error 9125 occurs if missing or invalid

## Where It's Used in the Request

The Payment Facility ID is part of the **Acceptor** (merchant) information in the request body:

```json
{
  "msgIdentfctn": {
    "clientId": "IOJF8KXYAGUWABS0TZ3U21efJ-hJB-wUp_DQjn9EVdXmIaoIE",
    "correlatnId": "abc123xyz"
  },
  "Body": {
    "Tx": { ... },
    "Envt": {
      "Accptr": {
        "PaymentFacltId": "52014057",        // ← Payment Facility ID HERE
        "Accptr": "520142254322",             // ← Acceptor ID
        "CstmrSvc": "1 4155552235",           // ← Customer Service Phone
        "Adr": {
          "PstlCd": "94404",                  // ← Postal Code
          "CtrySubDvsnMjr": "06",             // ← State (California)
          "Ctry": "US",                       // ← Country
          "CtrySubDvsnMnr": "081"             // ← County
        }
      },
      "Termnl": { ... },
      "Card": { ... }
    },
    "Cntxt": { ... }
  }
}
```

## Request Structure Hierarchy

```
Body
└── Envt (Environment)
    └── Accptr (Acceptor/Merchant)
        ├── PaymentFacltId      ← Payment Facility ID (REQUIRED)
        ├── Accptr              ← Acceptor/Merchant ID (REQUIRED)
        ├── CstmrSvc            ← Customer Service Number
        └── Adr                 ← Address
            ├── PstlCd          ← Postal/ZIP Code
            ├── CtrySubDvsnMjr  ← State/Province
            ├── Ctry            ← Country (ISO 2-letter)
            └── CtrySubDvsnMnr  ← County/District
```

## How to Get Your Payment Facility ID

### From Visa Developer Portal:

1. Go to: https://developer.visa.com/portal
2. Select your VisaNet Connect project
3. Navigate to **Test Data** section
4. Find:
   - **Payment Facility ID** (e.g., `52014057`)
   - **Acceptor ID** (e.g., `520142254322`)

### Configuration in .env:

```bash
# VisaNet Connect Acceptor Information
VISANET_PAYMENT_FACILITY_ID=52014057          # ← From portal
VISANET_ACCEPTOR_ID=520142254322              # ← From portal
VISANET_CUSTOMER_SERVICE=1 4155552235         # ← Your customer service number
VISANET_ACCEPTOR_ZIP=94404                    # ← Your business ZIP
VISANET_ACCEPTOR_COUNTRY_ALPHA2=US            # ← Country code
VISANET_ACCEPTOR_STATE_CODE=06                # ← State code (CA = 06)
VISANET_ACCEPTOR_COUNTY_CODE=081              # ← County code
VISANET_TERMINAL_ID=10012343                  # ← Terminal ID
```

## Implementation in Code

The `visaNet.js` service automatically applies these values:

```javascript
// In services/visaNet.js constructor:
this.defaultAcceptor = {
  paymentFacilityId: process.env.VISANET_PAYMENT_FACILITY_ID || '52014057',
  acceptorId: process.env.VISANET_ACCEPTOR_ID || '520142254322',
  customerService: process.env.VISANET_CUSTOMER_SERVICE || '1 4155552235',
  address: {
    postalCode: process.env.VISANET_ACCEPTOR_ZIP || '94404',
    country: process.env.VISANET_ACCEPTOR_COUNTRY_ALPHA2 || 'US',
    countrySubdivisionMajor: process.env.VISANET_ACCEPTOR_STATE_CODE || '06',
    countrySubdivisionMinor: process.env.VISANET_ACCEPTOR_COUNTY_CODE || '081'
  }
};

// In authorize() method, this gets mapped to:
Envt: {
  Accptr: {
    PaymentFacltId: this.defaultAcceptor.paymentFacilityId,  // ← Applied here
    Accptr: this.defaultAcceptor.acceptorId,
    CstmrSvc: this.defaultAcceptor.customerService,
    Adr: {
      PstlCd: this.defaultAcceptor.address.postalCode,
      CtrySubDvsnMjr: this.defaultAcceptor.address.countrySubdivisionMajor,
      Ctry: this.defaultAcceptor.address.country,
      CtrySubDvsnMnr: this.defaultAcceptor.address.countrySubdivisionMinor
    }
  }
}
```

## Custom Acceptor Per Transaction

You can override the default acceptor for specific transactions:

```javascript
const result = await visaNet.authorize({
  cardNumber: '4111111111111111',
  expiryDate: '2512',
  cvv: '123',
  amount: 100.00,
  acceptor: {
    PaymentFacltId: 'your_custom_facility_id',
    Accptr: 'your_custom_acceptor_id',
    CstmrSvc: '1 8005551234',
    Adr: {
      PstlCd: '10001',
      CtrySubDvsnMjr: '36',  // NY
      Ctry: 'US',
      CtrySubDvsnMnr: '061'
    }
  }
});
```

## Error 9125 - Missing Payment Facility ID

If you see this error:

```json
{
  "responseStatus": {
    "status": 400,
    "code": "9125",
    "severity": "ERROR",
    "message": "Expected input credential was not present"
  }
}
```

**Causes:**
1. `VISANET_PAYMENT_FACILITY_ID` not set in `.env`
2. Payment Facility ID is invalid
3. Payment Facility ID doesn't match your Visa project

**Solution:**
1. Get correct Payment Facility ID from Visa portal
2. Update `.env`:
   ```bash
   VISANET_PAYMENT_FACILITY_ID=your_actual_value
   ```
3. Restart your application
4. Test again

## State and County Codes

### State Codes (CtrySubDvsnMjr):
- California (CA) = `06`
- New York (NY) = `36`
- Texas (TX) = `48`
- Florida (FL) = `12`
- [See full FIPS state codes list](https://en.wikipedia.org/wiki/Federal_Information_Processing_Standard_state_code)

### County Codes (CtrySubDvsnMnr):
- Format: 3-digit FIPS county code
- Example: San Mateo County, CA = `081`
- Example: New York County (Manhattan), NY = `061`
- [See FIPS county codes](https://www.census.gov/library/reference/code-lists/ansi.html)

## Testing

After configuring your Payment Facility ID, test with:

```bash
# Test VisaNet authorization with MLE
node scripts/test-visanet-with-mle.js

# Or run specific test
node scripts/test-visanet-live.js
```

## Summary

- **Location:** `Body.Envt.Accptr.PaymentFacltId`
- **Field Name:** `PaymentFacltId` (API) → `paymentFacilityId` (code)
- **Environment Variable:** `VISANET_PAYMENT_FACILITY_ID`
- **Get From:** Visa Developer Portal → Project → Test Data
- **Required:** Yes (error 9125 if missing)
- **Can Override:** Yes, per transaction via `acceptor` parameter
