# Visa Developer Platform Setup Guide

## Login Credentials
- **Portal URL**: https://developer.visa.com/login/
- **Email**: [Contact LocaPay admin for credentials]
- **Password**: [Contact LocaPay admin for credentials]

## Steps to Get API Credentials

### 1. Login to Visa Developer Portal
1. Go to https://developer.visa.com/login/
2. Use your LocaPay credentials (contact admin if needed)
3. Click "Sign In"

### 2. Navigate to Your Project
1. After login, go to **Dashboard**
2. Click on your project (or create a new one if needed)
3. Select **Visa Direct** API from the available APIs

### 3. Get API Credentials

#### Option A: From Project Dashboard
1. Click on your project name
2. Go to **Credentials** tab
3. You'll find:
   - **User ID** (also called Project ID or App ID)
   - **Password** (also called Shared Secret)
   - Click "Show" to reveal the password

#### Option B: From API Documentation
1. In your project, click **API Reference**
2. Click **Get Credentials**
3. Copy the displayed credentials

### 4. Download Certificates

**IMPORTANT**: Visa requires mutual TLS authentication

1. In your project dashboard, go to **Certificates** or **Credentials** section
2. Download the following files:
   - **Client Certificate** (`cert.pem` or `cert.crt`)
   - **Private Key** (`key.pem` or `private.key`)
   - **CA Certificate** (`ca.pem` or `VDPCA-SBX.pem` for sandbox)

3. Save these files to the `certs/` directory in this project:
   ```bash
   cp ~/Downloads/cert.pem ./certs/cert.pem
   cp ~/Downloads/key.pem ./certs/key.pem
   cp ~/Downloads/VDPCA-SBX.pem ./certs/ca.pem
   ```

4. Set proper permissions:
   ```bash
   chmod 600 ./certs/*.pem
   ```

### 5. Update .env File

Once you have your credentials, update the `.env` file:

```env
# Replace these with actual values from Visa Developer Dashboard
VISA_USER_ID=your_actual_user_id_from_dashboard
VISA_PASSWORD=your_actual_password_from_dashboard

# Certificate paths (should already be correct)
VISA_CERT_PATH=./certs/cert.pem
VISA_KEY_PATH=./certs/key.pem
VISA_CA_PATH=./certs/ca.pem
```

### 6. Configure Additional Settings

You may also need to get/configure:

1. **Acquiring BIN** (Bank Identification Number)
   - Found in project settings or Visa representative
   - Usually a 6-digit number (e.g., 408999)
   - Update in `.env`: `VISA_ACQUIRING_BIN=408999`

2. **Merchant ID**
   - Your merchant identifier
   - Update in `.env`: `VISA_MERCHANT_ID=LOCAPAY001`

### 7. Test Your Configuration

Run the test script to verify your credentials:

```bash
npm run test:visa-connection
```

Or manually test:

```bash
curl -X POST https://sandbox.api.visa.com/visadirect/fundstransfer/v1/pushfundstransactions \
  --cert ./certs/cert.pem \
  --key ./certs/key.pem \
  --cacert ./certs/ca.pem \
  -u "USER_ID:PASSWORD" \
  -H "Content-Type: application/json"
```

## Webhook Configuration

### 1. Register Webhook URL

1. In your Visa project dashboard
2. Go to **Webhooks** or **Notifications** section
3. Add webhook URL: `https://www.locapay.rydlr.com/visanet/webhook`
4. Select events to receive:
   - Transaction Completed
   - Transaction Failed
   - Transaction Reversed

### 2. Get Webhook Secret

1. After registering the webhook, Visa will provide a **Webhook Secret**
2. Copy this secret
3. Update `.env`:
   ```env
   WEBHOOK_SECRET=your_webhook_secret_from_visa
   ```

## Environment Types

### Sandbox (Testing)
- API URL: `https://sandbox.api.visa.com`
- Use sandbox certificates
- Test card numbers provided by Visa
- No real money transactions

### Production
- API URL: `https://api.visa.com`
- Use production certificates
- Real transactions with real money
- Requires additional compliance and approval

## Common Issues & Solutions

### Issue: "Certificate verification failed"
**Solution**: 
- Ensure certificates are in PEM format
- Check file paths in `.env`
- Verify certificate permissions (should be 600)

### Issue: "Authentication failed"
**Solution**:
- Double-check User ID and Password
- Ensure no extra spaces in credentials
- Verify you're using API credentials, not portal login credentials

### Issue: "Invalid request format"
**Solution**:
- Check API documentation for correct payload format
- Ensure all required fields are included
- Verify Content-Type header is `application/json`

### Issue: "Webhook not receiving events"
**Solution**:
- Verify webhook URL is accessible from internet
- Check SSL certificate is valid for your domain
- Ensure webhook secret is correctly configured
- Check Visa dashboard for webhook delivery logs

## Next Steps

1. ✅ Login to Visa Developer Portal
2. ⬜ Create/access your project
3. ⬜ Add Visa Direct API to project
4. ⬜ Get API credentials (User ID & Password)
5. ⬜ Download certificates (cert.pem, key.pem, ca.pem)
6. ⬜ Update `.env` file with credentials
7. ⬜ Test API connection
8. ⬜ Configure webhook URL
9. ⬜ Test webhook delivery
10. ⬜ Start development!

## Support Resources

- **Visa Developer Portal**: https://developer.visa.com
- **API Documentation**: https://developer.visa.com/capabilities/visa_direct
- **Community Forum**: https://community.developer.visa.com
- **Support Email**: Check your Visa Developer dashboard for contact info

## Security Reminders

⚠️ **NEVER commit these files to git**:
- `.env` (contains secrets)
- `certs/*.pem` (contains private keys)
- Any file with API credentials

✅ **Always**:
- Use `.gitignore` to exclude sensitive files
- Rotate credentials if accidentally exposed
- Use different credentials for development/production
- Enable 2FA on Visa Developer account
