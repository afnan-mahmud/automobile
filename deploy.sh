#!/usr/bin/env bash
# Pulls latest main, rebuilds, and reloads the PM2-managed process.
# Run from the app's deploy directory on the VPS (e.g. /var/www/dhaka-automobiles).
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo "==> Pulling latest main"
git pull origin main

echo "==> Installing dependencies"
npm ci

echo "==> Building"
npm run build

echo "==> Reloading PM2 process"
pm2 reload ecosystem.config.js --env production

echo "Deploy complete."
