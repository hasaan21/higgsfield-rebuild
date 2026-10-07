# Higgsfield rebuild

A study rebuild of [Higgsfield AI](https://higgsfield.ai/)'s creation flow: Cinema Studio, Explore and remix, Library, Characters, and credits.

It runs in one of two modes:

- **Demo mode** (default): generation is mocked in the browser with bundled clips, and credits and checkout are simulated. The whole app is a static site.
- **Live mode**: a Cloudflare Worker sends jobs to each vendor's own API (Kling, Google, BytePlus, Alibaba), stores results in R2, keeps credits in Supabase Postgres and takes payments through Stripe. A model whose vendor key isn't set still goes through the server and is billed, but returns a sample clip and is labelled "Demo output" in the model picker.

- **Audit of the real product:** [`docs/AUDIT.md`](docs/AUDIT.md)
- **Spec for this rebuild:** [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md)
- **Agent session logs:** [`.agent-logs/`](.agent-logs/)

## Stack

Next.js 16 (App Router, `output: "export"`), Tailwind v4, shadcn/ui, Framer Motion, Zustand, with Supabase Auth or a localStorage mock. One Cloudflare Worker serves the static export and `/api/*`, using R2 for media and Workflows for durable generation jobs. Before changing Next.js code, read the guides in `node_modules/next/dist/docs/`: this version differs from older docs (see `AGENTS.md`).

## Run locally (demo mode)

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

With no env vars set, auth runs in **demo mode**: accounts and sessions live in localStorage, and the OAuth buttons sign in a demo user. New accounts start on Free (3 free generations). Use `/pricing` to switch plans or add credits; checkout is simulated.

### Real auth with Supabase

```bash
cp .env.example .env.local   # then fill in:
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

In Supabase, enable Email plus the Google, Apple and Azure providers you want. Add `<your-origin>/login/` to the redirect URLs. Without the Worker backend, credits and generations stay in the browser.

## Live mode: real models, server credits, Stripe

The client switches to live mode when Supabase is configured **and** `GET /api/config` reports `backend: true`. That happens once the Worker has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

### 1. Database

Run [`supabase/migrations/0001_billing.sql`](supabase/migrations/0001_billing.sql) in the Supabase SQL editor (or `supabase db push`). It creates `profiles`, `credit_ledger`, `generations` and `stripe_events`. Users can only read their own rows. Every write goes through `security definer` functions that only the service role can call, so balances can't be edited from the browser. A profile with 3 free generations is created on sign-up.

### 2. Cloudflare resources

```bash
npx wrangler r2 bucket create higgsfield-media
```

Set `SUPABASE_URL` under `vars` in `wrangler.jsonc`. The Workflow (`higgsfield-generate`) is created on first deploy.

### 3. Secrets

Every secret is listed in [`.dev.vars.example`](.dev.vars.example). In production, set each one with `npx wrangler secret put NAME`.

| Secret | Needed for |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Turns the backend on |
| `SUPABASE_JWT_SECRET` | Only for projects on the legacy shared JWT secret; otherwise tokens are verified against the project's JWKS |
| `MEDIA_SIGNING_SECRET` | Signs media links (any long random string) |
| `KLING_API_KEY` | Kling 3.0, Kling 2.6 |
| `GEMINI_API_KEY` | Veo 3.1, Nano Banana 2.1 |
| `ARK_API_KEY` | Seedance 2.0, Seedance 2.5 (BytePlus ModelArk) |
| `DASHSCOPE_API_KEY`, `DASHSCOPE_WORKSPACE_ID` | Wan 2.7 (Alibaba Model Studio; region via the `DASHSCOPE_REGION` var) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Checkout, portal and webhook |
| `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PLUS`, `STRIPE_PRICE_ULTRA` | Monthly recurring prices for each plan |

Kling o1, Cinema Studio, Soul 2.0 and Soul Cinema have no public vendor API, so they always return demo output. Upscale, extend, reframe and lip sync are also mocked. Sora 2 is retired, because OpenAI shut down its API.

### 4. Stripe

Create a monthly price for Basic, Plus and Ultra, and put the price ids in the secrets above. Credit packs use inline prices, so they need no setup. Add a webhook endpoint at `https://<your-domain>/api/stripe/webhook` with these events:

- `checkout.session.completed`
- `invoice.paid`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Turn on the customer portal in the Stripe dashboard so users can switch plans or cancel.

### 5. Local development against the Worker

```bash
cp .dev.vars.example .dev.vars        # fill in SUPABASE_URL, the service role key and any vendor keys
pnpm dev:worker                       # Worker + Workflows on http://localhost:8787
# in .env.local: NEXT_PUBLIC_API_BASE=http://localhost:8787
pnpm dev                              # http://localhost:3000
stripe listen --forward-to localhost:8787/api/stripe/webhook   # optional; copy its signing secret into .dev.vars
```

`wrangler dev` runs Workflows and R2 locally. To test Wan with first or last frames, use a tunnel or deploy, because DashScope fetches frames from a public URL. To run everything on one origin instead, use `pnpm preview`.

### Pricing guardrail

Every model that has a vendor API costs at least the vendor's per-second or per-image price × 1.25, at the cheapest credit price we sell (Ultra, $0.033 per credit). `pnpm check:margins` fails if any live setting would lose money. Run it after changing prices or plans.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm build` | Static export to `out/` |
| `pnpm start` | Serve `out/` locally |
| `pnpm typecheck` / `pnpm lint` | TypeScript (app and Worker) and ESLint |
| `pnpm check:margins` | Check that credit prices cover vendor costs |
| `pnpm dev:worker` | Run the Worker API on :8787 for use with `pnpm dev` |
| `pnpm cf-typegen` | Regenerate `worker/worker-configuration.d.ts` after changing bindings |
| `pnpm media` | Re-render the mock clips in `public/media/` (needs ffmpeg) |
| `pnpm preview` | Build, then run the site and API on the local Workers runtime |
| `pnpm run deploy` | Build, then `wrangler deploy` |

## Deploy to Cloudflare

```bash
npx wrangler login
pnpm run deploy
```

`wrangler.jsonc` serves `./out` as static assets with `not_found_handling: "404-page"`, and runs the Worker first only for `/api/*`. Supabase env vars must be present at **build** time, because they're inlined into the static bundle.

## How generation works

**Demo mode:** jobs are timestamped, not simulated in a loop. Progress is derived from `startedAt` and `durationMs`, so it survives reloads and tab sleeps. Each plan has a concurrency limit, and plans with unlimited models get a separate lane for them. About 5% of jobs fail, deterministically by job ID, and are refunded automatically. See `lib/engine.ts`.

**Live mode:** `POST /api/generations` re-quotes on the server, charges atomically in Postgres, and starts one Workflow run per job. The Workflow:

1. waits for a free slot under the plan's concurrency,
2. submits to the vendor,
3. polls with durable sleeps,
4. copies the result into R2,
5. marks the job done, or failed and refunded.

The browser polls every 3 seconds and animates progress in between. See section 4 of the spec.

## Deliberate departures from Higgsfield

- The exact cost is shown on the Generate button, with a breakdown.
- Failed jobs, and jobs cancelled before they start, are refunded.
- Downloads include a provenance JSON with the exact settings.
- Pricing for stacked camera moves and large reference sets is our own rule, labelled "rebuild rule" in the breakdown.
