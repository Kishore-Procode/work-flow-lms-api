-- Migration: Add Enhanced Registration Fields
-- Date: 2025-01-29
-- Description: Add missing fields to support enhanced UI registration forms

-- Add missing fields to registration_requests table
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS semester VARCHAR(20);
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS batch_year INTEGER;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS year_of_study VARCHAR(20);
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS aadhar_number VARCHAR(12);
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS spoc_name VARCHAR(255);
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS spoc_email VARCHAR(255);
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS spoc_phone VARCHAR(20);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_registration_requests_batch_year ON registration_requests(batch_year);
CREATE INDEX IF NOT EXISTS idx_registration_requests_semester ON registration_requests(semester);
CREATE INDEX IF NOT EXISTS idx_registration_requests_year_of_study ON registration_requests(year_of_study);
CREATE INDEX IF NOT EXISTS idx_registration_requests_state ON registration_requests(state);
CREATE INDEX IF NOT EXISTS idx_registration_requests_district ON registration_requests(district);
CREATE INDEX IF NOT EXISTS idx_registration_requests_pincode ON registration_requests(pincode);

-- Add validation constraints
ALTER TABLE registration_requests ADD CONSTRAINT chk_aadhar_format 
  CHECK (aadhar_number IS NULL OR aadhar_number ~ '^[0-9]{12}$');

ALTER TABLE registration_requests ADD CONSTRAINT chk_pincode_format 
  CHECK (pincode IS NULL OR pincode ~ '^[0-9]{6}$');

-- Add comments for documentation
COMMENT ON COLUMN registration_requests.semester IS 'Student semester (e.g., 1st Semester, 2nd Semester)';
COMMENT ON COLUMN registration_requests.batch_year IS 'Student batch graduation year (e.g., 2026)';
COMMENT ON COLUMN registration_requests.year_of_study IS 'Student year of study (e.g., 1st Year, 2nd Year)';
COMMENT ON COLUMN registration_requests.spoc_name IS 'Single Point of Contact name for college registration';
COMMENT ON COLUMN registration_requests.spoc_email IS 'Single Point of Contact email for college registration';
COMMENT ON COLUMN registration_requests.spoc_phone IS 'Single Point of Contact phone for college registration';

-- Update existing validation schema to include new fields
-- This will be handled in the application layer validation schemas

-- Migration completed successfully
SELECT 'Enhanced registration fields added successfully!' as migration_status;
