#!/bin/bash

# Fix .replit file for proper deployment
# Remove multiple port mappings and keep only the main web service port

echo "🔧 Fixing .replit configuration for deployment..."

# Create new .replit with single port mapping
cat > .replit << 'EOF'
run = "bash start.sh"
modules = ["nodejs-20", "web", "python-3.11"]

[workflows]
runButton = "Project"

[[workflows.workflow]]
name = "Project"
mode = "parallel"
author = "agent"

[[workflows.workflow.tasks]]
task = "workflow.run"
args = "Dev Server"

[[workflows.workflow]]
name = "Dev Server"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "bash scripts/dev.sh"
waitForPort = 5000

[workflows.workflow.metadata]
outputType = "webview"

# ONLY ONE EXTERNAL PORT for deployment
[[ports]]
localPort = 5000
externalPort = 80

[nix]
channel = "stable-25_05"

[agent]
expertMode = true

[deployment]
deploymentTarget = "vm"
run = ["bash", "start.sh"]
build = ["bash", "-c", "echo 'Building for production...' && pip install -r services/ai/requirements.txt && cd apps/web && npm ci && npm run build && echo 'Production build complete!'"]
EOF

echo "✅ .replit configuration fixed for deployment!"
echo "📝 Backup saved as .replit.backup"
echo ""
echo "🚀 Next steps:"
echo "1. Click the 'Publish' button in your Replit workspace"
echo "2. Choose 'Reserved VM' deployment type"
echo "3. Your app will be deployed with proper HTTPS access"