# Higgsfield rebuild

A study rebuild of [Higgsfield AI](https://higgsfield.ai/)'s creation flow: Cinema Studio, Explore and remix, Library, Characters, and credits. Generation is mocked client-side with bundled clips, so the whole app is a static site.

- **Audit of the real product:** [`docs/AUDIT.md`](docs/AUDIT.md)
- **Spec for this rebuild:** [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md)
- **Agent session logs:** [`.agent-logs/`](.agent-logs/)

## Stack

Next.js 16 (App Router, `output: "export"`), Tailwind v4, shadcn/ui, Framer Motion, Zustand, with Supabase Auth or a localStorage mock. It deploys to Cloudflare Workers static assets.

## Run locally

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

With no env vars set, auth runs in **demo mode**: accounts and sessions live in localStorage, and the OAuth buttons sign in a demo user. New accounts start on Free (3 free generations). Use `/pricing` to switch plans or add credits; checkout is simulated.

### Optional: real auth with Supabase

```bash
cp .env.example .env.local   # then fill in:
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

In Supabase, enable Email plus the Google, Apple and Azure providers you want. Add `<your-origin>/login/` to the redirect URLs. Credits, plans and generations stay client-side either way.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm build` | Static export to `out/` |
| `pnpm start` | Serve `out/` locally |
| `pnpm typecheck` / `pnpm lint` | TypeScript and ESLint |
| `pnpm media` | Re-render the mock clips in `public/media/` (needs ffmpeg) |
| `pnpm preview` | Build, then run on the local Workers runtime via `wrangler dev` |
| `pnpm deploy` | Build, then `wrangler deploy` |

## Deploy to Cloudflare

```bash
npx wrangler login
pnpm deploy
```

`wrangler.jsonc` serves `./out` as static assets with `not_found_handling: "404-page"`. Supabase env vars must be present at **build** time, because they're inlined into the static bundle.

## How the mock engine works

Jobs are timestamped, not simulated in a loop. Progress is derived from `startedAt` and `durationMs`, so it survives reloads and tab sleeps. Each plan has a concurrency limit, and plans with unlimited models get a separate lane for them. About 5% of jobs fail, deterministically by job ID, and are refunded automatically. See `lib/engine.ts` and section 5 of the spec.

## Deliberate departures from Higgsfield

- The exact cost is shown on the Generate button, with a breakdown.
- Failed jobs, and jobs cancelled before they start, are refunded.
- Downloads include a provenance JSON with the exact settings.
- Pricing for stacked camera moves and large reference sets is our own rule, labelled "rebuild rule" in the breakdown.
