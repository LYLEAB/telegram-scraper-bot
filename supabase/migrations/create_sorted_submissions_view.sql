-- Create a View that sorts submissions by brand and then by time (newest first).
-- It also adds a column 'phnom_penh_time' to show the correct local time in Cambodia.

CREATE OR REPLACE VIEW sorted_submissions AS
SELECT 
    *,
    (created_at AT TIME ZONE 'Asia/Phnom_Penh') AS phnom_penh_time
FROM 
    submissions
ORDER BY 
    brand_code ASC, 
    created_at DESC;
