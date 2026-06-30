import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const { data: submissions, error } = await supabaseAdmin
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch reference data for labels
  const results = await Promise.all([
    supabaseAdmin.from('brands').select('*'),
    supabaseAdmin.from('type_selects').select('*'),
    supabaseAdmin.from('provinces').select('*'),
    supabaseAdmin.from('districts').select('*'),
    supabaseAdmin.from('categories').select('*'),
    supabaseAdmin.from('regions').select('*'),
    supabaseAdmin.from('dealers').select('*'),
    supabaseAdmin.from('channels').select('*'),
    supabaseAdmin.from('sub_channels').select('*'),
    supabaseAdmin.from('price_sources').select('*'),
  ]);

  const brands = results[0].data || [];
  const types = results[1].data || [];
  const provinces = results[2].data || [];
  const districts = results[3].data || [];
  const categories = results[4].data || [];
  const regions = results[5].data || [];
  const dealers = results[6].data || [];
  const channels = results[7].data || [];
  const subChannels = results[8].data || [];
  const priceSources = results[9].data || [];

  const getLabel = (arr: any[], code: string) => {
    return arr.find(item => item.code === code)?.label || code;
  };

  const formattedSubmissions = (submissions || []).map((sub) => {
    const brandObj = brands.find(b => b.code === sub.brand_code);
    const categoryCode = brandObj ? brandObj.category_code : null;

    return {
      ...sub,
      phnom_penh_time: new Date(sub.created_at).toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }),
      category_label: categoryCode ? getLabel(categories, categoryCode) : '',
      brand_label: getLabel(brands, sub.brand_code),
      type_label: getLabel(types, sub.type_select_code),
      region_label: getLabel(regions, sub.region_code),
      dealer_label: getLabel(dealers, sub.dealer_code),
      province_label: getLabel(provinces, sub.province_code),
      district_label: getLabel(districts, sub.district_code),
      channel_label: getLabel(channels, sub.channel_code),
      sub_channel_label: getLabel(subChannels, sub.sub_channel_code),
      price_source_label: getLabel(priceSources, sub.price_source_code),
    };
  });

  return NextResponse.json(formattedSubmissions);
}
