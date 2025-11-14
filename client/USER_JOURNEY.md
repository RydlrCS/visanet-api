# LocaPay UI - User Journey Documentation

## Overview
LocaPay is a comprehensive payment processing application built with React, TypeScript, Vite, and Tailwind CSS. This document outlines the complete user journey through the application.

## User Journey Flow

### 1. **Authentication** (Entry Point)
**Routes:** `/login`, `/register`

**User Journey:**
- New users start at `/register` to create an account
  - Enter: Email, Password, First Name, Last Name
  - Validation: Email format, password strength, field requirements
  - On success: Auto-login and redirect to Dashboard
  
- Existing users start at `/login`
  - Enter: Email, Password
  - Validation: Required fields, email format
  - On success: Redirect to Dashboard
  - Failed auth: Clear error message with retry option

**Features:**
- ✅ Form validation with real-time feedback
- ✅ Comprehensive error handling
- ✅ Verbose logging for debugging
- ✅ JWT token storage in localStorage
- ✅ Auto-redirect to dashboard on successful auth

---

### 2. **Dashboard** (Main Hub)
**Route:** `/dashboard`

**Purpose:** Central command center showing account overview and quick actions

**User Journey:**
1. User lands on dashboard after login
2. Views key metrics at a glance:
   - Total Transactions count
   - Successful Transactions count
   - Failed Transactions count
   - Total Amount processed

3. Reviews recent transactions table with:
   - Transaction ID
   - Type (authorization, push, pull, void, reversal)
   - Amount and Currency
   - Status badge (completed, pending, failed, voided)
   - Date/Time
   - Quick action buttons

4. Access quick actions:
   - **New Transaction** → Create payment/transfer
   - **Add Payment Card** → Add new card for processing
   - **Account Settings** → Manage profile

5. Navigate to detailed views:
   - **Manage Cards** → Full card management
   - **View Transactions** → Complete transaction history
   - **Logout** → Exit application

**Features:**
- ✅ Real-time statistics loading
- ✅ Paginated recent transactions
- ✅ Status-based color coding
- ✅ Quick navigation to all major features
- ✅ Responsive grid layout
- ✅ Error handling with retry capability

---

### 3. **Card Management** (Payment Methods)
**Route:** `/cards`

**Purpose:** Manage payment cards before processing transactions

**User Journey:**
1. User navigates from Dashboard → "Manage Cards"
2. Views all saved payment cards in grid layout
3. Each card displays:
   - Masked card number (**** **** **** 1234)
   - Cardholder name
   - Expiry date
   - Default card indicator
   - Card brand icon

4. User actions:
   - **Add New Card** → Navigate to add card form
   - **Set as Default** → Mark card as primary for transactions
   - **Delete** → Remove card (with confirmation)

5. Empty state: 
   - Friendly message prompting to add first card
   - Direct "Add Your First Card" button

**Features:**
- ✅ Grid view of all cards
- ✅ Visual distinction for default card (ring border)
- ✅ Secure display (last 4 digits only)
- ✅ Confirmation before deletion
- ✅ Success/error notifications
- ✅ Auto-refresh after actions

**Next Steps:** 
- Add card form (`/cards/add`) - To be implemented
- Card editing capabilities

---

### 4. **Transaction Management** (Core Feature)
**Route:** `/transactions`

**Purpose:** View complete transaction history with filtering

**User Journey:**
1. User navigates from Dashboard → "View Transactions"
2. Views paginated transaction list (10 per page)
3. Filters transactions by status:
   - All
   - Completed
   - Pending
   - Failed
   - Voided

4. Each transaction shows:
   - Unique Transaction ID
   - Type (authorization, void, push, pull, reversal)
   - Amount with currency
   - Status with color-coded badge
   - Date and time
   - Action buttons

5. User actions:
   - **View** → See transaction details
   - **Void** → Cancel completed authorization (if applicable)
   - **Pagination** → Navigate through pages

6. Create new transaction:
   - Click "New Transaction" button
   - Navigate to transaction form

**Features:**
- ✅ Server-side pagination (First, Previous, Next, Last)
- ✅ Status filtering with dropdown
- ✅ Comprehensive transaction table
- ✅ Conditional action buttons (void only for completed auth)
- ✅ Empty state with call-to-action
- ✅ Responsive table design

**Next Steps:**
- Transaction detail view (`/transactions/:id`)
- New transaction form (`/transactions/new`)
- Void transaction functionality

---

## Complete User Flow Sequence

```
1. REGISTER/LOGIN
   ↓
2. DASHBOARD (Overview)
   ↓
3. MANAGE CARDS (Add payment methods)
   ↓
4. CREATE TRANSACTION (Process payment)
   ↓
5. VIEW TRANSACTIONS (Review history)
   ↓
6. TRANSACTION DETAILS (View specifics)
   ↓
7. SETTINGS (Manage account)
```

## Technical Implementation

### Stack
- **Framework:** React 19.2.0
- **Build Tool:** Vite 7.2.2
- **Language:** TypeScript 5.9.3
- **Styling:** Tailwind CSS v4
- **Routing:** React Router DOM
- **HTTP Client:** Axios
- **State Management:** React Context (Auth)

### Code Quality Standards
- ✅ Comprehensive JSDoc comments on all components
- ✅ TypeScript strict typing throughout
- ✅ Verbose entry/exit logging for debugging
- ✅ Error boundary and error handling
- ✅ Form validation with user feedback
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Accessibility (ARIA labels, semantic HTML)

### API Integration
All components integrate with backend API:
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/transactions` - Paginated transactions list
- `GET /api/cards` - User's saved cards
- `DELETE /api/cards/:id` - Delete card
- `PUT /api/cards/:id/default` - Set default card

### Security
- JWT token authentication
- Token stored in localStorage
- Auto-redirect on 401 Unauthorized
- Token included in all authenticated requests
- Secure card display (masked numbers)

## Future Enhancements

### Phase 3 (To Implement)
1. **Add Card Form** (`/cards/add`)
   - Card number, CVV, expiry input
   - Real-time validation
   - Luhn algorithm for card validation

2. **New Transaction Form** (`/transactions/new`)
   - Select transaction type (authorization, push, pull)
   - Choose card from saved cards
   - Enter amount and currency
   - Recipient details (for transfers)

3. **Transaction Detail View** (`/transactions/:id`)
   - Full transaction metadata
   - Visa Direct/VisaNet specific fields
   - Error messages for failed transactions
   - Void/Reverse actions

4. **Account Settings** (`/settings`)
   - Update profile (name, email)
   - Change password
   - View API credentials
   - Security settings

5. **Admin Dashboard** (if applicable)
   - User management
   - System-wide statistics
   - Transaction monitoring

## Navigation Structure

```
/
├── /login (Public)
├── /register (Public)
└── / (Authenticated - redirects to /dashboard)
    ├── /dashboard
    ├── /transactions
    │   ├── /transactions/new (To implement)
    │   └── /transactions/:id (To implement)
    ├── /cards
    │   ├── /cards/add (To implement)
    │   └── /cards/:id (To implement)
    └── /settings (To implement)
```

## Getting Started

### Development
```bash
cd client
npm install
npm run dev
```

### Production Build
```bash
npm run build
```

### Environment Variables
Create `.env.local`:
```
VITE_API_URL=http://localhost:3000/api
```

## Build Stats
- **Bundle Size:** ~299KB JS (95KB gzipped)
- **CSS Size:** ~18KB (4.5KB gzipped)
- **Build Time:** ~3-4 seconds
- **Modules:** 107 transformed

---

**Last Updated:** November 14, 2025
**Version:** 2.0 - User Journey Aligned
