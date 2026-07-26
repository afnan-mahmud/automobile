# Deployment (Phase 14)

Deploys the app to a VPS per `docs/architecture.md` section 7: Nginx (SSL
termination + reverse proxy) → PM2-managed Next.js process → MongoDB Atlas
(cloud, not self-hosted).

This document is the runbook and file set for that deploy. **It has not
been executed against a real server** — provisioning a VPS, pointing a
domain at it, and issuing a certificate all require infrastructure and
credentials this environment doesn't have. Everything here is ready to run
as soon as that access exists; treat the steps below as the checklist to
work through by hand (or hand to whoever has VPS/DNS access).

## 1. Production environment checklist

Set these as real values before the first deploy (see `.env.example` for
the full list of keys):

- `MONGODB_URI` — a MongoDB Atlas connection string, with the VPS's public
  IP added to Atlas's Network Access list.
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`.
- `NEXTAUTH_URL` — the production domain, e.g. `https://dhakaautomobiles.example.com`.
- `SMS_API_KEY` / `SMS_SENDER_ID` — real BulkSMSBD credentials (see `lib/sms.ts`).
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — used once by `scripts/seed-admin.ts`.

Put these in a `.env.local` (or `.env.production`) on the VPS — never commit
them.

## 2. VPS setup

```bash
# Install Node.js matching package.json's expected major version (20.x)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2, globally
sudo npm install -g pm2

# Clone the repo
sudo mkdir -p /var/www/dhaka-automobiles
sudo chown "$USER":"$USER" /var/www/dhaka-automobiles
git clone <repo-url> /var/www/dhaka-automobiles
cd /var/www/dhaka-automobiles

# /uploads must be writable and must live outside the Next.js build output
# (.next) so it survives every deploy.
mkdir -p uploads
chmod 755 uploads
```

## 3. PM2 process

`ecosystem.config.js` (repo root) defines the `dhaka-automobiles` app:

```bash
npm ci
npm run build
pm2 start ecosystem.config.js --env production
pm2 startup   # prints a systemd command to run once, so PM2 survives reboots
pm2 save      # persists the current process list for that startup hook
```

## 4. Nginx + SSL

`deploy/nginx.conf` (repo root) has the full site config: HTTP→HTTPS
redirect, reverse proxy to PM2's port 3000, a `client_max_body_size`
increase for job-card photo uploads (Phase 3), and a `location /uploads/`
block that serves files directly from disk instead of proxying through
Node.

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/dhaka-automobiles
sudo ln -s /etc/nginx/sites-available/dhaka-automobiles /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL via Let's Encrypt
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d dhakaautomobiles.example.com
sudo systemctl status certbot.timer   # confirm auto-renewal is scheduled
```

## 5. Seed the admin account

Run once, against the production database:

```bash
SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npx tsx scripts/seed-admin.ts
```

## 6. Subsequent deploys

```bash
./deploy.sh
```

Pulls `main`, runs `npm ci`, rebuilds, and does a zero-downtime
`pm2 reload`.

## 7. Verify

Walk `docs/qa-checklist.md` end to end against the live production URL —
its final section (Phase 14) covers HTTPS, admin login, `/uploads` being
served by Nginx directly (check response headers aren't coming from the
Node process), and PM2 surviving a reboot.
