-- Migration: Fix Semester Field Length
-- Date: 2025-08-29
-- Description: Increase semester field length to accommodate longer semester names

-- Increase semester field length in users table
ALTER TABLE users ALTER COLUMN semester TYPE VARCHAR(20);

-- Increase semester field length in registration_requests table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'registration_requests' 
               AND column_name = 'semester') THEN
        ALTER TABLE registration_requests ALTER COLUMN semester TYPE VARCHAR(20);
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN users.semester IS 'Student semester (e.g., 1st Semester, 2nd Semester, etc.)';

-- Migration completed successfully
SELECT 'Semester field length increased successfully!' as migration_status;
