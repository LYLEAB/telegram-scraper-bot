-- 1. Clean up existing orphaned photos
-- Since you already deleted all rows in submissions, any photos left in storage are orphaned.
-- This will delete all files currently inside the 'photos' bucket.
DELETE FROM storage.objects WHERE bucket_id = 'photos';

-- 2. Create a function to automatically delete photos when a submission is deleted
CREATE OR REPLACE FUNCTION delete_submission_photos()
RETURNS TRIGGER AS $$
DECLARE
    url text;
    photo_path text;
BEGIN
    -- Check if the deleted submission had any photos
    IF OLD.photo_url IS NOT NULL AND OLD.photo_url != '' THEN
        -- photo_url can contain multiple comma-separated URLs, so we loop through them
        FOR url IN SELECT unnest(string_to_array(OLD.photo_url, ',')) LOOP
            -- Extract just the file path from the full public URL
            -- e.g., '.../public/photos/2024-06-29/photo_123.jpg' -> '2024-06-29/photo_123.jpg'
            photo_path := split_part(url, '/public/photos/', 2);
            
            -- Delete the actual file from Supabase storage
            IF photo_path IS NOT NULL AND photo_path != '' THEN
                DELETE FROM storage.objects 
                WHERE bucket_id = 'photos' AND name = photo_path;
            END IF;
        END LOOP;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach the trigger to the submissions table
DROP TRIGGER IF EXISTS tr_delete_submission_photos ON submissions;
CREATE TRIGGER tr_delete_submission_photos
AFTER DELETE ON submissions
FOR EACH ROW
EXECUTE FUNCTION delete_submission_photos();
