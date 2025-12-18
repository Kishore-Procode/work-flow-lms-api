-- Migration: Fix invitations table constraints and data
-- Date: 2025-01-30
-- Description: Fix existing data and constraints for enhanced invitations

-- First, update existing student invitations with default values
UPDATE invitations 
SET 
  name = COALESCE(name, SPLIT_PART(email, '@', 1)),
  year_of_study = CASE WHEN role = 'student' AND year_of_study IS NULL THEN 1 ELSE year_of_study END,
  section = CASE WHEN role = 'student' AND section IS NULL THEN 'A' ELSE section END,
  roll_number = CASE WHEN role = 'student' AND roll_number IS NULL THEN UPPER(SUBSTRING(email FROM 1 FOR 10)) ELSE roll_number END
WHERE role = 'student';

-- Update existing staff invitations with default values
UPDATE invitations 
SET 
  name = COALESCE(name, SPLIT_PART(email, '@', 1)),
  designation = CASE WHEN role IN ('staff', 'hod') AND designation IS NULL THEN 'Faculty' ELSE designation END
WHERE role IN ('staff', 'hod');

-- Update existing principal invitations with default values
UPDATE invitations 
SET 
  name = COALESCE(name, SPLIT_PART(email, '@', 1))
WHERE role = 'principal';

-- Drop existing constraints that are causing issues
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS chk_student_year_of_study;
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS chk_student_section;
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS chk_student_roll_number;

-- Drop the trigger temporarily
DROP TRIGGER IF EXISTS trg_validate_invitation_data ON invitations;
DROP FUNCTION IF EXISTS validate_invitation_data();

-- Add improved constraints that handle existing data
ALTER TABLE invitations 
ADD CONSTRAINT chk_student_year_of_study 
CHECK (
  (role != 'student') OR 
  (role = 'student' AND year_of_study IS NOT NULL AND year_of_study BETWEEN 1 AND 4)
);

ALTER TABLE invitations 
ADD CONSTRAINT chk_student_section 
CHECK (
  (role != 'student') OR 
  (role = 'student' AND section IS NOT NULL AND LENGTH(TRIM(section)) > 0)
);

ALTER TABLE invitations 
ADD CONSTRAINT chk_student_roll_number 
CHECK (
  (role != 'student') OR 
  (role = 'student' AND roll_number IS NOT NULL AND LENGTH(TRIM(roll_number)) > 0)
);

-- Create improved validation function
CREATE OR REPLACE FUNCTION validate_invitation_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure name is always provided
  IF NEW.name IS NULL OR LENGTH(TRIM(NEW.name)) = 0 THEN
    NEW.name := SPLIT_PART(NEW.email, '@', 1);
  END IF;
  
  -- Validate student-specific fields
  IF NEW.role = 'student' THEN
    IF NEW.year_of_study IS NULL THEN
      NEW.year_of_study := 1; -- Default to first year
    END IF;
    
    IF NEW.year_of_study NOT BETWEEN 1 AND 4 THEN
      RAISE EXCEPTION 'Year of study must be between 1 and 4 for student invitations';
    END IF;
    
    IF NEW.section IS NULL OR LENGTH(TRIM(NEW.section)) = 0 THEN
      NEW.section := 'A'; -- Default section
    END IF;
    
    IF NEW.roll_number IS NULL OR LENGTH(TRIM(NEW.roll_number)) = 0 THEN
      NEW.roll_number := UPPER(SUBSTRING(NEW.email FROM 1 FOR 10));
    END IF;
    
    IF NEW.department_id IS NULL THEN
      RAISE EXCEPTION 'Department is required for student invitations';
    END IF;
  END IF;
  
  -- Validate staff-specific fields
  IF NEW.role IN ('staff', 'hod') THEN
    IF NEW.department_id IS NULL THEN
      RAISE EXCEPTION 'Department is required for staff invitations';
    END IF;
    
    IF NEW.designation IS NULL OR LENGTH(TRIM(NEW.designation)) = 0 THEN
      NEW.designation := CASE 
        WHEN NEW.role = 'hod' THEN 'Head of Department'
        ELSE 'Faculty'
      END;
    END IF;
  END IF;
  
  -- Validate principal-specific fields
  IF NEW.role = 'principal' THEN
    IF NEW.college_id IS NULL THEN
      RAISE EXCEPTION 'College is required for principal invitations';
    END IF;
  END IF;
  
  -- Validate experience field
  IF NEW.experience IS NOT NULL AND (NEW.experience < 0 OR NEW.experience > 50) THEN
    RAISE EXCEPTION 'Experience must be between 0 and 50 years';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trg_validate_invitation_data
  BEFORE INSERT OR UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION validate_invitation_data();

-- Create improved view for enhanced invitation details
DROP VIEW IF EXISTS invitation_details;
CREATE VIEW invitation_details AS
SELECT 
  i.*,
  u.name as sent_by_name,
  u.role as sender_role,
  c.name as college_name,
  d.name as department_name,
  d.code as department_code,
  CASE 
    WHEN i.role = 'student' THEN 
      CONCAT('Year ', COALESCE(i.year_of_study::text, '1'), ' - Section ', COALESCE(i.section, 'A'), ' (', COALESCE(i.roll_number, 'TBD'), ')')
    WHEN i.role IN ('staff', 'hod') THEN 
      COALESCE(i.designation, 'Staff Member')
    WHEN i.role = 'principal' THEN 
      'Principal'
    ELSE i.role::text
  END as role_description,
  CASE 
    WHEN i.expires_at < NOW() THEN 'expired'
    WHEN i.status = 'pending' AND i.expires_at > NOW() THEN 'active'
    ELSE i.status
  END as current_status
FROM invitations i
LEFT JOIN users u ON i.sent_by = u.id
LEFT JOIN colleges c ON i.college_id = c.id
LEFT JOIN departments d ON i.department_id = d.id;

-- Grant permissions
GRANT SELECT ON invitation_details TO PUBLIC;

-- Verify the data is now valid
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  -- Check for any remaining invalid student records
  SELECT COUNT(*) INTO invalid_count
  FROM invitations 
  WHERE role = 'student' 
    AND (year_of_study IS NULL OR year_of_study NOT BETWEEN 1 AND 4 
         OR section IS NULL OR LENGTH(TRIM(section)) = 0
         OR roll_number IS NULL OR LENGTH(TRIM(roll_number)) = 0);
  
  IF invalid_count > 0 THEN
    RAISE NOTICE 'Found % invalid student invitation records that need manual review', invalid_count;
  ELSE
    RAISE NOTICE 'All student invitation records are now valid';
  END IF;
  
  -- Check for any remaining invalid staff records
  SELECT COUNT(*) INTO invalid_count
  FROM invitations 
  WHERE role IN ('staff', 'hod') 
    AND (name IS NULL OR LENGTH(TRIM(name)) = 0);
  
  IF invalid_count > 0 THEN
    RAISE NOTICE 'Found % invalid staff invitation records that need manual review', invalid_count;
  ELSE
    RAISE NOTICE 'All staff invitation records are now valid';
  END IF;
END $$;

-- Migration completed successfully
SELECT 'Fixed invitations table constraints and data!' as migration_status;
