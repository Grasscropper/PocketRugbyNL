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
    if (req.headers['x-github-event'] !== 'push') {
      res.writeHead(200).end('ignored');
      return;
    }
    if (JSON.parse(body).ref !== 'refs/heads/master') {
      res.writeHead(200).end('ignored');
      return;
    }

    res.writeHead(202).end('deploying');
    console.log('[webhook] Deploy triggered');

    execFile(DEPLOY_SCRIPT, (err, stdout, stderr) => {
      if (err) console.error('[webhook] Deploy failed:', stderr);
      else console.log('[webhook] Deploy done:', stdout.trim());
    });
  });
}).listen(PORT, () => console.log(`[webhook] Listening on :${PORT}`));
