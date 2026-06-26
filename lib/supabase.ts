import { ReferenceData } from './constants';

async function fetchTable(
  supabaseUrl: string,
  serviceRoleKey: string,
  table: string,
  select: string,
  orderBy?: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const order = orderBy ? `&order=${orderBy}` : '';
  const url = `${supabaseUrl}/rest/v1/${table}?select=${select}${order}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => 'unknown');
    throw new Error(`[${table}] HTTP ${res.status}: ${detail}`);
  }

  return res.json();
}

export async function fetchReferenceData(): Promise<ReferenceData> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error('Missing env: SUPABASE_URL');
  if (!serviceRoleKey) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY');

  // Strip trailing slash if present
  const baseUrl = supabaseUrl.replace(/\/+$/, '');

  const [
    regions,
    provinces,
    districts,
    dealers,
    district_dealers,
    channels,
    sub_channels,
    categories,
    brands,
    type_selects,
    price_sources,
  ] = await Promise.all([
    fetchTable(baseUrl, serviceRoleKey, 'regions',         'code,label',                    'label.asc'),
    fetchTable(baseUrl, serviceRoleKey, 'provinces',       'code,label',                    'label.asc'),
    fetchTable(baseUrl, serviceRoleKey, 'districts',       'code,label,province_code',       'label.asc'),
    fetchTable(baseUrl, serviceRoleKey, 'dealers',         'code,label,region_code',         'label.asc'),
    fetchTable(baseUrl, serviceRoleKey, 'district_dealers','district_code,dealer_code'),
    fetchTable(baseUrl, serviceRoleKey, 'channels',        'code,label',                    'label.asc'),
    fetchTable(baseUrl, serviceRoleKey, 'sub_channels',    'code,label',                    'label.asc'),
    fetchTable(baseUrl, serviceRoleKey, 'categories',      'code,label',                    'label.asc'),
    fetchTable(baseUrl, serviceRoleKey, 'brands',          'code,label,category_code',       'label.asc'),
    fetchTable(baseUrl, serviceRoleKey, 'type_selects',    'code,label',                    'label.asc'),
    fetchTable(baseUrl, serviceRoleKey, 'price_sources',   'code,label',                    'label.asc'),
  ]);

  return {
    regions,
    provinces,
    districts,
    dealers,
    district_dealers,
    channels,
    sub_channels,
    categories,
    brands,
    type_selects,
    price_sources,
  };
}
