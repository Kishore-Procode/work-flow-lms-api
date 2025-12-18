-- Migration: Fix get_departments_by_course function
-- Date: 2025-01-30
-- Description: Create a more robust function to get departments by course

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_departments_by_course(UUID);

-- Create improved function for getting departments by course
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
    -- First try to get departments directly linked to the course
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
    
    -- If no results found, try alternative approach
    -- Get departments from the same college as the course
    IF NOT FOUND THEN
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
        JOIN courses c ON d.college_id = c.college_id
        WHERE c.id = course_uuid
        AND c.is_active = true
        ORDER BY d.name ASC;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create alternative function that gets all departments for a college based on course
CREATE OR REPLACE FUNCTION get_departments_by_course_college(course_uuid UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    code VARCHAR(10),
    college_id UUID,
    hod_id UUID,
    total_students INTEGER,
    total_staff INTEGER,
    college_name VARCHAR(255)
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
        d.total_staff,
        col.name as college_name
    FROM departments d
    JOIN courses c ON d.college_id = c.college_id
    JOIN colleges col ON d.college_id = col.id
    WHERE c.id = course_uuid
    AND c.is_active = true
    AND col.status = 'active'
    ORDER BY d.name ASC;
END;
$$ LANGUAGE plpgsql;

-- Update courses to have proper department relationships
-- This is a data fix - link courses to departments based on business logic
UPDATE courses 
SET department_id = (
    SELECT d.id 
    FROM departments d 
    WHERE d.college_id = courses.college_id 
    AND (
        -- Match by similar names or codes
        LOWER(d.name) LIKE '%' || LOWER(SUBSTRING(courses.name FROM 1 FOR 10)) || '%'
        OR LOWER(d.code) = LOWER(courses.code)
        OR (courses.type = 'BE' AND LOWER(d.name) LIKE '%engineering%')
        OR (courses.type = 'BTech' AND LOWER(d.name) LIKE '%technology%')
        OR (courses.type = 'ME' AND LOWER(d.name) LIKE '%engineering%')
        OR (courses.type = 'MTech' AND LOWER(d.name) LIKE '%technology%')
    )
    LIMIT 1
)
WHERE department_id IS NULL;

-- If still no matches, link to the first department in the same college
UPDATE courses 
SET department_id = (
    SELECT d.id 
    FROM departments d 
    WHERE d.college_id = courses.college_id 
    ORDER BY d.name ASC
    LIMIT 1
)
WHERE department_id IS NULL;

-- Add comments for documentation
COMMENT ON FUNCTION get_departments_by_course(UUID) IS 'Get departments associated with a specific course, with fallback to college departments';
COMMENT ON FUNCTION get_departments_by_course_college(UUID) IS 'Get all departments in the same college as the course';

-- Test the function with existing data
DO $$
DECLARE
    course_record RECORD;
    dept_count INTEGER;
BEGIN
    -- Test with first course
    SELECT id, name INTO course_record FROM courses WHERE is_active = true LIMIT 1;
    
    IF course_record.id IS NOT NULL THEN
        SELECT COUNT(*) INTO dept_count FROM get_departments_by_course(course_record.id);
        RAISE NOTICE 'Course "%" (ID: %) has % departments available', course_record.name, course_record.id, dept_count;
    END IF;
END $$;

-- Migration completed successfully
SELECT 'Departments by course function fixed successfully!' as migration_status;
