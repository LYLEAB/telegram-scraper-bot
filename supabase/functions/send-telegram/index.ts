import { createClient } from 'npm:@supabase/supabase-js@2';

type Submission = {
  id: string;
  submitted_by: string;
  type_select_code: string | null;
  region_code: string | null;
  dealer_code: string | null;
  province_code: string | null;
  district_code: string | null;
  brand_code: string | null;
  channel_code: string | null;
  sub_channel_code: string | null;
  price_source_code: string | null;
  scheme: string | null;
  basic_price: number | null;
  net_price: number | null;
  sellout_price_seller: number | null;
  sellout_price_consumer: number | null;
  submission_date: string;
  note: string | null;
  lat: number | null;
  lng: number | null;
};

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '-';
  return `$${value}`;
}

async function getLabel(
  supabase: ReturnType<typeof createClient>,
  table: string,
  code: string | null,
): Promise<string> {
  if (!code) return '-';

  const { data, error } = await supabase.from(table).select('label').eq('code', code).maybeSingle();
  if (error || !data) return code;
  return data.label as string;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const expectedSecret = Deno.env.get('FUNCTION_SECRET');
  const providedSecret = req.headers.get('x-function-secret');
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  let submissionId: string | null = null;

  try {
    const body = await req.json();
    submissionId = body?.submission_id ?? null;
    if (!submissionId) {
      return new Response('submission_id is required', { status: 400 });
    }

    const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));

    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .maybeSingle<Submission>();

    if (submissionError) {
      return new Response(`Failed to fetch submission: ${submissionError.message}`, { status: 500 });
    }

    if (!submission) {
      return new Response('Submission not found', { status: 404 });
    }

    const [
      typeLabel,
      regionLabel,
      dealerLabel,
      provinceLabel,
      districtLabel,
      brandLabel,
      channelLabel,
      subChannelLabel,
      priceSourceLabel,
    ] = await Promise.all([
      getLabel(supabase, 'type_selects', submission.type_select_code),
      getLabel(supabase, 'regions', submission.region_code),
      getLabel(supabase, 'dealers', submission.dealer_code),
      getLabel(supabase, 'provinces', submission.province_code),
      getLabel(supabase, 'districts', submission.district_code),
      getLabel(supabase, 'brands', submission.brand_code),
      getLabel(supabase, 'channels', submission.channel_code),
      getLabel(supabase, 'sub_channels', submission.sub_channel_code),
      getLabel(supabase, 'price_sources', submission.price_source_code),
    ]);

    const mapUrl =
      submission.lat !== null && submission.lng !== null
        ? `Open Google Maps (http://maps.google.com/maps?q=${submission.lat},${submission.lng})`
        : '-';

    const lines = [
      `Submitted by: ${submission.submitted_by}`,
      '',
      `Promotion of: ${brandLabel} ${typeLabel}`,
      `Region: ${regionLabel}`,
      `Dealer: ${dealerLabel}`,
      `Location: ${districtLabel}, ${provinceLabel}`,
      `Location Map: ${mapUrl}`,
      `Channel: ${channelLabel} (${subChannelLabel})`,
      `Scheme: ${submission.scheme ?? '-'}`,
      `• Basic Price: ${formatCurrency(submission.basic_price)} (From ${priceSourceLabel})`,
      `• Net Price: ${formatCurrency(submission.net_price)}`,
      `• Sell Out Price to seller (អ្នកលក់): ${formatCurrency(submission.sellout_price_seller)}`,
      `• Sell Out Price to consumer (អ្នកផឹក): ${formatCurrency(submission.sellout_price_consumer)}`,
      `Date: ${submission.submission_date}`,
      `Note: ${submission.note ?? '-'}`,
    ];

    const telegramResponse = await fetch(`https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env('TELEGRAM_CHAT_ID'),
        text: lines.join('\n'),
        disable_web_page_preview: false,
      }),
    });

    if (!telegramResponse.ok) {
      const telegramError = await telegramResponse.text();
      await supabase
        .from('submissions')
        .update({ notification_status: 'failed', notification_error: telegramError })
        .eq('id', submission.id);
      return new Response(`Telegram send failed: ${telegramError}`, { status: 502 });
    }

    await supabase
      .from('submissions')
      .update({ notification_status: 'sent', notification_error: null })
      .eq('id', submission.id);

    return new Response(JSON.stringify({ ok: true, submission_id: submission.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    try {
      if (submissionId) {
        const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));
        await supabase
          .from('submissions')
          .update({
            notification_status: 'failed',
            notification_error: error instanceof Error ? error.message : String(error),
          })
          .eq('id', submissionId);
      }
    } catch (_) {
      // no-op
    }
    return new Response(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`, {
      status: 500,
    });
  }
});
