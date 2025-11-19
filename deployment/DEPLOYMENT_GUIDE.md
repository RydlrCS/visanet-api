# Rydlr Visanet API - Production Deployment Guide

## Server Information
- **Domain**: locapay.rydlr.com
- **Server IP**: 102.219.23.35
- **Platform**: Virtualmin
- **User**: rydlr
- **App Directory**: /home/rydlr/domains/locapay.rydlr.com/visanet-api
- **Database**: MariaDB

## Prerequisites

### 1. Server Access
Ensure you have SSH access to the server:
```bash
ssh rydlr@102.219.23.35
```

### 2. Required Software
The following should be available on the server:
- Apache web server with SSL
- MariaDB database server
- Git
- Node.js 20+ (will be installed automatically)
- PM2 process manager (will be installed automatically)

### 3. Required Apache Modules
Enable these Apache modules (run as root/sudo):
```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod headers
sudo a2enmod rewrite
sudo a2enmod ssl
sudo systemctl restart apache2
```

## Deployment Steps

### Step 1: Initial Setup

1. **Connect to server**:
```bash
ssh rydlr@102.219.23.35
```

2. **Navigate to domain directory**:
```bash
cd /home/rydlr/domains/locapay.rydlr.com
```

3. **Make deployment script executable**:
```bash
chmod +x deployment/deploy.sh
```

4. **Run deployment script**:
```bash
./deployment/deploy.sh
```

This script will:
- Install Node.js 20 (if not present)
- Install PM2 globally
- Clone/update the repository
- Install dependencies
- Build the frontend
- Create necessary directories
- Set up PM2 process manager
- Start the application

### Step 2: Database Setup

1. **Run database setup script** (requires sudo/root):
```bash
sudo bash deployment/setup-database.sh
```

2. **When prompted**:
   - Enter a secure password for database user 'rydlr'
   - Confirm the password
   - Save credentials from `database-credentials.txt`

3. **Secure credentials file**:
```bash
chmod 600 database-credentials.txt
```

### Step 3: Environment Configuration

1. **Edit environment file**:
```bash
cd visanet-api
nano .env
```

2. **Update the following critical values**:

```env
# Database (use password from database-credentials.txt)
DB_PASSWORD=your_database_password_here

# JWT Security (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=your_very_long_random_jwt_secret_here
JWT_REFRESH_SECRET=another_very_long_random_secret_here

# Session Security (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET=your_session_secret_here

# Visa Direct API Credentials (from Visa Developer Portal)
VISA_USER_ID=your_visa_user_id
VISA_PASSWORD=your_visa_password
VISA_CERT_PATH=/home/rydlr/domains/locapay.rydlr.com/ssl/visa_cert.pem
VISA_KEY_PATH=/home/rydlr/domains/locapay.rydlr.com/ssl/visa_key.pem

# MLE Encryption (if using Visa MLE)
MLE_CLIENT_ENCRYPTION_KEY_ID=your_mle_key_id
MLE_SERVER_DECRYPTION_KEY_ID=your_mle_server_key_id

# Email (SMTP settings)
SMTP_USER=noreply@rydlr.com
SMTP_PASS=your_smtp_password
```

3. **Generate secure secrets**:
```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Session Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. **Save and exit**: Press `Ctrl+X`, then `Y`, then `Enter`

### Step 4: Apache Virtual Host Configuration

1. **Copy Apache configuration** (as root/sudo):
```bash
sudo cp /home/rydlr/domains/locapay.rydlr.com/visanet-api/deployment/apache-config.conf /etc/apache2/sites-available/locapay.rydlr.com.conf
```

2. **Enable the site**:
```bash
sudo a2ensite locapay.rydlr.com.conf
```

3. **Test Apache configuration**:
```bash
sudo apache2ctl configtest
```

4. **Reload Apache**:
```bash
sudo systemctl reload apache2
```

### Step 5: SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)

1. **Install Certbot**:
```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-apache
```

2. **Obtain certificate**:
```bash
sudo certbot --apache -d locapay.rydlr.com
```

3. **Follow prompts** to complete setup

#### Option B: Existing SSL Certificate

If you already have SSL certificates, place them in:
```bash
/home/rydlr/domains/locapay.rydlr.com/ssl/cert.pem
/home/rydlr/domains/locapay.rydlr.com/ssl/key.pem
/home/rydlr/domains/locapay.rydlr.com/ssl/chain.pem
```

Ensure proper permissions:
```bash
sudo chmod 600 /home/rydlr/domains/locapay.rydlr.com/ssl/*.pem
sudo chown rydlr:rydlr /home/rydlr/domains/locapay.rydlr.com/ssl/*.pem
```

### Step 6: Start Application

1. **Navigate to app directory**:
```bash
cd /home/rydlr/domains/locapay.rydlr.com/visanet-api
```

2. **Restart PM2 application**:
```bash
pm2 restart rydlr-visanet-api
```

3. **Check application status**:
```bash
pm2 status
pm2 logs rydlr-visanet-api --lines 50
```

### Step 7: Verify Deployment

1. **Check backend health**:
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

2. **Check frontend**:
```bash
curl https://locapay.rydlr.com
```

3. **Test in browser**:
   - Open https://locapay.rydlr.com
   - Login with test credentials:
     - Email: test@rydlr.com
     - Password: Test123!@#

## PM2 Commands

### View application status
```bash
pm2 status
```

### View logs
```bash
pm2 logs rydlr-visanet-api
pm2 logs rydlr-visanet-api --lines 100
pm2 logs rydlr-visanet-api --err  # Error logs only
```

### Restart application
```bash
pm2 restart rydlr-visanet-api
```

### Stop application
```bash
pm2 stop rydlr-visanet-api
```

### Monitor resources
```bash
pm2 monit
```

### View process info
```bash
pm2 info rydlr-visanet-api
```

## Updating the Application

### Update code and restart
```bash
cd /home/rydlr/domains/locapay.rydlr.com/visanet-api
git pull origin main
npm install --production
cd client
npm install
npm run build
cd ..
pm2 restart rydlr-visanet-api
```

### Zero-downtime reload (for cluster mode)
```bash
pm2 reload rydlr-visanet-api
```

## Backup & Maintenance

### Database Backup Script
Create automated backups:

1. **Create backup script**:
```bash
nano /home/rydlr/bin/backup-database.sh
```

2. **Add content**:
```bash
#!/bin/bash
BACKUP_DIR="/home/rydlr/domains/locapay.rydlr.com/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u rydlr -p rydlr_locapay > ${BACKUP_DIR}/rydlr_locapay_${DATE}.sql
gzip ${BACKUP_DIR}/rydlr_locapay_${DATE}.sql
# Keep only last 30 days
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +30 -delete
```

3. **Make executable**:
```bash
chmod +x /home/rydlr/bin/backup-database.sh
```

4. **Add to crontab** (daily at 2 AM):
```bash
crontab -e
```

Add line:
```
0 2 * * * /home/rydlr/bin/backup-database.sh
```

### Application Logs
Logs are stored in:
- PM2 logs: `/home/rydlr/domains/locapay.rydlr.com/visanet-api/logs/pm2-*.log`
- Application logs: `/home/rydlr/domains/locapay.rydlr.com/visanet-api/logs/app.log`
- Apache logs: `/home/rydlr/domains/locapay.rydlr.com/logs/apache-*.log`

### Log Rotation
PM2 log rotation (install pm2-logrotate):
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

## Troubleshooting

### Application won't start

1. **Check logs**:
```bash
pm2 logs rydlr-visanet-api --err --lines 100
```

2. **Check environment variables**:
```bash
pm2 show rydlr-visanet-api
```

3. **Test database connection**:
```bash
mysql -u rydlr -p rydlr_locapay
```

### 502 Bad Gateway

1. **Check if app is running**:
```bash
pm2 status
curl http://localhost:3000/api/health
```

2. **Check Apache proxy**:
```bash
sudo tail -f /var/log/apache2/error.log
```

3. **Verify firewall**:
```bash
sudo ufw status
sudo ufw allow 3000  # If needed
```

### Database connection errors

1. **Verify credentials** in `.env` file
2. **Check MariaDB is running**:
```bash
sudo systemctl status mariadb
```

3. **Test connection**:
```bash
mysql -u rydlr -p -e "SELECT 1;"
```

### High memory usage

1. **Check PM2 cluster instances**:
```bash
pm2 show rydlr-visanet-api
```

2. **Reduce instances if needed** (edit ecosystem.config.js):
```javascript
instances: 1  // Instead of 2
```

3. **Restart with new config**:
```bash
pm2 restart ecosystem.config.js
```

## Security Checklist

- [ ] SSL certificate installed and valid
- [ ] `.env` file has chmod 600 permissions
- [ ] Database credentials are secure and backed up
- [ ] JWT secrets are random and at least 64 characters
- [ ] Firewall configured (allow only 80, 443, 22)
- [ ] Database backups scheduled
- [ ] PM2 startup script enabled
- [ ] Apache security headers configured
- [ ] CORS configured for production domain only
- [ ] Rate limiting enabled in application

## Monitoring

### Check application health
```bash
# Backend health endpoint
curl http://localhost:3000/api/health

# Check response time
curl -w "@-" -o /dev/null -s http://localhost:3000/api/health <<'EOF'
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
EOF
```

### Monitor system resources
```bash
# CPU and memory
htop

# Disk usage
df -h

# PM2 monitoring
pm2 monit
```

### Check logs for errors
```bash
# Application errors
pm2 logs rydlr-visanet-api --err --lines 50

# Apache errors
sudo tail -f /home/rydlr/domains/locapay.rydlr.com/logs/apache-error.log
```

## Support Contacts

- **Technical Support**: support@rydlr.com
- **Visa Developer Support**: https://developer.visa.com/support
- **Server Administrator**: admin@rydlr.com

## Additional Resources

- Visa Direct API Documentation: https://developer.visa.com/capabilities/visa_direct
- VisaNet Connect Documentation: https://developer.visa.com/capabilities/visanet
- PM2 Documentation: https://pm2.keymetrics.io/docs/usage/quick-start/
- MariaDB Documentation: https://mariadb.com/kb/en/documentation/
