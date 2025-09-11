#!/bin/bash

# Load env files (for local testing, in Replit use secrets)
set -a
source infrastructure/env/.env.ai
source infrastructure/env/.env.web
set +a

# Install Python dependencies for AI service
pip install -r services/ai/requirements.txt

# Start AI service in background
python services/ai/main.py &

# Go to web app directory
cd apps/web

# Install Node dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start the web server
npm start
