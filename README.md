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

Run migration SQL in Supabase SQL editor or via Supabase CLI:

```sql
\i supabase/migrations/20260622101500_internal_form_pipeline.sql
```

The migration creates:

- reference tables: regions, dealers, provinces, districts, district_dealers, channels, sub_channels, categories, brands, type_selects, price_sources
- `submissions` table with notification tracking
- indexes on `created_at`, `region_code`, `dealer_code`, `submission_date`
- RLS enabled on `submissions` with baseline insert policy for anon/authenticated

## Kobo TSV seeding workflow

1. Parse the Kobo choices TSV:

```bash
python scripts/parse_kobo_tsv.py /absolute/path/to/choices.tsv --output /absolute/path/to/seed.json
```

2. Seed Supabase reference data:

```bash
export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
python scripts/seed_supabase.py --seed /absolute/path/to/seed.json
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

See `.env.example` for placeholders only.

Never commit real secrets (Telegram tokens, Supabase keys, service role keys).

## End-to-end test checklist

1. Run migration in Supabase.
2. Generate + seed reference data from Kobo TSV.
3. Submit sample payload to `POST /api/submit`.
4. Verify response contains `submission_id`.
5. Verify row in `submissions` is created.
6. Verify Telegram group receives message.
7. Verify `notification_status` transitions to `sent` or `failed` with `notification_error` populated on failure.

## Notes for this repository

This repository's primary runtime is still Flask (`app.py`). The Next.js route and Supabase function files are provided as integration deliverables for deployment in a Next.js + Supabase setup.
