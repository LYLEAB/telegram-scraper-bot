# telegram-scraper-bot

This repository now supports an internal company form submission pipeline built with **Next.js + Supabase + Supabase Edge Functions + Telegram** while keeping the existing Flask webhook flow.

## Architecture flow

1. User submits form in Next.js.
2. Next.js API route inserts into Supabase `submissions`.
3. API route asynchronously calls Supabase Edge Function (`send-telegram`).
4. Edge Function formats and sends Telegram notification.
5. Edge Function updates `submissions.notification_status` to `sent` or `failed`.

## Added files

- `supabase/migrations/20260622101500_internal_form_pipeline.sql` - schema + RLS
- `scripts/parse_kobo_tsv.py` - parse Kobo choices TSV to `seed.json`
- `scripts/seed_supabase.py` - seed reference tables into Supabase via REST
- `app/api/submit/route.ts` - Next.js App Router API endpoint
- `supabase/functions/send-telegram/index.ts` - Telegram notification edge function
- `.env.example` - required env var placeholders

## Database setup (Supabase)

Choose one option:

1. **Supabase Dashboard (manual):** open SQL Editor and run the SQL from `supabase/migrations/20260622101500_internal_form_pipeline.sql`.
2. **Supabase CLI:**

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

The migration creates:

- reference tables: regions, dealers, provinces, districts, district_dealers, channels, sub_channels, categories, brands, type_selects, price_sources
- `submissions` table with notification tracking
- indexes on `created_at`, `region_code`, `dealer_code`, `submission_date`
- RLS enabled on `submissions` with baseline insert policy for anon/authenticated

## Kobo TSV seeding workflow

1. Parse the Kobo choices TSV:

```bash
python scripts/parse_kobo_tsv.py "/absolute/path/Promotion Program via Form - survey (1).tsv" --output ./seed.json
```

2. Seed Supabase reference data:

```bash
export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
python scripts/seed_supabase.py --seed ./seed.json --chunk-size 500
```

`seed_supabase.py` upserts in dependency-safe order and prints actionable errors if any request fails.

## Next.js API endpoint

Path: `app/api/submit/route.ts`

- Accepts JSON submission payload.
- Performs minimum required-field validation.
- Inserts into Supabase `submissions` and returns `submission_id`.
- Fire-and-forget invocation of edge function for Telegram send.
- Keeps secrets server-side through environment variables.

## Supabase Edge Function

Path: `supabase/functions/send-telegram/index.ts`

### Deploy

```bash
supabase link --project-ref <your-project-ref>
supabase functions deploy send-telegram
```

### Required function secrets

```bash
supabase secrets set \
  FUNCTION_SECRET=your_function_secret \
  SUPABASE_URL=https://your-project-ref.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
  TELEGRAM_BOT_TOKEN=your_bot_token \
  TELEGRAM_CHAT_ID=your_group_chat_id
```

### Request contract

- Method: `POST`
- Header: `x-function-secret: <FUNCTION_SECRET>`
- Body: `{ "submission_id": "<uuid>" }`

The function fetches submission + labels from reference tables, sends Telegram message in the requested format, and updates `notification_status`.

## Environment variables

Variable names are shared across code/docs exactly as below:

- **Next.js API route (`app/api/submit/route.ts`)**
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `TELEGRAM_EDGE_FUNCTION_URL` (optional for async Telegram trigger)
  - `TELEGRAM_EDGE_FUNCTION_SECRET` (optional for async Telegram trigger)
- **Supabase Edge Function (`supabase/functions/send-telegram/index.ts`)**
  - `FUNCTION_SECRET` (must match `TELEGRAM_EDGE_FUNCTION_SECRET`)
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHAT_ID`

Set these in:

- **Vercel Project Settings → Environment Variables** (Next.js route vars)
- **Supabase Function Secrets** (edge function vars)

See `.env.example` for placeholders only.

Never commit real secrets (Telegram tokens, Supabase keys, service role keys).

## Run locally and test end-to-end

1. **Manual (Supabase):** run migration SQL from `supabase/migrations/20260622101500_internal_form_pipeline.sql`.
2. Parse Kobo TSV and create seed data:
   ```bash
   python scripts/parse_kobo_tsv.py "/absolute/path/Promotion Program via Form - survey (1).tsv" --output ./seed.json
   ```
3. Seed reference tables:
   ```bash
   export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
   python scripts/seed_supabase.py --seed ./seed.json
   ```
4. **Manual (Supabase):** deploy function and set secrets:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase functions deploy send-telegram
   supabase secrets set \
     FUNCTION_SECRET=your_function_secret \
     SUPABASE_URL=https://your-project-ref.supabase.co \
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
     TELEGRAM_BOT_TOKEN=your_bot_token \
     TELEGRAM_CHAT_ID=your_group_chat_id
   ```
5. **Manual (Vercel):** set env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_EDGE_FUNCTION_URL`, `TELEGRAM_EDGE_FUNCTION_SECRET`) and redeploy.
6. Submit a payload to `POST /api/submit`.
7. Verify:
   - API response includes `submission_id`
   - `submissions` row exists
   - Telegram message arrives
   - `notification_status` becomes `sent` (or `failed` with `notification_error`)

## Troubleshooting

- **Missing env vars**
  - Next.js route returns `Missing environment variable: ...` when Vercel env vars are absent.
  - Edge function returns `Missing env var: ...` when Supabase function secrets are absent.
- **Invalid Telegram chat id**
  - Function responds with `Telegram send failed` and stores API error text in `submissions.notification_error`.
  - Ensure the bot is in the target group/channel and `TELEGRAM_CHAT_ID` is correct.
- **Unauthorized function secret**
  - If `TELEGRAM_EDGE_FUNCTION_SECRET` (Vercel) does not match `FUNCTION_SECRET` (Supabase), function responds `401 Unauthorized`.
  - Update both to the same value and redeploy/retry.

## Notes for this repository

This repository's primary runtime is still Flask (`app.py`). The Next.js route and Supabase function files are provided as integration deliverables for deployment in a Next.js + Supabase setup.
