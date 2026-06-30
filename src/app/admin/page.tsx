import { supabaseAdmin } from '@/lib/supabase';
import AdminDashboard from './AdminDashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminPage() {
  // Fetch data from the sorted view we created earlier
  const { data: submissions, error } = await supabaseAdmin
    .from('sorted_submissions')
    .select('*');

  if (error) {
    console.error('Error fetching sorted submissions:', error);
  }

  // Fetch reference data for labels (to show user-friendly text)
  const results = await Promise.all([
    supabaseAdmin.from('brands').select('*').order('label'),
    supabaseAdmin.from('type_selects').select('*').order('label'),
    supabaseAdmin.from('provinces').select('*').order('label'),
    supabaseAdmin.from('districts').select('*').order('label'),
    supabaseAdmin.from('categories').select('*').order('label'),
    supabaseAdmin.from('regions').select('*').order('label'),
    supabaseAdmin.from('dealers').select('*').order('label'),
    supabaseAdmin.from('channels').select('*').order('label'),
    supabaseAdmin.from('sub_channels').select('*').order('label'),
    supabaseAdmin.from('price_sources').select('*').order('label'),
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

  // Map the submissions to include friendly labels
  const formattedSubmissions = (submissions || []).map((sub) => {
    const brandObj = brands.find(b => b.code === sub.brand_code);
    const categoryCode = brandObj ? brandObj.category_code : null;

    return {
      ...sub,
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

  return (
    <>
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200 mb-6">
          Failed to load submissions: {error.message}
        </div>
      )}
      
      {!error && (
        <AdminDashboard 
          initialSubmissions={formattedSubmissions} 
          brands={brands}
          provinces={provinces}
        />
      )}
    </>
  );
}
