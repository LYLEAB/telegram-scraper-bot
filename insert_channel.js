const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qcxcqyseyipkobputpkx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjeGNxeXNleWlwa29icHV0cGt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4ODQ4NywiZXhwIjoyMDk3MTY0NDg3fQ.mwLwtuqmGhIkVlIpIFSOhPCvgoL4xrikVgvlOnEpYTk'
);

async function run() {
  const { data, error } = await supabase
    .from('channels')
    .upsert({ code: 'specialize', label: 'Specialize' })
    .select();
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Inserted channel:', data);
  }
}

run();
