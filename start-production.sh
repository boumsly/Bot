#!/bin/bash

# Production startup script
set -euo pipefail

# Set production ports
export AI_PORT=8001
export PORT=5000
export DATABASE_URL="file:./dev.db"
export NODE_ENV=production

echo "🚀 Starting production deployment..."
echo "📊 PORT: $PORT"
echo "📊 AI_PORT: $AI_PORT"
echo "📊 DATABASE_URL: $DATABASE_URL"

# Load production environment if exists
if [ -f ".env.production" ]; then
    echo "📋 Loading production environment"
    export $(grep -v '^#' .env.production | xargs)
    cp .env.production apps/web/.env
fi

# Start AI service in background
echo "🤖 Starting AI service on port $AI_PORT..."
cd services/ai
python -m uvicorn main:app --host 0.0.0.0 --port "$AI_PORT" &
AI_PID=$!
echo "🤖 AI service started with PID: $AI_PID"
echo "⏳ Waiting 5 seconds for AI service to be ready..."
sleep 5
cd ../..

# Setup database
echo "🗄️ Setting up production database..."
cd apps/web

# Set SQLite database URL for production
export SQLITE_DATABASE_URL="file:./prisma/dev.db"

# Run migrations to ensure database structure is up to date
echo "📊 Running database migrations..."
npx prisma migrate deploy --schema=prisma/schema.prisma

# Run seed to populate departments
echo "🌱 Seeding database with departments..."
npm run seed

# Start web server
echo "🌐 Starting web server on port $PORT..."
export PY_AI_BASE_URL="http://localhost:${AI_PORT}"
node dist/src/index.js