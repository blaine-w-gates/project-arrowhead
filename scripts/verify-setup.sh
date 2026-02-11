#!/bin/bash
set -e

echo "🔍 Verifying project setup..."

# 1. Check essential files
echo "Checking essential files..."
if [ ! -f ".env" ]; then
  echo "❌ .env file missing!"
  exit 1
fi
if [ ! -f "package.json" ]; then
  echo "❌ package.json missing in root!"
  exit 1
fi
echo "✅ Essential files present."

# 2. Check dependencies
echo "Checking node_modules..."
if [ ! -d "node_modules" ]; then
  echo "⚠️ node_modules missing. Running npm install..."
  npm install
else
  echo "✅ node_modules present."
fi

# 3. Check Database Connection
echo "Checking database connection..."
if npm run db:push -- --check > /dev/null 2>&1; then
   echo "✅ Database connection successful (schema matches)."
else
   echo "⚠️ Database check failed or schema out of sync. Trying simple connection check..."
   # Fallback: just check if we can generate
   if npm run db:generate > /dev/null 2>&1; then
     echo "✅ Drizzle config is valid."
   else
     echo "❌ Database configuration issue."
     exit 1
   fi
fi

# 4. Check Environment Variables
echo "Checking environment variables..."
if grep -q "DATABASE_URL" .env; then
  echo "✅ DATABASE_URL found."
else
  echo "❌ DATABASE_URL missing in .env."
  exit 1
fi

echo "🎉 Setup verification complete! You are ready to start the server with: npm run dev"
