-- Fix Foreign Key Constraints and Missing Columns
-- This script adds the missing foreign key constraints and fixes table structures

-- Set the schema
SET search_path TO lmsact;

-- Add missing columns to academic_years table if they don't exist
ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS year_name VARCHAR(20);
ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT FALSE;

-- Add missing columns to courses table if they don't exist
ALTER TABLE courses ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS code VARCHAR(20);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_years INTEGER DEFAULT 4;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS department_id UUID;

-- Add missing columns to sections table if they don't exist
ALTER TABLE sections ADD COLUMN IF NOT EXISTS name VARCHAR(50);
ALTER TABLE sections ADD COLUMN IF NOT EXISTS code VARCHAR(20);
ALTER TABLE sections ADD COLUMN IF NOT EXISTS course_id UUID;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS academic_year_id UUID;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS class_teacher_id UUID;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 60;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS current_students INTEGER DEFAULT 0;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS academic_session VARCHAR(20);

-- Add foreign key constraints (using DO block to handle existing constraints)
DO $$
BEGIN
    -- Add users_course_id_fkey if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_course_id_fkey' 
        AND table_name = 'users' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_course_id_fkey 
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;
    END IF;

    -- Add users_section_id_fkey if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_section_id_fkey' 
        AND table_name = 'users' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_section_id_fkey 
            FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL;
    END IF;

    -- Add users_academic_year_id_fkey if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_academic_year_id_fkey' 
        AND table_name = 'users' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_academic_year_id_fkey 
            FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL;
    END IF;

    -- Add courses_department_id_fkey if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'courses_department_id_fkey' 
        AND table_name = 'courses' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE courses ADD CONSTRAINT courses_department_id_fkey 
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
    END IF;

    -- Add sections_course_id_fkey if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sections_course_id_fkey' 
        AND table_name = 'sections' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE sections ADD CONSTRAINT sections_course_id_fkey 
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
    END IF;

    -- Add sections_department_id_fkey if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sections_department_id_fkey' 
        AND table_name = 'sections' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE sections ADD CONSTRAINT sections_department_id_fkey 
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE;
    END IF;

    -- Add sections_academic_year_id_fkey if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sections_academic_year_id_fkey' 
        AND table_name = 'sections' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE sections ADD CONSTRAINT sections_academic_year_id_fkey 
            FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create unique constraints if they don't exist
DO $$
BEGIN
    -- Add unique constraint for academic_years.year_name if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'academic_years_year_name_key' 
        AND table_name = 'academic_years' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE academic_years ADD CONSTRAINT academic_years_year_name_key UNIQUE (year_name);
    END IF;

    -- Add unique constraint for courses.code if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'courses_code_key' 
        AND table_name = 'courses' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE courses ADD CONSTRAINT courses_code_key UNIQUE (code);
    END IF;
END $$;

-- Insert sample academic years if none exist
INSERT INTO academic_years (year_name, start_date, end_date, is_current)
SELECT '2024-25', '2024-06-01', '2025-05-31', TRUE
WHERE NOT EXISTS (SELECT 1 FROM academic_years WHERE year_name = '2024-25');

INSERT INTO academic_years (year_name, start_date, end_date, is_current)
SELECT '2023-24', '2023-06-01', '2024-05-31', FALSE
WHERE NOT EXISTS (SELECT 1 FROM academic_years WHERE year_name = '2023-24');

-- Insert sample courses if none exist and departments exist
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

-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_courses_department_id ON courses(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);
CREATE INDEX IF NOT EXISTS idx_sections_course_id ON sections(course_id);
CREATE INDEX IF NOT EXISTS idx_sections_department_id ON sections(department_id);
CREATE INDEX IF NOT EXISTS idx_sections_academic_year_id ON sections(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_is_current ON academic_years(is_current);

-- Display completion message
SELECT 'Database schema constraints fixed successfully!' as status;
