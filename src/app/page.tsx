export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Form from '@/components/Form';
import { supabaseAdmin } from '@/lib/supabase';

// Fetch options on the server side to pass to the client
export default async function Home() {
  // We can fetch all the options here at build time / request time
  const results = await Promise.all([
    supabaseAdmin.from('brands').select('*').order('label'),
    supabaseAdmin.from('type_selects').select('*').order('label'),
    supabaseAdmin.from('regions').select('*').order('label'),
    supabaseAdmin.from('dealers').select('*').order('label'),
    supabaseAdmin.from('provinces').select('*').order('label'),
    supabaseAdmin.from('districts').select('*').order('label'),
    supabaseAdmin.from('channels').select('*').order('label'),
    supabaseAdmin.from('sub_channels').select('*').order('label'),
    supabaseAdmin.from('price_sources').select('*').order('label'),
    supabaseAdmin.from('categories').select('*').order('label'),
  ]);

  results.forEach((res, i) => {
    if (res.error) console.error(`Error fetching index ${i}:`, res.error);
  });

  const options = {
    brands: results[0].data || [],
    types: results[1].data || [],
    regions: results[2].data || [],
    dealers: results[3].data || [],
    provinces: results[4].data || [],
    districts: results[5].data || [],
    channels: results[6].data || [],
    subChannels: results[7].data || [],
    priceSources: results[8].data || [],
    categories: results[9].data || [],
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Price Tracking Form</h1>
          <p className="text-gray-500 mt-2">Submit latest market intelligence data</p>
        </header>

        <Form options={options} />
      </div>
    </main>
  );
}
