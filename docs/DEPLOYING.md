# Deploying the public demo

The landing page (`site/`) deploys itself automatically via
`.github/workflows/pages.yml` — nothing to do there. This covers the piece
that needs your own accounts: a live broker+worker instance for the page's
"Try it live" widget to talk to.

Both services below have genuine free tiers (verified as of this writing —
check current terms before relying on them, they change). Neither needs a
credit card.

## 1. Create a free Postgres on Neon

1. [neon.tech](https://neon.tech) → sign up → **New Project**.
2. Copy the connection string it gives you (starts `postgresql://...`). You
   won't need to run migrations manually — Render's build step does that
   for you if you point `DATABASE_URL` at it (see step 2).

Why Neon and not Render's own free Postgres: Render's free database expires
30 days after creation and has to be recreated. Neon's free tier is
permanent (scale-to-zero, not a trial).

## 2. Deploy the broker+worker to Render

1. [render.com](https://render.com) → sign up → **New** → **Blueprint**.
2. Point it at this repo (`Anchal0410/docket`) — Render reads `render.yaml`
   automatically.
3. It'll prompt for two values it can't infer:
   - `DATABASE_URL` — the Neon connection string from step 1.
   - `CORS_ORIGINS` — `https://anchal0410.github.io` (no trailing slash/path
     — just the origin the landing page is served from).
4. Deploy. First build takes a few minutes (it's building the same
   Dockerfile as local dev). Once it's up, note the URL Render gives you
   (something like `https://docket-demo.onrender.com`).
5. Run migrations against Neon once, from your machine:
   ```bash
   DATABASE_URL="<neon connection string>" pnpm prisma migrate deploy
   ```
   (Render's own build doesn't run this automatically — `render.yaml`'s
   `dockerCommand` goes straight to `scripts/demo-entrypoint.sh`, which
   only starts the app, not the one-shot `migrate` step `docker-compose.yml`
   has locally.)

## 3. Point the landing page at it

Edit `site/app.js`:

```js
const API_BASE = "https://docket-demo.onrender.com"; // your Render URL
```

Commit and push — the Pages workflow redeploys automatically.

## What to expect

- **Cold starts**: Render's free web services sleep after 15 minutes of no
  traffic. The first request after that takes up to ~30-60s to wake back
  up — the widget already handles this with an explicit "waking up…"
  message rather than looking broken.
- **This is a hosting compromise, not the real architecture**: broker and
  worker run as one colocated process here (`scripts/demo-entrypoint.sh`)
  because free tiers don't offer a separate free background-worker type.
  `docker compose up` locally still runs them as genuinely separate
  processes — that's what actually demonstrates the distributed design.
- **Already protected against abuse**: the rate limiter (`RATE_LIMIT_MAX`)
  and backpressure ceiling (`QUEUE_MAX_BACKLOG_DEPTH`) are both set lower
  in `render.yaml` than the local defaults, specifically because this
  instance is public.
