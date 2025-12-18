-- Fix Users Table Schema - Add Missing Columns
-- This script adds the missing columns that the application expects

-- Set the schema
SET search_path TO lmsact;

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS roll_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS course_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS academic_year_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS year_of_study VARCHAR(20);

-- Create missing tables if they don't exist

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    duration_years INTEGER DEFAULT 4,
    department_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_courses_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- Sections table
CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    code VARCHAR(20) NOT NULL,
    course_id UUID,
    department_id UUID,
    academic_year_id UUID,
    class_teacher_id UUID,
    max_students INTEGER DEFAULT 60,
    current_students INTEGER DEFAULT 0,
    academic_session VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sections_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_sections_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    CONSTRAINT fk_sections_class_teacher FOREIGN KEY (class_teacher_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(course_id, department_id, academic_year_id, name, academic_session)
);

-- Academic Years table
CREATE TABLE IF NOT EXISTS academic_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year_name VARCHAR(20) NOT NULL UNIQUE, -- e.g., "2023-24", "2024-25"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints for the new columns
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_course_id_fkey 
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;

ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_section_id_fkey 
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL;

ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_academic_year_id_fkey 
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_course_id ON users(course_id);
CREATE INDEX IF NOT EXISTS idx_users_section_id ON users(section_id);
CREATE INDEX IF NOT EXISTS idx_users_academic_year_id ON users(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_users_roll_number ON users(roll_number);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Create indexes for the new tables
CREATE INDEX IF NOT EXISTS idx_courses_department_id ON courses(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);
CREATE INDEX IF NOT EXISTS idx_sections_course_id ON sections(course_id);
CREATE INDEX IF NOT EXISTS idx_sections_department_id ON sections(department_id);
CREATE INDEX IF NOT EXISTS idx_sections_academic_year_id ON sections(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_is_current ON academic_years(is_current);

-- Insert sample academic years if none exist
INSERT INTO academic_years (year_name, start_date, end_date, is_current)
SELECT '2024-25', '2024-06-01', '2025-05-31', TRUE
WHERE NOT EXISTS (SELECT 1 FROM academic_years WHERE year_name = '2024-25');

INSERT INTO academic_years (year_name, start_date, end_date, is_current)
SELECT '2023-24', '2023-06-01', '2024-05-31', FALSE
WHERE NOT EXISTS (SELECT 1 FROM academic_years WHERE year_name = '2023-24');

-- Insert sample courses if none exist
DO $$
DECLARE
    cse_dept_id UUID;
    ece_dept_id UUID;
    mech_dept_id UUID;
BEGIN
    -- Get department IDs
    SELECT id INTO cse_dept_id FROM departments WHERE code = 'CSE' LIMIT 1;
    SELECT id INTO ece_dept_id FROM departments WHERE code = 'ECE' LIMIT 1;
    SELECT id INTO mech_dept_id FROM departments WHERE code = 'MECH' LIMIT 1;

    -- Insert courses if departments exist
    IF cse_dept_id IS NOT NULL THEN
        INSERT INTO courses (name, code, description, duration_years, department_id)
        SELECT 'Bachelor of Technology in Computer Science and Engineering', 'B.Tech CSE', 'Undergraduate program in Computer Science and Engineering', 4, cse_dept_id
        WHERE NOT EXISTS (SELECT 1 FROM courses WHERE code = 'B.Tech CSE');
    END IF;

    IF ece_dept_id IS NOT NULL THEN
        INSERT INTO courses (name, code, description, duration_years, department_id)
        SELECT 'Bachelor of Technology in Electronics and Communication Engineering', 'B.Tech ECE', 'Undergraduate program in Electronics and Communication Engineering', 4, ece_dept_id
        WHERE NOT EXISTS (SELECT 1 FROM courses WHERE code = 'B.Tech ECE');
    END IF;

    IF mech_dept_id IS NOT NULL THEN
        INSERT INTO courses (name, code, description, duration_years, department_id)
        SELECT 'Bachelor of Technology in Mechanical Engineering', 'B.Tech MECH', 'Undergraduate program in Mechanical Engineering', 4, mech_dept_id
        WHERE NOT EXISTS (SELECT 1 FROM courses WHERE code = 'B.Tech MECH');
    END IF;
END $$;

-- Insert sample sections if none exist
DO $$
DECLARE
    cse_course_id UUID;
    ece_course_id UUID;
    current_academic_year_id UUID;
    cse_dept_id UUID;
    ece_dept_id UUID;
BEGIN
    -- Get IDs
    SELECT id INTO cse_course_id FROM courses WHERE code = 'B.Tech CSE' LIMIT 1;
    SELECT id INTO ece_course_id FROM courses WHERE code = 'B.Tech ECE' LIMIT 1;
    SELECT id INTO current_academic_year_id FROM academic_years WHERE is_current = TRUE LIMIT 1;
    SELECT id INTO cse_dept_id FROM departments WHERE code = 'CSE' LIMIT 1;
    SELECT id INTO ece_dept_id FROM departments WHERE code = 'ECE' LIMIT 1;

    -- Insert sections if courses exist
    IF cse_course_id IS NOT NULL AND current_academic_year_id IS NOT NULL AND cse_dept_id IS NOT NULL THEN
        INSERT INTO sections (name, code, course_id, department_id, academic_year_id, academic_session)
        SELECT 'Section A', 'CSE-A', cse_course_id, cse_dept_id, current_academic_year_id, '2024-25'
        WHERE NOT EXISTS (SELECT 1 FROM sections WHERE code = 'CSE-A' AND academic_year_id = current_academic_year_id);

        INSERT INTO sections (name, code, course_id, department_id, academic_year_id, academic_session)
        SELECT 'Section B', 'CSE-B', cse_course_id, cse_dept_id, current_academic_year_id, '2024-25'
        WHERE NOT EXISTS (SELECT 1 FROM sections WHERE code = 'CSE-B' AND academic_year_id = current_academic_year_id);
    END IF;

    IF ece_course_id IS NOT NULL AND current_academic_year_id IS NOT NULL AND ece_dept_id IS NOT NULL THEN
        INSERT INTO sections (name, code, course_id, department_id, academic_year_id, academic_session)
        SELECT 'Section A', 'ECE-A', ece_course_id, ece_dept_id, current_academic_year_id, '2024-25'
        WHERE NOT EXISTS (SELECT 1 FROM sections WHERE code = 'ECE-A' AND academic_year_id = current_academic_year_id);
    END IF;
END $$;

-- Update existing users to have email_verified = true if they have logged in
UPDATE users SET email_verified = TRUE WHERE last_login IS NOT NULL;

-- Update existing users to have default values for new columns
UPDATE users SET 
    year_of_study = CASE 
        WHEN role = 'student' AND class IS NOT NULL THEN 
            CASE 
                WHEN class LIKE '%1st%' OR class LIKE '%I%' THEN '1st Year'
                WHEN class LIKE '%2nd%' OR class LIKE '%II%' THEN '2nd Year'
                WHEN class LIKE '%3rd%' OR class LIKE '%III%' THEN '3rd Year'
                WHEN class LIKE '%4th%' OR class LIKE '%IV%' THEN '4th Year'
                ELSE '1st Year'
            END
        ELSE NULL
    END
WHERE year_of_study IS NULL;

-- Create trigger to update updated_at timestamp for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for new tables
DROP TRIGGER IF EXISTS trigger_update_courses_updated_at ON courses;
CREATE TRIGGER trigger_update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_sections_updated_at ON sections;
CREATE TRIGGER trigger_update_sections_updated_at
  BEFORE UPDATE ON sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_academic_years_updated_at ON academic_years;
CREATE TRIGGER trigger_update_academic_years_updated_at
  BEFORE UPDATE ON academic_years
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Display completion message
SELECT 'Users table schema fix completed successfully!' as status;
