# Content Studio — Deployment Guide

## Prerequisites

- A VPS with Docker and Docker Compose installed
- A domain name pointing to your VPS (for production)
- API keys for the services you want to use

## Quick Start

### 1. Clone and Configure

```bash
git clone <your-repo-url> content-studio
cd content-studio

# Copy and fill in your environment variables
cp .env.example .env
# Edit .env with your API keys and a strong JWT_SECRET
```

### 2. Deploy with Docker

```bash
docker compose up -d
```

The app will be available at `http://your-vps-ip:3002`.

### 3. Set Up SSL (Production)

For production with a domain:

```bash
# Install certbot
apt install certbot

# Get SSL certificate
certbot certonly --standalone -d yourdomain.com

# Create ssl directory
mkdir ssl
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/
```

Then uncomment the nginx section in `docker-compose.yml` and update the domain.

### 4. Create Admin Account

Once the app is running, register your first account at `/login` — this becomes the workspace owner.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────▶│  nginx (443) │────▶│ Next.js App │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                │
                                          ┌─────▼──────┐
                                          │  SQLite DB  │
                                          │  /app/data  │
                                          └────────────┘
```

## File Structure

```
content-studio/
├── app/                          # Next.js application
│   ├── src/
│   │   ├── app/                  # Pages and API routes
│   │   └── lib/                  # Core logic (SQLite, auth, AI providers)
│   └── ...
├── data/                         # SQLite database (persistent volume)
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
└── .env
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ | Random string for auth tokens |
| `APIFY_API_TOKEN` | ✅ | Apify API key for Instagram scraping |
| `GEMINI_API_KEY` | * | Google Gemini for video analysis |
| `ANTHROPIC_API_KEY` | * | Anthropic Claude for script generation |
| `OPENAI_API_KEY` | * | OpenAI GPT as alternative provider |
| `OPENROUTER_API_KEY` | * | OpenRouter for 200+ models |
| `STRIPE_SECRET_KEY` | | Stripe for subscription billing |
| `STRIPE_WEBHOOK_SECRET` | | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | | Stripe publishable key |

*At least one AI provider key required

## Subscription Plans (when Stripe is configured)

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0 | 1 brand, 50 videos/month |
| **Solo** | $29/mo | 3 brands, 500 videos/month, AI analysis |
| **Agency** | $99/mo | 10 brands, 5000 videos/month, priority support |
| **White-Label** | $299/mo | Unlimited brands, custom domain, API access |

## Updating

```bash
docker compose down
git pull
docker compose up -d --build
```

## Backup

The SQLite database is stored in the Docker volume `content-studio-data`. To back it up:

```bash
docker run --rm -v content-studio-data:/data -v $(pwd):/backup alpine tar czf /backup/content-studio-backup-$(date +%Y%m%d).tar.gz /data/
```

## Troubleshooting

- **"Database not available" during build** — This is expected during the first build. The database is created at runtime.
- **CSS not loading** — Clear browser cache and restart with `docker compose down && docker compose up -d`
- **Login not working** — Check that `JWT_SECRET` is set in `.env`
