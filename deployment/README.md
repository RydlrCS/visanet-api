# Production Deployment - File Summary

This directory contains all necessary files for deploying the Rydlr Visanet API to production on your Virtualmin server (locapay.rydlr.com).

## Created Files

### 1. `.env.production` (105 lines)
**Purpose**: Production environment configuration template

**Key Sections**:
- Server configuration (Node.js, port, host)
- MariaDB database credentials
- Domain and CORS settings
- JWT and session secrets
- Visa Direct API credentials
- SSL certificate paths
- Email/SMTP configuration
- Logging and file upload settings
- Backup configuration

**Action Required**: 
- Copy to `.env` and update all placeholder values
- Generate secure secrets for JWT and sessions
- Add your Visa API credentials

---

### 2. `deployment/setup-database.sh` (258 lines)
**Purpose**: Automated MariaDB database setup script

**Features**:
- Creates `rydlr_locapay` database
- Creates `rydlr` database user with secure password
- Sets up 7 tables:
  - `users` - User accounts with authentication
  - `cards` - Encrypted card information
  - `transactions` - Payment transactions with Visa integration
  - `notifications` - User notifications
  - `invoices` - Billing and invoices
  - `api_keys` - API key management
  - `audit_logs` - Security and compliance logging
- Inserts test user accounts
- Generates credentials file with proper permissions

**Usage**:
```bash
sudo bash deployment/setup-database.sh
```

---

### 3. `deployment/deploy.sh` (145 lines)
**Purpose**: Complete application deployment automation

**Features**:
- Checks user permissions (must run as `rydlr`)
- Installs Node.js 20 via nvm
- Installs PM2 process manager globally
- Clones/updates git repository
- Installs backend dependencies
- Builds frontend React application
- Creates necessary directories (logs, uploads, backups, ssl)
- Generates PM2 ecosystem configuration
- Starts application in cluster mode (2 instances)
- Sets up PM2 startup script

**Usage**:
```bash
cd /home/rydlr/domains/locapay.rydlr.com
bash deployment/deploy.sh
```

---

### 4. `deployment/apache-config.conf` (92 lines)
**Purpose**: Apache virtual host configuration

**Features**:
- HTTP to HTTPS redirect (port 80 → 443)
- SSL certificate configuration
- Security headers (HSTS, XSS protection, CSP, etc.)
- WebSocket proxy support
- API request proxying to Node.js (port 3000)
- Static file serving for React frontend
- SPA routing (all routes → index.html)
- Gzip compression for responses
- Static asset caching (1 year for images, 1 month for CSS/JS)
- Comprehensive logging

**Installation**:
```bash
sudo cp deployment/apache-config.conf /etc/apache2/sites-available/locapay.rydlr.com.conf
sudo a2ensite locapay.rydlr.com.conf
sudo systemctl reload apache2
```

---

### 5. `deployment/DEPLOYMENT_GUIDE.md` (520+ lines)
**Purpose**: Step-by-step deployment instructions

**Contents**:
- Server prerequisites and requirements
- 7-step deployment process
- Environment configuration guide
- Apache virtual host setup
- SSL certificate installation (Let's Encrypt + manual)
- Application startup and verification
- PM2 command reference
- Update/maintenance procedures
- Backup automation scripts
- Troubleshooting guide
- Security checklist
- Monitoring and health checks

---

### 6. `config/database.js` (Updated - 340+ lines)
**Purpose**: MariaDB database adapter (replaces MongoDB/Mongoose)

**Features**:
- MySQL2 connection pool with automatic reconnection
- Transaction support with rollback
- Query builder functions for SELECT, INSERT, UPDATE
- WHERE clause builder with parameterization
- Generic CRUD operations (findOne, findMany, create, update, delete)
- UUID generation
- Automatic timestamp handling
- SQL injection protection via prepared statements
- Backward compatibility with old `connectDB()` API

**Migration Notes**:
- Changed from Mongoose (MongoDB) to mysql2/promise (MariaDB)
- Exports both old API (`connectDB`) and new API (`db` object)
- Models will need to be updated to use new adapter

---

## Deployment Workflow

### Quick Start
```bash
# 1. SSH to server
ssh rydlr@102.219.23.35

# 2. Navigate to domain directory
cd /home/rydlr/domains/locapay.rydlr.com

# 3. Run deployment script
bash deployment/deploy.sh

# 4. Configure environment
nano visanet-api/.env  # Update secrets and credentials

# 5. Setup database (as root/sudo)
sudo bash visanet-api/deployment/setup-database.sh

# 6. Configure Apache (as root/sudo)
sudo cp visanet-api/deployment/apache-config.conf /etc/apache2/sites-available/locapay.rydlr.com.conf
sudo a2ensite locapay.rydlr.com.conf
sudo systemctl reload apache2

# 7. Restart application
cd visanet-api
pm2 restart rydlr-visanet-api
```

### Required Apache Modules
```bash
sudo a2enmod proxy proxy_http proxy_wstunnel headers rewrite ssl
sudo systemctl restart apache2
```

---

## Environment Variables to Configure

### Critical (Must Update)
- `DB_PASSWORD` - Database password from setup-database.sh
- `JWT_SECRET` - Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- `JWT_REFRESH_SECRET` - Generate unique secret
- `SESSION_SECRET` - Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `VISA_USER_ID` - From Visa Developer Portal
- `VISA_PASSWORD` - From Visa Developer Portal

### Optional (Configure if Using)
- `VISA_CERT_PATH` - Path to Visa client certificate
- `VISA_KEY_PATH` - Path to Visa client key
- `MLE_CLIENT_ENCRYPTION_KEY_ID` - For Visa MLE
- `SMTP_USER` / `SMTP_PASS` - For email notifications

---

## Database Schema

### Tables Created
1. **users** - User accounts (id, email, password, businessName, role)
2. **cards** - Card storage (encrypted, with billing address)
3. **transactions** - Payment records (Visa Direct integration)
4. **notifications** - User alerts (type, title, message, isRead)
5. **invoices** - Billing (invoiceNumber, amount, status, items JSON)
6. **api_keys** - API key management (keyName, isActive, expiresAt)
7. **audit_logs** - Security logging (action, resource, ipAddress, metadata)

### Test Accounts
- `test@rydlr.com` / `Test123!@#`
- `admin@rydlr.com` / `Admin123!@#`

---

## PM2 Management

### Start Application
```bash
cd /home/rydlr/domains/locapay.rydlr.com/visanet-api
pm2 start ecosystem.config.js
```

### Monitor & Logs
```bash
pm2 status                           # View status
pm2 logs rydlr-visanet-api          # Live logs
pm2 logs rydlr-visanet-api --err    # Error logs only
pm2 monit                            # Resource monitoring
```

### Restart & Reload
```bash
pm2 restart rydlr-visanet-api       # Hard restart
pm2 reload rydlr-visanet-api        # Zero-downtime reload
```

---

## SSL Certificate Setup

### Option A: Let's Encrypt (Recommended)
```bash
sudo apt-get install certbot python3-certbot-apache
sudo certbot --apache -d locapay.rydlr.com
```

### Option B: Manual Certificate
Place certificates in:
- `/home/rydlr/domains/locapay.rydlr.com/ssl/cert.pem`
- `/home/rydlr/domains/locapay.rydlr.com/ssl/key.pem`
- `/home/rydlr/domains/locapay.rydlr.com/ssl/chain.pem`

Set permissions:
```bash
sudo chmod 600 /home/rydlr/domains/locapay.rydlr.com/ssl/*.pem
sudo chown rydlr:rydlr /home/rydlr/domains/locapay.rydlr.com/ssl/*.pem
```

---

## Health Checks

### Backend API
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "database": "connected"
}
```

### Frontend
```bash
curl https://locapay.rydlr.com
```

### Database Connection
```bash
mysql -u rydlr -p rydlr_locapay
```

---

## Next Steps (After Deployment)

### 1. Database Migration
- [ ] Update Mongoose models to use new MariaDB adapter
- [ ] Convert model schemas to SQL table definitions
- [ ] Update all model queries to use `db` object from `config/database.js`

### 2. Testing
- [ ] Test user registration and login
- [ ] Test card creation and encryption
- [ ] Test transaction creation (Visa Direct)
- [ ] Test notification system
- [ ] Test invoice generation

### 3. Security
- [ ] Review and harden firewall rules
- [ ] Enable fail2ban for SSH protection
- [ ] Configure automated backups
- [ ] Set up monitoring alerts
- [ ] Review audit logs regularly

### 4. Monitoring
- [ ] Install PM2 log rotation: `pm2 install pm2-logrotate`
- [ ] Set up uptime monitoring (e.g., UptimeRobot)
- [ ] Configure error alerts (e.g., Sentry)
- [ ] Monitor database performance

### 5. Documentation
- [ ] Document API endpoints
- [ ] Create user onboarding guide
- [ ] Document backup/restore procedures
- [ ] Create incident response plan

---

## Troubleshooting

### Application won't start
```bash
pm2 logs rydlr-visanet-api --err --lines 100
```

### Database connection errors
```bash
mysql -u rydlr -p -e "SELECT 1;"
```

### 502 Bad Gateway
```bash
pm2 status
curl http://localhost:3000/api/health
sudo tail -f /var/log/apache2/error.log
```

---

## Support

- **Technical Support**: support@rydlr.com
- **Visa Developer Support**: https://developer.visa.com/support
- **Server Admin**: admin@rydlr.com

---

## Files Modified

### Backend Configuration
- `config/database.js` - Converted from MongoDB to MariaDB adapter

### Models (Require Update)
- `models/User.js` - Need to convert from Mongoose to MariaDB
- `models/Card.js` - Need to convert from Mongoose to MariaDB
- `models/Transaction.js` - Need to convert from Mongoose to MariaDB

### Services (May Require Updates)
- `services/visaDirect.js` - Check database queries
- `services/visaNet.js` - Check database queries

### Routes (May Require Updates)
- `routes/auth.js` - Check User model usage
- `routes/cards.js` - Check Card model usage
- `routes/transactions.js` - Check Transaction model usage

---

**Last Updated**: January 2025  
**Server**: locapay.rydlr.com (102.219.23.35)  
**Platform**: Virtualmin + Apache + MariaDB + Node.js + PM2
