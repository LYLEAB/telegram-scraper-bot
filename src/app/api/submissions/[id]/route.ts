import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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
          console.error('Error deleting photos from storage:', storageError);
          // Proceed to delete row even if storage deletion fails, 
          // or you could choose to abort here. We will log it and proceed.
        }
      }
    }

    // 3. Delete the submission row
    const { error: deleteError } = await supabaseAdmin
      .from('submissions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting submission row:', deleteError);
      return NextResponse.json({ error: 'Failed to delete submission' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Submission and associated photos deleted.' });

  } catch (error: any) {
    console.error('Unexpected error in DELETE handler:', error);
    return NextResponse.json({ error: 'An unexpected error occurred', details: error.message }, { status: 500 });
  }
}
