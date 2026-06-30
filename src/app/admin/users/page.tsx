import { supabaseAdmin } from '@/lib/supabase';
import UsersClient from './UsersClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function UsersPage() {
  const { data: submissions, error } = await supabaseAdmin
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching submissions for users:', error);
  }

  // Fetch reference data for labels
  const results = await Promise.all([
    supabaseAdmin.from('brands').select('*').order('label'),
    supabaseAdmin.from('provinces').select('*').order('label'),
    supabaseAdmin.from('districts').select('*').order('label'),
    supabaseAdmin.from('channels').select('*').order('label'),
    supabaseAdmin.from('categories').select('*').order('label'),
    supabaseAdmin.from('type_selects').select('*').order('label'),
  ]);

  const brands = results[0].data || [];
  const provinces = results[1].data || [];
  const districts = results[2].data || [];
  const channels = results[3].data || [];
  const categories = results[4].data || [];
  const types = results[5].data || [];

  const getLabel = (arr: any[], code: string) => arr.find(item => item.code === code)?.label || code;

  // Format submissions to include labels before deriving users
  const formattedSubmissions = (submissions || []).map(sub => {
    const brandObj = brands.find(b => b.code === sub.brand_code);
    const categoryCode = brandObj ? brandObj.category_code : null;

    return {
      ...sub,
      phnom_penh_time: new Date(sub.created_at).toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }),
      brand_label: getLabel(brands, sub.brand_code),
      province_label: getLabel(provinces, sub.province_code),
      district_label: getLabel(districts, sub.district_code),
      channel_label: getLabel(channels, sub.channel_code),
      category_label: categoryCode ? getLabel(categories, categoryCode) : '',
      type_label: getLabel(types, sub.type_select_code),
    };
  });

  // Derive users from formatted submissions
  const userMap = new Map<string, any>();

  for (const sub of formattedSubmissions) {
    const name = sub.submitted_by || 'Unknown';
    if (!userMap.has(name)) {
      userMap.set(name, {
        name,
        totalSubmissions: 0,
        lastSubmission: null,
        firstSubmission: null,
        provinces: new Set<string>(),
        brands: new Set<string>(),
        channels: new Set<string>(),
        photosCount: 0,
        notesCount: 0,
        dates: [],
      });
    }
    const u = userMap.get(name)!;
    u.totalSubmissions++;

    const dateStr = sub.phnom_penh_time || sub.created_at;
    if (dateStr) {
      u.dates.push(dateStr);
      if (!u.lastSubmission || dateStr > u.lastSubmission) u.lastSubmission = dateStr;
      if (!u.firstSubmission || dateStr < u.firstSubmission) u.firstSubmission = dateStr;
    }
    if (sub.province_label) u.provinces.add(sub.province_label);
    if (sub.brand_code) u.brands.add(sub.brand_code);
    if (sub.channel_label) u.channels.add(sub.channel_label);
    if (sub.photo_url) u.photosCount++;
    if (sub.note) u.notesCount++;
  }

  const users = Array.from(userMap.values()).map(u => ({
    ...u,
    provinces: Array.from(u.provinces),
    brands: Array.from(u.brands),
    channels: Array.from(u.channels),
    dates: undefined, // strip raw dates
  }));

  // Sort by most submissions first
  users.sort((a, b) => b.totalSubmissions - a.totalSubmissions);

  return (
    <>
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200 mb-6">
          Failed to load users: {error.message}
        </div>
      )}
      <UsersClient
        users={users}
        submissions={formattedSubmissions}
        provinces={provinces}
        brands={brands}
      />
    </>
  );
}
