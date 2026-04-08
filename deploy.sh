#!/bin/bash
set -e

cd /home/pi/PocketRugbyNL

echo "[deploy] Pulling latest code..."
git pull origin master

echo "[deploy] Installing dependencies..."
npm install

echo "[deploy] Building..."
npm run build

echo "[deploy] Restarting container..."
cd /srv/compose
sudo podman-compose up -d --build pocketrugby

echo "[deploy] Done."
