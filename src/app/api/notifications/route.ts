import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Fetch recent pending notifications (last 30 submissions with notification_status = 'pending')
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('submissions')
    .select('id, submitted_by, brand_code, province_code, channel_code, created_at, notification_status, photo_url, note, net_price, basic_price')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch brand labels
  const { data: brands } = await supabaseAdmin.from('brands').select('code, label');
  const { data: provinces } = await supabaseAdmin.from('provinces').select('code, label');

  const getLabel = (arr: any[] | null, code: string | null) =>
    arr?.find(i => i.code === code)?.label || code || '—';

  const notifications = (data || []).map(sub => ({
    id: sub.id,
    title: getLabel(brands, sub.brand_code),
    submitter: sub.submitted_by || 'Unknown',
    province: getLabel(provinces, sub.province_code),
    time: sub.created_at,
    unread: sub.notification_status === 'pending',
    hasPhoto: !!sub.photo_url,
    hasNote: !!sub.note, note: sub.note,
    netPrice: sub.net_price,
  }));

  return NextResponse.json(notifications);
}

// PATCH: Mark one or all as read
export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, markAll } = body;

  if (markAll) {
    const { error } = await supabaseAdmin
      .from('submissions')
      .update({ notification_status: 'sent' })
      .eq('notification_status', 'pending');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (id) {
    const { error } = await supabaseAdmin
      .from('submissions')
      .update({ notification_status: 'sent' })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
