# Raspberry Pi Deployment

## Prerequisites

Node.js 18+ is required. Use `nvm` for easy version management:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

Install PM2 globally:

```bash
npm install -g pm2
```

## Build and run

```bash
git clone <your-repo-url> PocketRugbyNL
cd PocketRugbyNL
npm install
npm run build
```

## Environment variables

Create a `.env` file at the project root (never committed):

```
RUGBY_SCHEDULE_URL=https://rugby.nl/competitie/speelschema/seizoen-2025-2026/
```

To use it with PM2, create an `ecosystem.config.cjs` file:

```js
module.exports = {
  apps: [{
    name: 'pocketrugbynl',
    script: 'build/index.js',
    env_file: '.env'
  }]
};
```

## Run with PM2

```bash
# Start
pm2 start ecosystem.config.cjs

# Save process list so it survives reboots
pm2 save

# Register PM2 as a systemd service (run the printed command as root)
pm2 startup
```

The app listens on port **3000** by default. Set `PORT=XXXX` in `.env` to change it.

## Expose with Cloudflare Tunnel

Install `cloudflared`:

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 \
  -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
```

Authenticate and create a tunnel (one-time):

```bash
cloudflared tunnel login
cloudflared tunnel create pocketrugbynl
```

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: pocketrugbynl
credentials-file: /home/pi/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: yourapp.example.com
    service: http://localhost:3000
  - service: http_status:404
```

Run as a persistent systemd service:

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

## Update the app

```bash
git pull
npm install
npm run build
pm2 restart pocketrugbynl
```
