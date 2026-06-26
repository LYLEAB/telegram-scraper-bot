import { NextResponse } from 'next/server';

const REQUIRED_FIELDS = [
  'submitted_by',
  'region_code',
  'dealer_code',
  'province_code',
  'district_code',
  'brand_code',
  'channel_code',
  'sub_channel_code',
  'price_source_code',
  'type_select_code',
] as const;

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    for (const field of REQUIRED_FIELDS) {
      if (!body?.[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const supabaseUrl = readEnv('SUPABASE_URL');
    const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');

    // Auto-set submission date using Cambodia time (ICT = UTC+7)
    const ictDate = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const submission_date = ictDate.toISOString().split('T')[0];

    const insertPayload = {
      submitted_by: body.submitted_by,
      type_select_code: body.type_select_code ?? null,
      region_code: body.region_code,
      dealer_code: body.dealer_code,
      province_code: body.province_code,
      district_code: body.district_code,
      brand_code: body.brand_code,
      channel_code: body.channel_code,
      sub_channel_code: body.sub_channel_code,
      price_source_code: body.price_source_code,
      scheme: body.scheme ?? null,
      basic_price: body.basic_price ?? null,
      net_price: body.net_price ?? null,
      sellout_price_seller: body.sellout_price_seller ?? null,
      sellout_price_consumer: body.sellout_price_consumer ?? null,
      submission_date,
      note: body.note ?? null,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
    };

    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/submissions?select=id`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: ['Bearer', serviceRoleKey].join(' '),
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(insertPayload),
    });

    if (!insertResponse.ok) {
      const detail = await insertResponse.text();
      return NextResponse.json({ error: 'Unable to save submission', detail }, { status: 400 });
    }

    const rows = (await insertResponse.json()) as Array<{ id: string }>;
    const submissionId = rows[0]?.id;
    if (!submissionId) {
      return NextResponse.json({ error: 'Submission was created but id was missing' }, { status: 500 });
    }

    const edgeFunctionUrl = process.env.TELEGRAM_EDGE_FUNCTION_URL;
    const edgeSecret = process.env.TELEGRAM_EDGE_FUNCTION_SECRET;

    if (edgeFunctionUrl && edgeSecret) {
      fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-function-secret': edgeSecret,
        },
        body: JSON.stringify({ submission_id: submissionId }),
      }).catch(() => undefined);
    }

    return NextResponse.json({ ok: true, submission_id: submissionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
