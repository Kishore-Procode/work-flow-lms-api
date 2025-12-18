-- Migration: Add College Registration Fields
-- Date: 2025-08-29
-- Description: Add missing fields to colleges table to support college registration API

-- Add college type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE college_type AS ENUM ('government', 'private', 'aided');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing fields to colleges table
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS principal_name VARCHAR(255);
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS principal_email VARCHAR(255);
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS principal_phone VARCHAR(20);
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS total_students INTEGER;
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS total_faculty INTEGER;
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS college_type college_type;
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS affiliated_university VARCHAR(255);
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_colleges_principal_email ON colleges(principal_email);
CREATE INDEX IF NOT EXISTS idx_colleges_college_type ON colleges(college_type);
CREATE INDEX IF NOT EXISTS idx_colleges_city ON colleges(city);
CREATE INDEX IF NOT EXISTS idx_colleges_state ON colleges(state);
CREATE INDEX IF NOT EXISTS idx_colleges_pincode ON colleges(pincode);

-- Add validation constraints
ALTER TABLE colleges ADD CONSTRAINT chk_college_pincode_format 
  CHECK (pincode IS NULL OR pincode ~ '^[0-9]{6}$');

ALTER TABLE colleges ADD CONSTRAINT chk_college_principal_email_format 
  CHECK (principal_email IS NULL OR principal_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$');

-- Add comments for documentation
COMMENT ON COLUMN colleges.principal_name IS 'Name of the college principal';
COMMENT ON COLUMN colleges.principal_email IS 'Email address of the college principal';
COMMENT ON COLUMN colleges.principal_phone IS 'Phone number of the college principal';
COMMENT ON COLUMN colleges.total_students IS 'Total number of students in the college';
COMMENT ON COLUMN colleges.total_faculty IS 'Total number of faculty members in the college';
COMMENT ON COLUMN colleges.college_type IS 'Type of college (government, private, aided)';
COMMENT ON COLUMN colleges.affiliated_university IS 'University the college is affiliated with';
COMMENT ON COLUMN colleges.city IS 'City where the college is located';
COMMENT ON COLUMN colleges.state IS 'State where the college is located';
COMMENT ON COLUMN colleges.pincode IS 'Postal code of the college location';

-- Migration completed successfully
SELECT 'College registration fields added successfully!' as migration_status;
