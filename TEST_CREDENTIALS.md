# Rydlr Visanet API - Test Credentials

## Development Environment Test Accounts

### Test User Account
```
Email: test@rydlr.com
Password: Test123!@#
```

### Admin Test Account
```
Email: admin@rydlr.com
Password: Admin123!@#
```

### Demo Account
```
Email: demo@rydlr.com
Password: Demo123!@#
```

## Important Notes

⚠️ **These credentials are for DEVELOPMENT/TESTING purposes only**

- Do NOT use these credentials in production
- Change all default passwords before deploying to production
- Implement proper user authentication and authorization
- Use environment variables for sensitive configuration

## Backend Setup Required

To use these test credentials, you need to:

1. **Start MongoDB**
   ```bash
   # Make sure MongoDB is running
   mongod
   ```

2. **Seed Test Users** (Create a seed script)
   ```bash
   npm run seed:users
   ```

3. **Start the Backend Server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

## API Endpoints

- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:5173
- **API Documentation**: http://localhost:3000/api-docs (if Swagger is configured)

## Test Cards for Visa Direct Testing

### Test Card Numbers (Visa Sandbox)
```
Valid Card: 4111111111111111
Expiry: 12/25
CVV: 123
```

```
Valid Card: 4005520000000129
Expiry: 12/26
CVV: 456
```

## Features to Test

- ✅ Login / Registration
- ✅ Dashboard Overview
- ✅ Add Card Form
- ✅ New Transaction (Push/Pull Funds)
- ✅ Transaction History
- ✅ Transaction Details
- ✅ Profile Settings
- ✅ Notifications Center
- ✅ Invoice Management
- ✅ Forgot Password Flow

## Need Help?

If you encounter any issues:
1. Check that MongoDB is running
2. Verify backend server is running on port 3000
3. Check browser console for errors
4. Review backend logs for API errors

---
**Last Updated**: November 14, 2025
