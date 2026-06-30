import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qcxcqyseyipkobputpkx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjeGNxeXNleWlwa29icHV0cGt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4ODQ4NywiZXhwIjoyMDk3MTY0NDg3fQ.mwLwtuqmGhIkVlIpIFSOhPCvgoL4xrikVgvlOnEpYTk'
);

async function run() {
  const { data, error } = await supabase.storage.createBucket('avatars', {
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    fileSizeLimit: 1024 * 1024 * 2 // 2MB
  });
  
  if (error) {
    console.error('Error creating bucket:', error);
  } else {
    console.log('Bucket created successfully:', data);
  }
}

run();
