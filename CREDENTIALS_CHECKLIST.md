# Visa API Credentials Checklist

## ✅ Portal Access
- **URL**: https://developer.visa.com/login/
- **Email**: [Contact LocaPay admin for credentials]
- **Password**: [Contact LocaPay admin for credentials]

---

## 📋 TODO: Get These from Visa Developer Dashboard

### After Login Steps:

1. **Go to Dashboard** → Click your project (or create new project)

2. **Add Visa Direct API** (if not already added)
   - Products → Visa Direct
   - Click "Add to Project"

3. **Get API Credentials** (Credentials Tab)
   ```
   ⬜ VISA_USER_ID: _________________________________
   
   ⬜ VISA_PASSWORD: _________________________________
   ```

4. **Download Certificates** (Certificates/Credentials Section)
   ```
   ⬜ Client Certificate (cert.pem) - Downloaded
   ⬜ Private Key (key.pem) - Downloaded  
   ⬜ CA Certificate (VDPCA-SBX.pem) - Downloaded
   
   Files saved to: /Users/ted/git clone repos/visanet-api/certs/
   ```

5. **Get Webhook Secret** (Webhooks Section)
   ```
   Webhook URL: https://www.locapay.rydlr.com/visanet/webhook
   
   ⬜ WEBHOOK_SECRET: _________________________________
   ```

6. **Optional Configuration**
   ```
   ⬜ VISA_ACQUIRING_BIN: ___________
   
   ⬜ VISA_MERCHANT_ID: ___________
   ```

---

## 🔧 Quick Update Commands

### After getting credentials, update .env:

```bash
# Open .env file
nano .env

# Or use sed to update (replace YOUR_VALUE with actual values):
sed -i '' 's/VISA_USER_ID=.*/VISA_USER_ID=YOUR_ACTUAL_USER_ID/' .env
sed -i '' 's/VISA_PASSWORD=.*/VISA_PASSWORD=YOUR_ACTUAL_PASSWORD/' .env
sed -i '' 's/WEBHOOK_SECRET=.*/WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET/' .env
```

### After downloading certificates:

```bash
# Move certificates to certs folder
mv ~/Downloads/cert.pem ./certs/cert.pem
mv ~/Downloads/key.pem ./certs/key.pem
mv ~/Downloads/VDPCA-SBX.pem ./certs/ca.pem

# Set correct permissions
chmod 600 ./certs/*.pem
```

---

## ✓ Verification

### Test your setup:

```bash
# Run connection test
npm run test:visa

# Expected output:
# ✓ All environment variables configured
# ✓ All certificate files found
# ✓ Connection successful
# ✓ Authentication successful
```

---

## 📞 Support

If you encounter issues:

1. **Check VISA_SETUP_GUIDE.md** - Detailed troubleshooting
2. **Visa Developer Portal** - https://developer.visa.com
3. **Community Forum** - https://community.developer.visa.com
4. **Dashboard** - Check for error messages in your project

---

## 🔐 Security Reminder

✅ DO:
- Keep credentials in .env file (already in .gitignore)
- Use sandbox credentials for development
- Rotate credentials if exposed

❌ DON'T:
- Commit .env or certs to git
- Share credentials in chat/email
- Use production credentials for testing
