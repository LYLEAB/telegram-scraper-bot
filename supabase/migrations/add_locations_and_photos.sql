-- Add new text columns for Commune and Village, and new pricing column
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS commune text,
ADD COLUMN IF NOT EXISTS village text,
ADD COLUMN IF NOT EXISTS sellout_price_consumer_can numeric,
ADD COLUMN IF NOT EXISTS photo_url text;

-- Create the Storage Bucket for 'photos' if it doesn't exist
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

-- Ensure anyone can upload photos to the bucket (for the Form)
drop policy if exists "Allow public uploads to photos bucket" on storage.objects;
create policy "Allow public uploads to photos bucket"
on storage.objects for insert
with check ( bucket_id = 'photos' );

-- Ensure anyone can view the photos (since Telegram needs to access the public URL)
drop policy if exists "Allow public viewing of photos" on storage.objects;
create policy "Allow public viewing of photos"
on storage.objects for select
using ( bucket_id = 'photos' );
