#!/bin/bash
# Quick Deployment Commands for Sprint 1
# Copy and paste these ONE AT A TIME into your terminal

echo "================================================"
echo "Sprint 1: Final Deployment Steps"
echo "================================================"
echo ""

# Step 1: Navigate to project
echo "Step 1: Navigate to project directory"
echo "Run: cd /Users/jamesgates/Documents/ProjectArrowhead/website-integration/ArrowheadSolution"
echo ""

# Step 2: Set environment variables
echo "Step 2: Set environment variables (copy these one by one)"
echo ""
echo 'export DATABASE_URL="postgresql://postgres:1PFNMaTXSvCNrLmI@db.jzjkaxildffxhudeocvp.supabase.co:6543/postgres"'
echo 'export ADMIN_EMAIL="space.between.ideas@gmail.com"'
echo 'export ADMIN_PASSWORD="ProjectArrowhead2025!"'
echo 'export ADMIN_ROLE="super_admin"'
echo ""

# Step 3: Create admin user
echo "Step 3: Create admin user"
echo "Run: npm run admin:create"
echo ""

echo "================================================"
echo "After admin user is created:"
echo "================================================"
echo ""
echo "1. Go to Cloudflare Dashboard"
echo "   https://dash.cloudflare.com/"
echo ""
echo "2. Navigate to: Pages > project-arrowhead > Settings > Environment Variables"
echo ""
echo "3. Add these variables (mark as Encrypted):"
echo ""
echo "   ADMIN_SESSION_SECRET=YufEzs2L8VNKgnYFMYkjBBm7VRCrc/FlvTr2UbZvnu0y0c2zdyvanStb4HQ9quFe"
echo "   ADMIN_COOKIE_SECRET=Iwgu2QvJp0iuMxSdlQshMEWPGIRR35qazCGf/qMeZgSjrEN1xyawaCMjUiGgA9wZ"
echo ""
echo "4. Wait for Cloudflare to redeploy (5-10 minutes)"
echo ""
echo "5. Visit: https://project-arrowhead.pages.dev/admin"
echo ""
echo "6. Login with:"
echo "   Email: space.between.ideas@gmail.com"
echo "   Password: ProjectArrowhead2025!"
echo ""
echo "================================================"
echo "Done! Admin panel should be live!"
echo "================================================"
