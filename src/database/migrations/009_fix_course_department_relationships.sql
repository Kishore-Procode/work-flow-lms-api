-- Migration: Fix Course-Department Relationships for Course-First Signup Flow
-- Date: 2025-01-30
-- Description: Optimize database schema to support course-first student signup flow

-- Step 1: Add department_id to courses table for proper relationship
ALTER TABLE courses ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE CASCADE;

-- Step 2: Create index for performance optimization
CREATE INDEX IF NOT EXISTS idx_courses_department_id ON courses(department_id);

-- Step 3: Update existing courses to have proper department relationships
-- This should be done manually based on business logic, but here's a template:
-- UPDATE courses SET department_id = (SELECT id FROM departments WHERE departments.course_id = courses.id LIMIT 1);

-- Step 4: Create optimized views for signup form data loading
CREATE OR REPLACE VIEW v_courses_with_departments AS
SELECT 
    c.id,
    c.name,
    c.code,
    c.type,
    c.duration_years,
    c.college_id,
    c.department_id,
    c.is_active,
    c.description,
    d.name as department_name,
    d.code as department_code,
    col.name as college_name
FROM courses c
LEFT JOIN departments d ON c.department_id = d.id
LEFT JOIN colleges col ON c.college_id = col.id
WHERE c.is_active = true;

-- Step 5: Create optimized view for sections with all relationships
CREATE OR REPLACE VIEW v_sections_with_details AS
SELECT 
    s.id,
    s.name,
    s.course_id,
    s.department_id,
    s.academic_year_id,
    s.max_students,
    s.current_students,
    s.status,
    s.academic_session,
    c.name as course_name,
    c.code as course_code,
    d.name as department_name,
    d.code as department_code,
    ay.year_name,
    ay.year_number,
    col.name as college_name
FROM sections s
JOIN courses c ON s.course_id = c.id
JOIN departments d ON s.department_id = d.id
JOIN academic_years ay ON s.academic_year_id = ay.id
JOIN colleges col ON c.college_id = col.id
WHERE s.status = 'active' AND c.is_active = true;

-- Step 6: Create function for getting courses by college (optimized for signup)
CREATE OR REPLACE FUNCTION get_courses_by_college(college_uuid UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    code VARCHAR(10),
    type course_type,
    duration_years INTEGER,
    department_id UUID,
    department_name VARCHAR(255),
    department_code VARCHAR(10)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.code,
        c.type,
        c.duration_years,
        c.department_id,
        d.name as department_name,
        d.code as department_code
    FROM courses c
    LEFT JOIN departments d ON c.department_id = d.id
    WHERE c.college_id = college_uuid 
    AND c.is_active = true
    ORDER BY c.name ASC;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create function for getting sections by course and year
CREATE OR REPLACE FUNCTION get_sections_by_course_and_year(course_uuid UUID, year_name_param VARCHAR(50))
RETURNS TABLE (
    id UUID,
    name VARCHAR(50),
    course_id UUID,
    department_id UUID,
    academic_year_id UUID,
    max_students INTEGER,
    current_students INTEGER,
    academic_session VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.course_id,
        s.department_id,
        s.academic_year_id,
        s.max_students,
        s.current_students,
        s.academic_session
    FROM sections s
    JOIN academic_years ay ON s.academic_year_id = ay.id
    WHERE s.course_id = course_uuid 
    AND ay.year_name = year_name_param
    AND s.status = 'active'
    ORDER BY s.name ASC;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create function for getting departments by course
CREATE OR REPLACE FUNCTION get_departments_by_course(course_uuid UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    code VARCHAR(10),
    college_id UUID,
    hod_id UUID,
    total_students INTEGER,
    total_staff INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.name,
        d.code,
        d.college_id,
        d.hod_id,
        d.total_students,
        d.total_staff
    FROM departments d
    JOIN courses c ON d.id = c.department_id
    WHERE c.id = course_uuid
    AND c.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Add performance indexes for the new flow
CREATE INDEX IF NOT EXISTS idx_sections_course_year ON sections(course_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_course_year ON academic_years(course_id, year_name);
CREATE INDEX IF NOT EXISTS idx_courses_college_active ON courses(college_id, is_active);

-- Step 10: Add constraints to ensure data integrity
ALTER TABLE courses ADD CONSTRAINT chk_courses_department_college 
CHECK (department_id IS NULL OR EXISTS (
    SELECT 1 FROM departments d WHERE d.id = department_id AND d.college_id = college_id
));

-- Step 11: Update registration_requests table to support new flow
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS year_of_study VARCHAR(20);

-- Add comments for documentation
COMMENT ON FUNCTION get_courses_by_college(UUID) IS 'Optimized function to get courses by college for signup form';
COMMENT ON FUNCTION get_sections_by_course_and_year(UUID, VARCHAR) IS 'Get sections filtered by course and academic year';
COMMENT ON FUNCTION get_departments_by_course(UUID) IS 'Get departments associated with a specific course';
COMMENT ON VIEW v_courses_with_departments IS 'Optimized view for course data with department and college information';
COMMENT ON VIEW v_sections_with_details IS 'Complete section information with all related entities';

-- Migration completed successfully
SELECT 'Course-Department relationship optimization completed successfully!' as migration_status;
