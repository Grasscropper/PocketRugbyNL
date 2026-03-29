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
git clone https://github.com/Grasscropper/PocketRugbyNL.git PocketRugbyNL
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

Install `cloudflared`. First check your architecture:

```bash
uname -m
```

Then download the matching binary:

```bash
# armv7l (32-bit, most Raspberry Pi models)
sudo curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm \
  -o /usr/local/bin/cloudflared

# arm64 (64-bit OS only)
sudo curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 \
  -o /usr/local/bin/cloudflared

sudo chmod +x /usr/local/bin/cloudflared
cloudflared --version
```

Authenticate and create a tunnel (one-time):

```bash
cloudflared tunnel login
cloudflared tunnel create pocketrugbynl
```

Create `~/.cloudflared/config.yml` with two ingress rules — one for the app, one for the webhook receiver (see next section):

```yaml
tunnel: pocketrugbynl
credentials-file: /home/pi/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: yourapp.example.com
    service: http://localhost:3000
  - hostname: deploy.yourapp.example.com
    service: http://localhost:3001
  - service: http_status:404
```

Run as a persistent systemd service:

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

## Auto-deploy via GitHub webhook

This sets up the flow: **git push → GitHub → webhook → Pi deploy script → pm2 restart**

### 1. Deploy script

Create `deploy.sh` in the project root:

```bash
#!/bin/bash
set -e
cd ~/code/PocketRugbyNL
git pull
npm install
npm run build
pm2 restart pocketrugbynl
echo "Deploy done at $(date)"
```

```bash
chmod +x deploy.sh
```

### 2. Webhook receiver

Create `webhook-server.js` in the project root:

```js
import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const PORT = process.env.WEBHOOK_PORT ?? 3001;
const DEPLOY_SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'deploy.sh');

createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/deploy') {
    res.writeHead(404).end();
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    // Verify GitHub HMAC-SHA256 signature
    const sig = req.headers['x-hub-signature-256'] ?? '';
    const expected = 'sha256=' + createHmac('sha256', SECRET).update(body).digest('hex');
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      res.writeHead(401).end('Unauthorized');
      return;
    }

    // Only act on push events to master
    if (req.headers['x-github-event'] !== 'push') { res.writeHead(200).end('ignored'); return; }
    if (JSON.parse(body).ref !== 'refs/heads/master') { res.writeHead(200).end('ignored'); return; }

    res.writeHead(202).end('deploying');
    console.log('[webhook] Deploy triggered');
    execFile(DEPLOY_SCRIPT, (err, stdout, stderr) => {
      if (err) console.error('[webhook] Deploy failed:', stderr);
      else console.log('[webhook] Deploy done:', stdout.trim());
    });
  });
}).listen(PORT, () => console.log(`[webhook] Listening on :${PORT}`));
```

### 3. Add webhook secret to environment

Add to your `.env` file:

```
GITHUB_WEBHOOK_SECRET=your-secret-here
```

And update `ecosystem.config.cjs` to also run the webhook server:

```js
module.exports = {
  apps: [
    {
      name: 'pocketrugbynl',
      script: 'build/index.js',
      env_file: '.env'
    },
    {
      name: 'pocketrugbynl-webhook',
      script: 'webhook-server.js',
      env_file: '.env'
    }
  ]
};
```

Start and save both processes:

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

### 4. Configure GitHub webhook

In your GitHub repo: **Settings → Webhooks → Add webhook**

- **Payload URL**: `https://deploy.yourapp.example.com/deploy`
- **Content type**: `application/json`
- **Secret**: the same value as `GITHUB_WEBHOOK_SECRET`
- **Events**: Just the push event

Every `git push` to master will now automatically pull, rebuild, and restart the app on the Pi.

## Manual update

```bash
git pull
npm install
npm run build
pm2 restart pocketrugbynl
```
