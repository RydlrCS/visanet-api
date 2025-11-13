# VisaNet Connect API Field Reference

This document provides a detailed reference for VisaNet Connect - Acceptance API based on the official OpenAPI specification.

## Base URL
**Sandbox:** `https://sandbox.api.visa.com`

## Common Required Headers
- `Authorization`: Basic Auth (Base64 encoded userId:password)
- `Content-Type`: `application/json`
- `Accept`: `application/json`

## 1. Payment Authorization

**Endpoint:** `POST /acs/v3/payments/authorizations`

**Description:** Request authorization for a payment transaction in real-time.

### Required Fields

```javascript
{
  "msgIdentfctn": {
    "clientId": "1VISAGCT000001",        // Your client ID from enrollment
    "correlatnId": "Gg6yTAyWkmhyq0jPKHziafe"  // Unique correlation ID (max 23 chars)
  },
  "Body": {
    "Tx": {
      "TxAttr": ["INST"],                 // Transaction attributes (INST = instant)
      "TxId": {
        "LclDtTm": "2024-11-13T10:30:00"  // Local date/time (YYYY-MM-DDTHH:mm:ss)
      },
      "TxAmts": {
        "AmtQlfr": "ESTM",                // Amount qualifier (ESTM = estimated)
        "TxAmt": {
          "Ccy": "840",                   // Currency code (840 = USD)
          "Amt": "123.45"                 // Transaction amount
        }
      }
    },
    "Envt": {
      "Accptr": {
        "PaymentFacltId": "52014057",     // Payment facility ID
        "Accptr": "520142254322",         // Acceptor/merchant ID
        "CstmrSvc": "1 4155552235",       // Customer service phone
        "Adr": {
          "PstlCd": "94404",              // Postal code
          "CtrySubDvsnMjr": "06",         // State/province code
          "Ctry": "US",                   // Country code (ISO 3166-1 alpha-2)
          "CtrySubDvsnMnr": "081"         // County/district code
        }
      },
      "Termnl": {
        "TermnlId": {
          "Id": "10012343"                // Terminal ID
        }
      },
      "Card": {
        "PlainCardData": {
          "PAN": "4957030420210454",      // Primary account number
          "CardSeqNb": "01",              // Card sequence number
          "XpryDt": "2512"                // Expiry date (YYMM)
        }
      }
    },
    "Cntxt": {
      "TxCntxt": {
        "MrchntCtgyCd": "4814"            // Merchant category code
      },
      "PtOfSvcCntxt": {
        "CardDataNtryMd": "CICC"          // Card data entry mode (CICC = chip, KEYD = keyed)
      }
    }
  }
}
```

### Optional Fields

#### Transaction Description
```javascript
{
  "Tx": {
    "TxDesc": "Payment for services"      // Transaction description (max length varies)
  }
}
```

#### Additional Data
```javascript
{
  "Tx": {
    "AddtlData": {
      "Val": "freeformdata",              // Free-form data
      "Tp": "FreeFormDescData"            // Type of additional data
    }
  }
}
```

#### Card Verification Value (CVV)
```javascript
{
  "Envt": {
    "Card": {
      "CardCtryCd": "US",
      "CardData": {
        "Cvc": "123"                      // Card verification code
      }
    }
  }
}
```

#### Cardholder Information
```javascript
{
  "Envt": {
    "Crdhldr": {
      "Nm": "John Doe"                    // Cardholder name
    }
  }
}
```

#### E-Commerce Data (for online transactions)
```javascript
{
  "Cntxt": {
    "PtOfSvcCntxt": {
      "CardDataNtryMd": "KEYD",           // KEYD for e-commerce
      "EComrcData": [
        {
          "Val": "3",                     // E-commerce indicator value
          "Tp": "ECI"                     // Type: ECI
        }
      ]
    }
  }
}
```

### Response Structure

**Success Response (200 OK):**

```javascript
{
  "msgIdentfctn": {
    "reqstId": "14312E380A7211FC72861E215BAB9C99",  // Request ID
    "correlatnId": "Gg6yTAyWkmhyq0jPKHziafe",        // Correlation ID from request
    "id": "382056700290001"                         // Authorization ID
  },
  "Body": {
    "PrcgRslt": {
      "RsltData": {
        "RsltDtls": "00",                 // Result code (00 = Approved)
        "Rslt": "Approved"                // Result text
      },
      "ApprvlData": {
        "ApprvlCd": "123456"              // Approval code
      }
    },
    "Tx": {
      "TxAmts": {
        "TxAmt": {
          "Ccy": "8",
          "Amt": "123.45"
        }
      }
    },
    "Envt": {
      "Card": {
        "CardPrtflIdr": "292334",         // Card portfolio identifier
        "PmtAccRef": "V0010013822066687991488028016",  // Payment account reference
        "CardPdctTp": "F"                 // Card product type
      }
    }
  }
}
```

### Result Codes

| Code | Description |
|------|-------------|
| 00 | Approved |
| 05 | Do not honor |
| 14 | Invalid card number |
| 41 | Lost card, pick up |
| 43 | Stolen card, pick up |
| 51 | Insufficient funds |
| 54 | Expired card |
| 55 | Incorrect PIN |
| 57 | Transaction not permitted to cardholder |
| 58 | Transaction not permitted to terminal |
| 61 | Exceeds withdrawal amount limit |
| 65 | Exceeds withdrawal frequency limit |
| 91 | Issuer or switch inoperative |
| 96 | System malfunction |

---

## 2. Void Authorization (with ID)

**Endpoint:** `POST /acs/v3/payments/authorizations/{id}/voids`

**Description:** Void/cancel a previously authorized transaction using its authorization ID.

### Required Fields

```javascript
{
  "msgIdentfctn": {
    "clientId": "1VISAGCT000001",
    "correlatnId": "Gg6yTAyWkmhyq0jPKHziafG"
  },
  "Body": {
    "Tx": {
      "TxAttr": ["INST"],
      "AltrnMsgRsn": "2501",              // Void reason code
      "TxAmts": {
        "TxAmt": {
          "Amt": "123.45"                 // Amount to void (should match original)
        }
      }
    },
    "Envt": {
      "Accptr": {
        "PaymentFacltId": "52014057",
        "Accptr": "520142254322",
        "CstmrSvc": "1 4155552235",
        "Adr": {
          "PstlCd": "94404",
          "CtrySubDvsnMjr": "06",
          "Ctry": "US",
          "CtrySubDvsnMnr": "081"
        }
      },
      "Termnl": {
        "TermnlId": {
          "Id": "10012343"
        }
      }
    },
    "Cntxt": {
      "TxCntxt": {
        "MrchntCtgyCd": "4814"
      },
      "PtOfSvcCntxt": {
        "CardDataNtryMd": "CDFL"          // Card data not available
      }
    }
  }
}
```

### Void Reason Codes

| Code | Description |
|------|-------------|
| 2501 | Merchant/customer cancellation |
| 2502 | Duplicate transaction |
| 2503 | Declined transaction |
| 2504 | Timeout/no response |

### Response Structure

```javascript
{
  "msgIdentfctn": {
    "reqstId": "14312E380A7211FC72861E215BAB9C99",
    "correlatnId": "Gg6yTAyWkmhyq0jPKHziafG",
    "id": "382066735140001"               // Void transaction ID
  },
  "Body": {
    "PrcgRslt": {
      "RsltData": {
        "RsltDtls": "00",                 // Result code
        "Rslt": "Processed"               // Result text
      }
    },
    "Tx": {
      "TxAmts": {
        "TxAmt": {
          "Ccy": "8",
          "Amt": "123.45"
        }
      }
    }
  }
}
```

---

## 3. Void Authorization (without ID)

**Endpoint:** `POST /acs/v3/payments/authorizations/voids`

**Description:** Void/cancel an authorization without using a resource ID (using transaction details instead).

### Required Fields

Same structure as void with ID, but no {id} in URL path.

---

## Card Data Entry Modes

| Code | Description | Use Case |
|------|-------------|----------|
| CICC | ICC (Chip) | Chip card inserted |
| CDFL | Card data on file | Recurring/stored credentials |
| KEYD | Keyed | Manual entry (e-commerce) |
| MGST | Magnetic stripe | Card swiped |
| CTLS | Contactless | Tap/NFC payment |

---

## Merchant Category Codes (Common)

| MCC | Description |
|-----|-------------|
| 4814 | Telecommunication services |
| 4816 | Computer network/information services |
| 5411 | Grocery stores, supermarkets |
| 5812 | Eating places, restaurants |
| 5814 | Fast food restaurants |
| 5912 | Drug stores and pharmacies |
| 5999 | Miscellaneous retail stores |
| 6011 | Financial institutions - manual cash |
| 6012 | Financial institutions - merchandise and services |
| 7372 | Computer programming, data processing |
| 7995 | Betting/casino gambling |

---

## Transaction Attributes

| Attribute | Description |
|-----------|-------------|
| INST | Instant/real-time transaction |
| AGGR | Aggregated transaction |
| RECC | Recurring transaction |
| INST_RECC | Instant recurring |

---

## Amount Qualifiers

| Qualifier | Description |
|-----------|-------------|
| ESTM | Estimated amount |
| FINL | Final amount |

---

## Currency Codes (ISO 4217)

| Code | Currency |
|------|----------|
| 008 | Albanian Lek |
| 036 | Australian Dollar |
| 124 | Canadian Dollar |
| 826 | British Pound |
| 840 | US Dollar |
| 978 | Euro |
| 392 | Japanese Yen |

---

## Environment Variables

Add to `.env`:

```bash
# VisaNet Connect Configuration
VISA_CLIENT_ID=1VISAGCT000001
VISA_PAYMENT_FACILITY_ID=52014057
VISA_ACCEPTOR_ID=520142254322
VISA_CUSTOMER_SERVICE=1 4155552235

# Acceptor Address
VISA_ACCEPTOR_ZIP=94404
VISA_ACCEPTOR_STATE_CODE=06        # California
VISA_ACCEPTOR_COUNTY_CODE=081
VISA_ACCEPTOR_COUNTRY_ALPHA2=US

# Terminal
VISA_TERMINAL_ID=10012343
```

---

## Security Considerations

1. **Never log full PAN**: Always mask card numbers in logs (show first 6 and last 4 only)
2. **Use HTTPS only**: All API calls must use TLS 1.2 or higher
3. **Validate CVV**: Always request CVV for card-not-present transactions
4. **Store correlation IDs**: Keep correlation IDs for debugging and reconciliation
5. **Implement timeouts**: Set reasonable timeout values (30-60 seconds)
6. **Handle retries carefully**: Avoid duplicate authorizations on retries

---

## Best Practices

1. **Correlation ID Format**: Use unique, traceable IDs (timestamp + random)
2. **Amount Formatting**: Always use string format with proper decimal places
3. **Error Handling**: Parse and log detailed error responses
4. **Idempotency**: Use correlation IDs to prevent duplicate processing
5. **Testing**: Use Visa's test card numbers in sandbox environment
6. **Monitoring**: Track authorization approval rates and response times

---

## Integration Flow

### Standard Authorization Flow

1. **Collect Payment Info**: Get card details from customer
2. **Create Authorization**: Call `/acs/v3/payments/authorizations`
3. **Check Response**: Verify `Rslt` field for approval
4. **Store Auth ID**: Save authorization ID for potential void/capture
5. **Handle Result**: Process approved/declined accordingly

### Void Flow

1. **Retrieve Auth ID**: Get authorization ID from original transaction
2. **Create Void Request**: Call `/acs/v3/payments/authorizations/{id}/voids`
3. **Verify Result**: Check that void was processed
4. **Update Records**: Mark transaction as voided

---

## Testing

**Test Cards** (Visa Developer Portal):
- `4957030420210454` - Approved
- `4400000000000008` - Declined (insufficient funds)
- `4400000000000016` - Declined (invalid card)

**Test Amounts:**
- `$1.00 - $99.99` - Approved
- `$100.00` - Declined (do not honor)
- `$101.00` - Declined (insufficient funds)

---

## Error Handling

**400 Bad Request** - Invalid request format or missing required fields
**401 Unauthorized** - Invalid credentials
**404 Not Found** - Authorization ID not found (for void with ID)
**500 Internal Server Error** - System error

Always check the response body for detailed error information.

---

## References

- Full OpenAPI Spec: `/config/api_reference (2).json`
- Visa Developer Portal: https://developer.visa.com
- VisaNet Connect Documentation: https://developer.visa.com/capabilities/visanet
- ISO Standards: ISO 8583, ISO 4217 (currency codes), ISO 3166 (country codes)

---

**Last Updated:** November 2025
