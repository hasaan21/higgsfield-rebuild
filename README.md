# Higgsfield rebuild

A study rebuild of [Higgsfield AI](https://higgsfield.ai/)'s creation flow: Cinema Studio, Explore and remix, Library, Characters, and credits.

It runs in one of two modes:

- **Demo mode** (default): generation is mocked in the browser with bundled clips, and credits and checkout are simulated. The whole app is a static site.
- **Live mode**: a Cloudflare Worker runs every job, keeps credits and history in Supabase Postgres, and stores media in R2. Real vendor models (Kling, Google, BytePlus, Alibaba) and Stripe payments are optional add-ons. Without them, jobs still go through the server and are billed in credits, but return a sample clip labelled "Demo output".

Live mode runs on free tiers: a free Supabase project, plus Workers, R2 and Workflows on Cloudflare. Vendor API keys, Stripe and OAuth providers cost money or need extra accounts, so a clone doesn't need them (see [What's optional](#whats-optional)).

**Reference deployment:** https://higgsfield-rebuild.matecorporation.workers.dev. It runs in live mode with email/password auth, server credits and mock output, without vendor keys, Stripe or OAuth.

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

The default **Email** provider is enough: Supabase's built-in mailer is free, though rate-limited. For quick testing, turn off **Confirm email** under Authentication → Sign In / Providers. Add `<your-origin>/login/` to the redirect URLs. Without the Worker backend, credits and generations stay in the browser.

## Live mode (free setup)

The client switches to live mode when Supabase is configured **and** `GET /api/config` reports `backend: true`. That happens once the Worker has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Everything in this section is free.

### 1. Supabase

1. Create a project (the free tier is fine).
2. Run [`supabase/migrations/0001_billing.sql`](supabase/migrations/0001_billing.sql) in the SQL editor, or use `supabase db push`. It creates `profiles`, `credit_ledger`, `generations` and `stripe_events`. Users can only read their own rows. Every write goes through `security definer` functions that only the service role can call, so balances can't be edited from the browser. New sign-ups get a profile with 3 free generations.
3. Under Authentication → URL Configuration:
   - Set the **Site URL** to your Worker URL.
   - Add `<worker-url>/login/` and `http://localhost:3000/login/` to the redirect URLs.
4. Put the project URL and publishable (anon) key in `.env.local`, as in [Real auth with Supabase](#real-auth-with-supabase). They're public and get inlined at build time.

### 2. Cloudflare

```bash
npx wrangler login
npx wrangler r2 bucket create higgsfield-media
```

In `wrangler.jsonc`, set `account_id` to your account and `SUPABASE_URL` (under `vars`) to your project URL. The Workflow (`higgsfield-generate`) is created on first deploy.

### 3. Required secrets

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # Supabase → Project Settings → API Keys → service_role
npx wrangler secret put MEDIA_SIGNING_SECRET        # any long random string, e.g. `openssl rand -base64 48`
pnpm run deploy
```

Check it with `curl <worker-url>/api/config`. You should see `"backend":true`, an empty `liveModelIds` and `"stripe":false`.

`SUPABASE_JWT_SECRET` is only for older projects on the legacy shared JWT secret. Current projects sign user tokens with asymmetric keys, and the Worker verifies them against the project's JWKS.

### 4. Local development against the Worker

```bash
cp .dev.vars.example .dev.vars        # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MEDIA_SIGNING_SECRET
echo 'NEXT_PUBLIC_API_BASE=http://localhost:8787' > .env.development.local
pnpm dev:worker                       # Worker + Workflows + local R2 on http://localhost:8787
pnpm dev                              # http://localhost:3000
```

Keep `NEXT_PUBLIC_API_BASE` out of `.env.local`. That file is also read by `next build`, and production must call its own origin. To run everything on one origin, use `pnpm preview` instead.

### Credits without Stripe

Each new account gets 3 free generations on starter models. Without Stripe, plan and pack buttons show "Payments aren't set up on this server yet", and balances can only change on the server. To give a test account credits or a plan, run this in the Supabase SQL editor:

```sql
-- Add 1,000 credits (shows in the user's ledger)
select public.grant_credits(
  (select id from auth.users where email = 'you@example.com'),
  1000, 'top-up', 'Manual grant', 'manual:' || gen_random_uuid()
);

-- Switch plan (unlocks models, concurrency and unlimited lanes)
update public.profiles set plan_id = 'ultra'
where id = (select id from auth.users where email = 'you@example.com');
```

## What's optional

None of these are needed for a working clone. Each has a fallback, and the app works without it.

| Integration | Without it | To enable |
| --- | --- | --- |
| **OAuth sign-in** (Google, Apple, Microsoft) | Email and password only. The OAuth buttons return an error from Supabase because the provider is off. | Enable the provider in Supabase → Authentication → Providers with your OAuth app's client id and secret |
| **Model API keys** | Every model runs on the mock adapter: billed in credits, with a sample clip as output and a "Demo output" label | `wrangler secret put` any of the keys below; each one makes its models live at once, with no redeploy |
| **Stripe** | No paid plans or packs; grant credits with the SQL above | The secrets below, plus a webhook (see [Stripe](#stripe)) |

| Secret | Unlocks |
| --- | --- |
| `KLING_API_KEY` | Kling 3.0, Kling 2.6 |
| `GEMINI_API_KEY` | Veo 3.1, Nano Banana 2.1 |
| `ARK_API_KEY` | Seedance 2.0, Seedance 2.5 (BytePlus ModelArk) |
| `DASHSCOPE_API_KEY`, `DASHSCOPE_WORKSPACE_ID` | Wan 2.7 (Alibaba Model Studio; region via the `DASHSCOPE_REGION` var) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Checkout, customer portal and webhook |
| `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PLUS`, `STRIPE_PRICE_ULTRA` | Monthly recurring prices for each plan |

Kling o1, Cinema Studio, Soul 2.0 and Soul Cinema have no public vendor API, so they always return demo output. Upscale, extend, reframe and lip sync are also mocked. Sora 2 is retired, because OpenAI shut down its API. To test Wan with first or last frames locally, use a tunnel, because DashScope fetches frames from a public URL.

### Stripe

Create a monthly price for Basic, Plus and Ultra, and put the price ids in the secrets above. Credit packs use inline prices, so they need no setup. Add a webhook endpoint at `https://<your-domain>/api/stripe/webhook` with these events:

- `checkout.session.completed`
- `invoice.paid`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Turn on the customer portal in the Stripe dashboard so users can switch plans or cancel. Locally, run `stripe listen --forward-to localhost:8787/api/stripe/webhook` and copy its signing secret into `.dev.vars`.

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
