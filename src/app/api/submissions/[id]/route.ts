import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });
    }

    const { data: submission, error } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!submission) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
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

    const brand = brands.find(b => b.code === submission.brand_code);
    const categoryCode = brand?.category_code || submission.category_code;

    const enriched = {
      ...submission,
      phnom_penh_time: new Date(submission.created_at).toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }),
      brand_label: getLabel(brands, submission.brand_code),
      type_label: getLabel(types, submission.type_select_code),
      province_label: getLabel(provinces, submission.province_code),
      district_label: getLabel(districts, submission.district_code),
      category_label: getLabel(categories, categoryCode),
      region_label: getLabel(regions, submission.region_code),
      dealer_label: getLabel(dealers, submission.dealer_code),
      channel_label: getLabel(channels, submission.channel_code),
      sub_channel_label: getLabel(subChannels, submission.sub_channel_code),
      price_source_label: getLabel(priceSources, submission.price_source_code),
    };

    return NextResponse.json(enriched);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });
    }

    // 1. Fetch the submission to get the photo_url
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('submissions')
      .select('photo_url')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching submission for deletion:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch submission', details: fetchError }, { status: 500 });
    }

    // 2. Delete photos from storage if they exist
    if (submission?.photo_url) {
      const urls = submission.photo_url.split(',');
      const pathsToDelete: string[] = [];

      for (const url of urls) {
        // Extract the path after '/public/photos/'
        // Example: https://xyz.supabase.co/storage/v1/object/public/photos/2026-06-29/photo_123.jpg
        const parts = url.split('/public/photos/');
        if (parts.length > 1) {
          const path = parts[1];
          if (path) {
            pathsToDelete.push(path);
          }
        }
      }

      if (pathsToDelete.length > 0) {
        const { error: storageError } = await supabaseAdmin
          .storage
          .from('photos')
          .remove(pathsToDelete);

        if (storageError) {
          console.error('Failed to delete photos from storage:', storageError);
          // We can choose to return an error, or just proceed to delete the record anyway
        }
      }
    }

    // 3. Delete the record from the database
    const { error: deleteError } = await supabaseAdmin
      .from('submissions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete record', details: deleteError }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
