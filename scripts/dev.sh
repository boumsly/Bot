#!/bin/bash

# Exit on any error and show errors
set -euo pipefail

# Set default ports and database
export AI_PORT=8001
export PORT=5000
export DATABASE_URL="file:./dev.db"

echo "🔧 Installing Python dependencies for AI service..."
pip install -r services/ai/requirements.txt

echo "🔧 Installing Node.js dependencies and building web app..."
pushd apps/web
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run build
popd

echo "🚀 Starting AI service on port $AI_PORT..."
python -m uvicorn services.ai.main:app --host 0.0.0.0 --port "$AI_PORT" &

echo "🚀 Starting web server on port $PORT..."
export AI_BASE_URL="http://127.0.0.1:${AI_PORT}"
cd apps/web
node dist/index.js