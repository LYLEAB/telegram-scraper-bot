import { ReferenceData } from './constants';

export async function fetchReferenceData(): Promise<ReferenceData> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) are not set.');
  }

  const tables = [
    'regions',
    'provinces',
    'districts',
    'dealers',
    'district_dealers',
    'channels',
    'sub_channels',
    'categories',
    'brands',
    'type_selects',
    'price_sources',
  ];

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  const fetchTable = async (table: string) => {
    let select = '*';
    if (table === 'regions') select = 'code,label';
    if (table === 'provinces') select = 'code,label';
    if (table === 'districts') select = 'code,label,province_code';
    if (table === 'dealers') select = 'code,label,region_code';
    if (table === 'district_dealers') select = 'district_code,dealer_code';
    if (table === 'channels') select = 'code,label';
    if (table === 'sub_channels') select = 'code,label';
    if (table === 'categories') select = 'code,label';
    if (table === 'brands') select = 'code,label,category_code';
    if (table === 'type_selects') select = 'code,label';
    if (table === 'price_sources') select = 'code,label';

    const order = table === 'district_dealers' ? '' : '&order=label.asc';
    const url = `${supabaseUrl}/rest/v1/${table}?select=${select}${order}`;

    const res = await fetch(url, {
      method: 'GET',
      headers,
      next: { revalidate: 3600 }, // Cache on server for 1 hour to minimize API cost
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch ${table} from Supabase: ${errorText}`);
    }

    return res.json();
  };

  try {
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
    ] = await Promise.all(tables.map((table) => fetchTable(table)));

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
  } catch (error) {
    console.error('Error fetching reference data from Supabase:', error);
    throw error;
  }
}
