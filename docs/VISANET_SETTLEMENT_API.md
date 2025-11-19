# VisaNet Connect - Get Settlement API

## Overview

The Get Settlement endpoint retrieves settlement records for processed transactions. This API provides detailed information about financial settlements including amounts, currencies, and settlement positions.

## Endpoint

```
GET /visanetconnect/v1/settlement
```

**Base URL (Sandbox):** `https://sandbox.api.visa.com`

## Authentication

- **Type:** Basic Authentication
- **Headers:**
  - `Authorization: Basic [Base64(userId:password)]`
  - `Content-Type: application/json`
  - `Accept: application/json`

## Request Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `clientId` | String | Yes | Client application identifier from msgIdentfctn | `1DLMLAPPKDJ04301701` |
| `limit` | Integer | No | Maximum number of records to return | `1` |
| `asofdttm` | String | Yes | As-of date-time for settlement query (YYMMDDHHmmss) | `180430120000` |

### Date-Time Format

- **Format:** `YYMMDDHHmmss`
- **Example:** `180430120000` = April 30, 2018, 12:00:00
- **Breakdown:**
  - `YY` = Year (18 = 2018)
  - `MM` = Month (04 = April)
  - `DD` = Day (30)
  - `HH` = Hour (12)
  - `mm` = Minute (00)
  - `ss` = Second (00)

## Response Structure

### Success Response (HTTP 200)

```json
{
  "setlposcount": 1,
  "settlementRecords": {
    "settlementRecord": [
      {
        "ssid": "123",
        "setldate": "0430",
        "cutofftime": "105959",
        "sreid": "0123456789",
        "setlpossign": "C",
        "setlposamt": {
          "setlcurrcd": "800",
          "amountMinorUnits": "2",
          "amountValue": "1000"
        },
        "setlposind": "F"
      }
    ]
  },
  "pagingInfo": {
    "offset": 1,
    "asofdttm": "180430120000"
  }
}
```

## Response Fields

### Root Level

| Field | Type | Description |
|-------|------|-------------|
| `setlposcount` | Integer | Total count of settlement position records |
| `settlementRecords` | Object | Container for settlement record data |
| `pagingInfo` | Object | Pagination information |

### Settlement Record Fields

| Field | Type | Description | Example Value |
|-------|------|-------------|---------------|
| `ssid` | String | Settlement System ID | `123` |
| `setldate` | String | Settlement date (MMDD format) | `0430` (April 30) |
| `cutofftime` | String | Settlement cut-off time (HHmmss) | `105959` (10:59:59) |
| `sreid` | String | Settlement Record Entity ID | `0123456789` |
| `setlpossign` | String | Settlement position sign: `C` (Credit) or `D` (Debit) | `C` |
| `setlposamt` | Object | Settlement position amount details | See below |
| `setlposind` | String | Settlement position indicator: `F` (Final), `P` (Pending) | `F` |

### Settlement Position Amount (`setlposamt`)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `setlcurrcd` | String | Settlement currency code (ISO 4217 numeric) | `800` (UGX - Ugandan Shilling) |
| `amountMinorUnits` | String | Number of decimal places | `2` |
| `amountValue` | String | Amount in minor units (cents) | `1000` (= 10.00 in major units) |

### Pagination Info

| Field | Type | Description |
|-------|------|-------------|
| `offset` | Integer | Current offset for pagination |
| `asofdttm` | String | As-of date-time used in the query |

## Currency Codes (ISO 4217 Numeric)

Common currency codes:

| Code | Currency | Minor Units |
|------|----------|-------------|
| `840` | USD - US Dollar | 2 |
| `978` | EUR - Euro | 2 |
| `826` | GBP - British Pound | 2 |
| `800` | UGX - Ugandan Shilling | 2 |
| `124` | CAD - Canadian Dollar | 2 |
| `392` | JPY - Japanese Yen | 0 |

## Settlement Position Sign

| Code | Description | Meaning |
|------|-------------|---------|
| `C` | Credit | Money owed TO the merchant |
| `D` | Debit | Money owed BY the merchant |

## Settlement Position Indicator

| Code | Description | Meaning |
|------|-------------|---------|
| `F` | Final | Settlement is finalized |
| `P` | Pending | Settlement is still processing |

## Test Data (Scenario Based)

### Success Scenario

**Request:**
```
GET /visanetconnect/v1/settlement?clientId=1DLMLAPPKDJ04301701&limit=1&asofdttm=180430120000
```

**Expected Response:**
- HTTP Status: `200 OK`
- Settlement Position Count: `1`
- Settlement Date: April 30 (MMDD: `0430`)
- Cut-off Time: 10:59:59 (HHmmss: `105959`)
- Position Sign: `C` (Credit)
- Currency: `800` (UGX)
- Amount: 1000 minor units = 10.00 UGX
- Position Indicator: `F` (Final)

## Implementation Example

### Environment Variables

Add to `.env`:

```bash
# VisaNet Connect Settlement API
VISANET_CLIENT_ID=1DLMLAPPKDJ04301701
VISANET_USER_ID=your_user_id
VISANET_PASSWORD=your_password
```

### Node.js Implementation

```javascript
const axios = require('axios');

async function getSettlement(clientId, asofdttm, limit = 20) {
  const auth = Buffer.from(
    `${process.env.VISANET_USER_ID}:${process.env.VISANET_PASSWORD}`
  ).toString('base64');

  const params = {
    clientId,
    asofdttm,
    limit
  };

  try {
    const response = await axios.get(
      'https://sandbox.api.visa.com/visanetconnect/v1/settlement',
      {
        params,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    return {
      success: true,
      data: response.data,
      settlementCount: response.data.setlposcount,
      records: response.data.settlementRecords.settlementRecord
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Usage
const result = await getSettlement(
  '1DLMLAPPKDJ04301701',
  '180430120000',
  1
);

console.log('Settlement Records:', result.records);
```

### Parsing Settlement Amount

```javascript
function parseSettlementAmount(setlposamt) {
  const { setlcurrcd, amountMinorUnits, amountValue } = setlposamt;
  
  // Convert minor units to major units
  const divisor = Math.pow(10, parseInt(amountMinorUnits));
  const majorAmount = parseInt(amountValue) / divisor;
  
  return {
    currencyCode: setlcurrcd,
    minorUnits: parseInt(amountMinorUnits),
    rawAmount: parseInt(amountValue),
    amount: majorAmount,
    formatted: majorAmount.toFixed(parseInt(amountMinorUnits))
  };
}

// Example
const amount = parseSettlementAmount({
  setlcurrcd: '800',
  amountMinorUnits: '2',
  amountValue: '1000'
});

console.log(amount);
// {
//   currencyCode: '800',
//   minorUnits: 2,
//   rawAmount: 1000,
//   amount: 10,
//   formatted: '10.00'
// }
```

### Formatting Settlement Date

```javascript
function formatSettlementDate(setldate, cutofftime) {
  // setldate format: MMDD
  const month = setldate.substring(0, 2);
  const day = setldate.substring(2, 4);
  
  // cutofftime format: HHmmss
  const hour = cutofftime.substring(0, 2);
  const minute = cutofftime.substring(2, 4);
  const second = cutofftime.substring(4, 6);
  
  return {
    date: `${month}/${day}`,
    time: `${hour}:${minute}:${second}`,
    month: parseInt(month),
    day: parseInt(day),
    hour: parseInt(hour),
    minute: parseInt(minute),
    second: parseInt(second)
  };
}

// Example
const dateTime = formatSettlementDate('0430', '105959');
console.log(dateTime);
// {
//   date: '04/30',
//   time: '10:59:59',
//   month: 4,
//   day: 30,
//   hour: 10,
//   minute: 59,
//   second: 59
// }
```

## Error Handling

### Common Error Responses

| HTTP Code | Error | Description |
|-----------|-------|-------------|
| `400` | Bad Request | Invalid parameters or malformed request |
| `401` | Unauthorized | Invalid or missing authentication credentials |
| `404` | Not Found | No settlement records found for the given criteria |
| `500` | Internal Server Error | Server-side processing error |

### Error Response Example

```json
{
  "responseStatus": {
    "status": 400,
    "code": "9123",
    "severity": "ERROR",
    "message": "Invalid input data",
    "info": "The asofdttm parameter is required"
  }
}
```

## Pagination

For large result sets, use pagination:

```javascript
async function getAllSettlements(clientId, asofdttm, pageSize = 20) {
  let allRecords = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const result = await getSettlement(clientId, asofdttm, pageSize);
    
    if (result.success && result.records) {
      allRecords = allRecords.concat(result.records);
      
      // Check if there are more records
      if (result.records.length < pageSize) {
        hasMore = false;
      } else {
        offset += pageSize;
      }
    } else {
      hasMore = false;
    }
  }

  return allRecords;
}
```

## Best Practices

1. **Date-Time Format**: Always use the exact `YYMMDDHHmmss` format for `asofdttm`
2. **Pagination**: Use reasonable page sizes (10-100 records)
3. **Error Handling**: Always check for error responses and handle them gracefully
4. **Currency Conversion**: Use the `amountMinorUnits` field to correctly convert amounts
5. **Timezone**: Settlement times are typically in UTC or the merchant's local timezone
6. **Caching**: Consider caching settlement data as it doesn't change frequently
7. **Reconciliation**: Use `sreid` (Settlement Record Entity ID) for tracking and reconciliation

## Testing

### Test Script

```bash
# Run settlement query test
node scripts/test-visanet-settlement.js
```

### Manual Testing with cURL

```bash
curl -X GET \
  'https://sandbox.api.visa.com/visanetconnect/v1/settlement?clientId=1DLMLAPPKDJ04301701&limit=1&asofdttm=180430120000' \
  -H 'Authorization: Basic [YOUR_BASE64_CREDENTIALS]' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json'
```

## Related Documentation

- [VisaNet Connect API Reference](https://developer.visa.com/capabilities/visanetconnect)
- [Payment Facility ID Guide](./PAYMENT_FACILITY_ID_GUIDE.md)
- [VisaNet API Fields](./VISANET_CONNECT_API_FIELDS.md)
- [MLE Integration](./MLE_INTEGRATION_COMPLETE.md)

## Support

For issues or questions:
- Visa Developer Portal: https://developer.visa.com/portal
- Support Email: Use your VDP account support channel
- Repository Issues: https://github.com/RydlrCS/visanet-api/issues

---

**Last Updated:** November 19, 2025  
**API Version:** v1  
**Status:** Documentation Complete
