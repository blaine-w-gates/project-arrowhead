#!/bin/bash
# Sprint 1 Production Deployment Script
# Admin Foundation - Core Infrastructure
# Date: 2025-09-30

set -e  # Exit on error

echo "================================================"
echo "Sprint 1: Admin Foundation Deployment"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL not set${NC}"
    echo "Please set DATABASE_URL environment variable:"
    echo "  export DATABASE_URL='postgresql://...'"
    exit 1
fi

echo -e "${GREEN}✓${NC} DATABASE_URL configured"

# Confirm production deployment
echo ""
echo -e "${YELLOW}⚠️  WARNING: This will deploy to PRODUCTION${NC}"
echo ""
read -p "Type 'DEPLOY' to continue: " CONFIRM

if [ "$CONFIRM" != "DEPLOY" ]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "================================================"
echo "Step 1: Database Backup"
echo "================================================"

BACKUP_FILE="backup_pre_sprint1_$(date +%Y%m%d_%H%M%S).sql"
echo "Creating backup: $BACKUP_FILE"

pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Backup created successfully"
    echo "  Location: $BACKUP_FILE"
    echo "  Size: $(ls -lh $BACKUP_FILE | awk '{print $5}')"
else
    echo -e "${RED}✗${NC} Backup failed!"
    exit 1
fi

echo ""
echo "================================================"
echo "Step 2: Review Migration"
echo "================================================"

MIGRATION_FILE="website-integration/ArrowheadSolution/server/migrations/009_create_admin_tables.sql"
echo "Migration file: $MIGRATION_FILE"
echo ""
echo "Tables to be created:"
echo "  - admin_users"
echo "  - admin_audit_log"
echo ""
read -p "Press ENTER to view migration SQL..."

cat "$MIGRATION_FILE"

echo ""
read -p "Proceed with migration? (y/N): " PROCEED

if [[ ! $PROCEED =~ ^[Yy]$ ]]; then
    echo "Migration cancelled"
    exit 0
fi

echo ""
echo "================================================"
echo "Step 3: Run Migration"
echo "================================================"

echo "Executing migration..."
psql "$DATABASE_URL" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Migration completed successfully"
else
    echo -e "${RED}✗${NC} Migration failed!"
    echo ""
    echo "To rollback, run:"
    echo "  psql \$DATABASE_URL < $BACKUP_FILE"
    exit 1
fi

echo ""
echo "================================================"
echo "Step 4: Verify Tables"
echo "================================================"

echo "Checking admin_users table..."
psql "$DATABASE_URL" -c "\d admin_users"

echo ""
echo "Checking admin_audit_log table..."
psql "$DATABASE_URL" -c "\d admin_audit_log"

echo ""
echo "Checking session table (created by connect-pg-simple)..."
psql "$DATABASE_URL" -c "\d session" || echo "Session table will be created on first admin access"

echo ""
echo "================================================"
echo "Step 5: Environment Variables"
echo "================================================"

echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Configure these environment variables in Cloudflare Pages:${NC}"
echo ""
echo "Required variables:"
echo "  - ADMIN_SESSION_SECRET  (generate: openssl rand -base64 48)"
echo "  - ADMIN_COOKIE_SECRET   (generate: openssl rand -base64 48)"
echo "  - ADMIN_EMAIL           (your admin email)"
echo "  - ADMIN_PASSWORD        (strong password, 12+ chars)"
echo "  - ADMIN_ROLE            (super_admin)"
echo ""

read -p "Generate secrets now? (Y/n): " GEN_SECRETS

if [[ ! $GEN_SECRETS =~ ^[Nn]$ ]]; then
    echo ""
    echo "ADMIN_SESSION_SECRET:"
    openssl rand -base64 48
    echo ""
    echo "ADMIN_COOKIE_SECRET:"
    openssl rand -base64 48
    echo ""
    echo -e "${YELLOW}⚠️  Save these secrets securely (1Password/vault)${NC}"
    echo ""
fi

echo ""
echo "================================================"
echo "Step 6: Create Admin User"
echo "================================================"

echo ""
echo "After setting environment variables, create the first admin user:"
echo ""
echo "  cd website-integration/ArrowheadSolution"
echo "  npm run admin:create"
echo ""
echo "OR manually via SQL:"
echo ""
echo "  # Generate password hash locally:"
echo "  node -e \"const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('YOUR_PASSWORD', 12));\""
echo ""
echo "  # Then insert into database:"
echo "  psql \$DATABASE_URL << EOF"
echo "  INSERT INTO admin_users (email, password_hash, role, is_active)"
echo "  VALUES ('admin@yourcompany.com', '\$2a\$12\$YOUR_HASH', 'super_admin', true);"
echo "  EOF"
echo ""

echo ""
echo "================================================"
echo "Step 7: Verify Deployment"
echo "================================================"

echo ""
echo "After Cloudflare Pages deploys, verify:"
echo ""
echo "  1. Visit: https://yoursite.com/admin"
echo "  2. Verify redirect to /admin/login"
echo "  3. Login with created credentials"
echo "  4. Check dashboard loads"
echo "  5. Verify audit logging:"
echo "     psql \$DATABASE_URL -c 'SELECT * FROM admin_audit_log;'"
echo ""

echo ""
echo "================================================"
echo "Deployment Summary"
echo "================================================"

echo ""
echo -e "${GREEN}✓${NC} Database backup: $BACKUP_FILE"
echo -e "${GREEN}✓${NC} Migration executed successfully"
echo -e "${GREEN}✓${NC} Tables verified"
echo ""
echo -e "${YELLOW}⚠️  Next steps:${NC}"
echo "  1. Set environment variables in Cloudflare Pages"
echo "  2. Wait for auto-deployment or trigger manually"
echo "  3. Create admin user"
echo "  4. Test admin panel"
echo "  5. Remove ADMIN_EMAIL/PASSWORD from environment"
echo ""
echo "For rollback instructions, see: SPRINT_1_DEPLOYMENT_CHECKLIST.md"
echo ""
echo -e "${GREEN}Deployment preparation complete!${NC}"
echo ""
