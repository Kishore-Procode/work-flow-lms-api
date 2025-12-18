-- Migration: Add Password and Academic Structure Fields to Registration Requests
-- Date: 2025-01-29
-- Description: Add password_hash and academic structure fields to registration_requests table

-- Add password_hash field for storing user passwords during registration
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add academic structure fields if they don't exist
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES sections(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_registration_requests_course_id ON registration_requests(course_id);
CREATE INDEX IF NOT EXISTS idx_registration_requests_academic_year_id ON registration_requests(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_registration_requests_section_id ON registration_requests(section_id);

-- Add foreign key constraints
ALTER TABLE registration_requests ADD CONSTRAINT IF NOT EXISTS fk_registration_requests_course
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;

ALTER TABLE registration_requests ADD CONSTRAINT IF NOT EXISTS fk_registration_requests_academic_year
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL;

ALTER TABLE registration_requests ADD CONSTRAINT IF NOT EXISTS fk_registration_requests_section
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON COLUMN registration_requests.password_hash IS 'Hashed password for user account creation upon approval';
COMMENT ON COLUMN registration_requests.course_id IS 'Reference to the course the student is registering for';
COMMENT ON COLUMN registration_requests.academic_year_id IS 'Reference to the academic year within the course';
COMMENT ON COLUMN registration_requests.section_id IS 'Reference to the specific section/class';

-- Migration completed successfully
SELECT 'Password and academic structure fields added to registration_requests table successfully!' as migration_status;
