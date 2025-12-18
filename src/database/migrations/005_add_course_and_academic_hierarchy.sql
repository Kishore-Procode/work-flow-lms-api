-- Migration: Add Course Table and Academic Hierarchy
-- Date: 2025-01-29
-- Description: Add Course table and proper academic hierarchy (Course → Department → Year → Section)

-- Create course type enum
CREATE TYPE course_type AS ENUM ('BE', 'ME', 'BTech', 'MTech', 'PhD', 'Diploma', 'Certificate');
CREATE TYPE section_status AS ENUM ('active', 'inactive', 'archived');

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL, -- e.g., "Bachelor of Engineering", "Master of Technology"
    code VARCHAR(10) NOT NULL, -- e.g., "BE", "MTech"
    type course_type NOT NULL,
    duration_years INTEGER NOT NULL DEFAULT 4, -- Course duration in years
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(college_id, code)
);

-- Create academic years table (for each course)
CREATE TABLE IF NOT EXISTS academic_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    year_number INTEGER NOT NULL, -- 1, 2, 3, 4
    year_name VARCHAR(50) NOT NULL, -- "1st Year", "2nd Year", etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, year_number)
);

-- Create sections/classes table
CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL, -- "A", "B", "C", etc.
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    class_in_charge_id UUID REFERENCES users(id) ON DELETE SET NULL,
    max_students INTEGER DEFAULT 60,
    current_students INTEGER DEFAULT 0,
    status section_status DEFAULT 'active',
    academic_session VARCHAR(20), -- "2024-25", "2025-26"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, department_id, academic_year_id, name, academic_session)
);

-- Update departments table to link with courses
ALTER TABLE departments ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

-- Update users table to include course and section references
ALTER TABLE users ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES sections(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS year_of_study VARCHAR(20); -- "1st Year", "2nd Year", etc.

-- Update registration_requests table to include course and section
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES sections(id) ON DELETE SET NULL;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_college_id ON courses(college_id);
CREATE INDEX IF NOT EXISTS idx_courses_type ON courses(type);
CREATE INDEX IF NOT EXISTS idx_courses_is_active ON courses(is_active);

CREATE INDEX IF NOT EXISTS idx_academic_years_course_id ON academic_years(course_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_year_number ON academic_years(year_number);

CREATE INDEX IF NOT EXISTS idx_sections_course_id ON sections(course_id);
CREATE INDEX IF NOT EXISTS idx_sections_department_id ON sections(department_id);
CREATE INDEX IF NOT EXISTS idx_sections_academic_year_id ON sections(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_sections_class_in_charge_id ON sections(class_in_charge_id);
CREATE INDEX IF NOT EXISTS idx_sections_status ON sections(status);

CREATE INDEX IF NOT EXISTS idx_departments_course_id ON departments(course_id);
CREATE INDEX IF NOT EXISTS idx_users_course_id ON users(course_id);
CREATE INDEX IF NOT EXISTS idx_users_section_id ON users(section_id);
CREATE INDEX IF NOT EXISTS idx_users_academic_year_id ON users(academic_year_id);

-- Add foreign key constraints
ALTER TABLE departments ADD CONSTRAINT fk_departments_course
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;

ALTER TABLE users ADD CONSTRAINT fk_users_course
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;

ALTER TABLE users ADD CONSTRAINT fk_users_section
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL;

ALTER TABLE users ADD CONSTRAINT fk_users_academic_year
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL;

-- Add triggers for updated_at timestamps
CREATE TRIGGER trigger_update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_academic_years_updated_at
    BEFORE UPDATE ON academic_years
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_sections_updated_at
    BEFORE UPDATE ON sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE courses IS 'Academic courses offered by colleges (BE, ME, BTech, etc.)';
COMMENT ON TABLE academic_years IS 'Year levels within each course (1st Year, 2nd Year, etc.)';
COMMENT ON TABLE sections IS 'Class sections within department-year combinations';

COMMENT ON COLUMN courses.duration_years IS 'Duration of the course in years';
COMMENT ON COLUMN sections.max_students IS 'Maximum number of students allowed in this section';
COMMENT ON COLUMN sections.current_students IS 'Current number of enrolled students';
COMMENT ON COLUMN sections.academic_session IS 'Academic session year (e.g., 2024-25)';

-- Migration completed successfully
SELECT 'Course table and academic hierarchy created successfully!' as migration_status;
