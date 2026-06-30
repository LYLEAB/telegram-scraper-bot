import { supabaseAdmin } from '@/lib/supabase';
import UsersClient from './UsersClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function UsersPage() {
  const { data: submissions, error } = await supabaseAdmin
    .from('sorted_submissions')
    .select('*');

  if (error) {
    console.error('Error fetching submissions for users:', error);
  }

  const { data: provinces } = await supabaseAdmin.from('provinces').select('*').order('label');
  const { data: brands } = await supabaseAdmin.from('brands').select('*').order('label');

  // Derive users from submissions
  const userMap = new Map<string, any>();

  for (const sub of submissions || []) {
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
        submissions={submissions || []}
        provinces={provinces || []}
        brands={brands || []}
      />
    </>
  );
}
