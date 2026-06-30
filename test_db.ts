import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qcxcqyseyipkobputpkx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjeGNxeXNleWlwa29icHV0cGt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4ODQ4NywiZXhwIjoyMDk3MTY0NDg3fQ.mwLwtuqmGhIkVlIpIFSOhPCvgoL4xrikVgvlOnEpYTk';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: submissions, error: fetchErr } = await supabaseAdmin
    .from('submissions')
    .select('id')
    .limit(1);

  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    return;
  }
  
  if (submissions && submissions.length > 0) {
    const id = submissions[0].id;
    console.log('Testing single fetch with id:', id);
    const { data, error } = await supabaseAdmin
      .from('submissions')
      .select('photo_url')
      .eq('id', id)
      .single();
    console.log('Result:', { data, error });
  } else {
    console.log('No submissions found in table "submissions"');
  }
}

test();
