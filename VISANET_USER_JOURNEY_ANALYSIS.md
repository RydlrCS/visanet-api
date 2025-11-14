# VisaNet User Journey - Extracted from PDF

## Parsed User Journey Flow

Based on the extracted PDF, here's the complete user journey structure:

### 1. **Authentication Flow**
- **Login Screen**
- **Sign Up**
- **Forget Password flow**
  - Email + verification code
  - Add new password

### 2. **Dashboard (Main Hub)**
- **Account Type Screen**
- **Country**
- **2FA**
- **Password**

### 3. **Payment Flows**
#### Payment to New Merchant
- Add Details Screen
- Amount/Transaction Screen
- Transaction complete
- Invoice Download

#### Payment to Recurring User
- Amount/Transaction Screen
- Transaction complete
- Invoice Download

### 4. **Transaction Management**
- **Transaction History**
  - All History Screen
  - Particular transaction (Details screen)
  - All Transactions
- **Transaction Graph**

### 5. **Invoices**
- All Invoices view
- Invoice downloaded modal

### 6. **Notifications**
- All Notifications Page

### 7. **Banking**
- **Add Bank**
- **Verify your business**

### 8. **Profile & Settings**
- **Profile**
- **Business Information Screen**
- **Delete Account**
  - Confirmation Modal
- **Customer Support**
  - Help Desk

### 9. **Reporting**
- **Reports**
- **Transaction Graph**

---

## UI Alignment Analysis

### ✅ Already Implemented:
1. ✅ Login Screen
2. ✅ Sign Up
3. ✅ Dashboard
4. ✅ Transaction History (All History Screen, All Transactions)
5. ✅ Cards Management (similar to "Add Bank")

### ❌ Missing Features (To Implement):
1. ❌ **Forgot Password Flow**
   - Email verification
   - Password reset
   
2. ❌ **Account Type Screen**
   - Account type selection during onboarding
   
3. ❌ **2FA (Two-Factor Authentication)**
   - Setup and verification
   
4. ❌ **Payment Flows**
   - Payment to New Merchant
   - Payment to Recurring User
   - Add Details Screen
   - Amount/Transaction Screen
   
5. ❌ **Transaction Details**
   - Particular transaction view
   - Invoice download functionality
   
6. ❌ **Invoices Module**
   - All invoices list
   - Invoice download modal
   
7. ❌ **Notifications**
   - All Notifications Page
   - Notification center
   
8. ❌ **Banking Module**
   - Add Bank functionality
   - Business verification
   
9. ❌ **Profile & Settings**
   - Profile management
   - Business Information
   - Delete Account with confirmation
   - Customer Support
   - Help Desk
   
10. ❌ **Reports & Analytics**
    - Reports dashboard
    - Transaction graphs

---

## Recommended Implementation Priority

### Phase 3 (Critical):
1. **Payment Flows** (Core functionality)
   - New Transaction form (Payment to new merchant)
   - Recurring payment support
   - Transaction details view
   
2. **Transaction Complete & Invoice**
   - Success screen
   - Invoice generation/download

### Phase 4 (Important):
3. **Profile & Settings**
   - Profile management
   - Business information
   - Account settings
   
4. **Forgot Password**
   - Email verification
   - Password reset flow

### Phase 5 (Enhanced Features):
5. **Notifications System**
   - Notification center
   - Real-time alerts
   
6. **Invoices Management**
   - List all invoices
   - Download functionality
   
7. **Banking & Verification**
   - Add bank accounts
   - Business verification process
   
8. **Reports & Analytics**
   - Transaction graphs
   - Analytics dashboard
   
9. **2FA Security**
   - Two-factor authentication setup
   - Verification codes

### Phase 6 (Support):
10. **Customer Support**
    - Help desk
    - Support tickets
    - Delete account flow

---

## Updated User Journey Map

```
┌─────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION                           │
│  Login → Sign Up → Forgot Password → Email Verification     │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                     ONBOARDING                               │
│  Account Type → Country → 2FA Setup → Password              │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      DASHBOARD                               │
│  Stats → Quick Actions → Recent Transactions → Navigation   │
└─────┬───────────┬────────────┬─────────────┬────────────────┘
      ↓           ↓            ↓             ↓
   PAYMENTS   TRANSACTIONS  INVOICES    NOTIFICATIONS
      │           │            │             │
      ├─ New      ├─ History   ├─ All        └─ All
      │  Merchant │            │  Invoices      Notifications
      │           ├─ Details   │
      └─ Recurring└─ Graph    └─ Download
                                  Modal
      
┌─────────────────────────────────────────────────────────────┐
│                    SETTINGS & SUPPORT                        │
│  Profile → Business Info → Banking → Reports → Help Desk    │
│           → Delete Account → Verify Business                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

To fully align with the PDF user journey, we need to implement the missing features in priority order. The current implementation covers the basic flow but is missing:

1. **Payment processing screens** (most critical)
2. **Invoice management**
3. **Notifications center**
4. **Profile/Settings**
5. **Banking & verification**
6. **Reports & analytics**
7. **Support features**

Would you like me to proceed with implementing these features?
