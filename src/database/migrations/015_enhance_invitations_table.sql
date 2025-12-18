-- Migration: Enhance invitations table with required fields
-- Date: 2025-01-30
-- Description: Add required fields for staff and student invitations

-- Add new columns to invitations table
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS name VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS year_of_study INTEGER,
ADD COLUMN IF NOT EXISTS section VARCHAR(10),
ADD COLUMN IF NOT EXISTS roll_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS designation VARCHAR(100),
ADD COLUMN IF NOT EXISTS qualification VARCHAR(200),
ADD COLUMN IF NOT EXISTS experience INTEGER;

-- Add constraints for student-specific fields
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
  (role = 'student' AND section IS NOT NULL AND LENGTH(section) > 0)
);

ALTER TABLE invitations 
ADD CONSTRAINT chk_student_roll_number 
CHECK (
  (role != 'student') OR 
  (role = 'student' AND roll_number IS NOT NULL AND LENGTH(roll_number) > 0)
);

-- Add constraints for staff experience
ALTER TABLE invitations 
ADD CONSTRAINT chk_staff_experience 
CHECK (
  experience IS NULL OR 
  (experience >= 0 AND experience <= 50)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invitations_role ON invitations(role);
CREATE INDEX IF NOT EXISTS idx_invitations_year_section ON invitations(year_of_study, section) WHERE role = 'student';
CREATE INDEX IF NOT EXISTS idx_invitations_designation ON invitations(designation) WHERE role IN ('staff', 'hod');

-- Add comments for documentation
COMMENT ON COLUMN invitations.name IS 'Full name of the invited person';
COMMENT ON COLUMN invitations.phone IS 'Phone number of the invited person';
COMMENT ON COLUMN invitations.year_of_study IS 'Year of study (1-4) for student invitations';
COMMENT ON COLUMN invitations.section IS 'Section/class for student invitations';
COMMENT ON COLUMN invitations.roll_number IS 'Roll number for student invitations';
COMMENT ON COLUMN invitations.designation IS 'Job designation for staff invitations';
COMMENT ON COLUMN invitations.qualification IS 'Educational qualification for staff invitations';
COMMENT ON COLUMN invitations.experience IS 'Years of experience for staff invitations';

-- Create function to validate invitation data based on role
CREATE OR REPLACE FUNCTION validate_invitation_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate student-specific fields
  IF NEW.role = 'student' THEN
    IF NEW.name IS NULL OR LENGTH(TRIM(NEW.name)) = 0 THEN
      RAISE EXCEPTION 'Name is required for student invitations';
    END IF;
    
    IF NEW.year_of_study IS NULL OR NEW.year_of_study NOT BETWEEN 1 AND 4 THEN
      RAISE EXCEPTION 'Valid year of study (1-4) is required for student invitations';
    END IF;
    
    IF NEW.section IS NULL OR LENGTH(TRIM(NEW.section)) = 0 THEN
      RAISE EXCEPTION 'Section is required for student invitations';
    END IF;
    
    IF NEW.roll_number IS NULL OR LENGTH(TRIM(NEW.roll_number)) = 0 THEN
      RAISE EXCEPTION 'Roll number is required for student invitations';
    END IF;
    
    IF NEW.department_id IS NULL THEN
      RAISE EXCEPTION 'Department is required for student invitations';
    END IF;
  END IF;
  
  -- Validate staff-specific fields
  IF NEW.role IN ('staff', 'hod') THEN
    IF NEW.name IS NULL OR LENGTH(TRIM(NEW.name)) = 0 THEN
      RAISE EXCEPTION 'Name is required for staff invitations';
    END IF;
    
    IF NEW.department_id IS NULL THEN
      RAISE EXCEPTION 'Department is required for staff invitations';
    END IF;
  END IF;
  
  -- Validate principal-specific fields
  IF NEW.role = 'principal' THEN
    IF NEW.name IS NULL OR LENGTH(TRIM(NEW.name)) = 0 THEN
      RAISE EXCEPTION 'Name is required for principal invitations';
    END IF;
    
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

-- Create trigger to validate invitation data
DROP TRIGGER IF EXISTS trg_validate_invitation_data ON invitations;
CREATE TRIGGER trg_validate_invitation_data
  BEFORE INSERT OR UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION validate_invitation_data();

-- Update existing invitations to have default names (if any exist without names)
UPDATE invitations 
SET name = COALESCE(name, SPLIT_PART(email, '@', 1))
WHERE name IS NULL;

-- Create view for enhanced invitation details
CREATE OR REPLACE VIEW invitation_details AS
SELECT 
  i.*,
  u.name as sent_by_name,
  u.role as sender_role,
  c.name as college_name,
  d.name as department_name,
  d.code as department_code,
  CASE 
    WHEN i.role = 'student' THEN 
      CONCAT('Year ', i.year_of_study, ' - Section ', i.section, ' (', i.roll_number, ')')
    WHEN i.role IN ('staff', 'hod') THEN 
      COALESCE(i.designation, 'Staff Member')
    WHEN i.role = 'principal' THEN 
      'Principal'
    ELSE i.role
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

-- Migration completed successfully
SELECT 'Enhanced invitations table with required fields!' as migration_status;
