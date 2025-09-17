#!/bin/bash

# Exit on any error and show errors
set -euo pipefail

# Determine environment
if [ "${REPL_SLUG:-}" ]; then
    # We're on Replit
    ENV_FILE=".env.production"
    echo "🌐 Detected Replit environment - using production config"
else
    # We're in local development
    ENV_FILE=".env.development"
    echo "💻 Detected local environment - using development config"
fi

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    echo "📋 Loading environment from $ENV_FILE"
    export $(grep -v '^#' "$ENV_FILE" | xargs)
    
    # Copy the env file to apps/web/.env so dotenv can find it
    echo "📋 Copying $ENV_FILE to apps/web/.env for Node.js"
    cp "$ENV_FILE" "apps/web/.env"
else
    echo "⚠️  Warning: $ENV_FILE not found, using default values"
fi

# Set default ports if not already set
export AI_PORT=${AI_PORT:-8001}
export PORT=${PORT:-5000}
export DATABASE_URL=${DATABASE_URL:-"file:./dev.db"}

echo "🔧 Installing Python dependencies for AI service..."
pip install -r services/ai/requirements.txt

echo "🔧 Installing Node.js dependencies and building web app..."
pushd apps/web
npm install
# Install TypeScript explicitly to avoid conflicts
npm install typescript --save-dev
npm run prisma:generate
npx prisma migrate dev --schema=prisma/schema.prisma --name init
popd

echo "🚀 Starting AI service on port $AI_PORT..."
python -m uvicorn services.ai.main:app --host 0.0.0.0 --port "$AI_PORT" &

echo "🚀 Starting web server on port $PORT..."
export PY_AI_BASE_URL="http://127.0.0.1:${AI_PORT}"
cd apps/web
npx ts-node src/index.ts
