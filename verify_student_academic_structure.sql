-- Verify and Fix Academic Structure Data for Student Demo Account
-- This script ensures courses and departments are properly linked for student1@demo.com

SET search_path TO lmsact;

-- Step 1: Check current data
DO $$
DECLARE
    student_dept_id UUID;
    student_college_id UUID;
    cse_dept_id UUID;
    demo_college_id UUID;
    cse_course_id UUID;
    cse_course_count INT;
    dept_count INT;
BEGIN
    -- Get student's department and college
    SELECT department_id, college_id 
    INTO student_dept_id, student_college_id
    FROM users 
    WHERE email = 'student1@demo.com';

    RAISE NOTICE 'Student Department ID: %', student_dept_id;
    RAISE NOTICE 'Student College ID: %', student_college_id;

    -- Get CSE department
    SELECT id INTO cse_dept_id FROM departments WHERE code = 'CSE' LIMIT 1;
    RAISE NOTICE 'CSE Department ID: %', cse_dept_id;

    -- Get demo college
    SELECT id INTO demo_college_id FROM colleges LIMIT 1;
    RAISE NOTICE 'Demo College ID: %', demo_college_id;

    -- Check if courses exist for CSE department
    SELECT COUNT(*) INTO cse_course_count 
    FROM courses 
    WHERE department_id = cse_dept_id;
    
    RAISE NOTICE 'CSE Courses Count: %', cse_course_count;

    -- Check total departments
    SELECT COUNT(*) INTO dept_count FROM departments;
    RAISE NOTICE 'Total Departments: %', dept_count;

    -- If no courses exist for CSE, create one
    IF cse_course_count = 0 AND cse_dept_id IS NOT NULL AND demo_college_id IS NOT NULL THEN
        RAISE NOTICE 'Creating B.Tech CSE course...';
        
        INSERT INTO courses (
            name, 
            code, 
            description, 
            duration_years, 
            department_id,
            college_id,
            type,
            is_active
        ) VALUES (
            'Bachelor of Technology in Computer Science and Engineering',
            'B.Tech CSE',
            'Undergraduate program in Computer Science and Engineering',
            4,
            cse_dept_id,
            demo_college_id,
            'undergraduate',
            true
        ) ON CONFLICT (code) DO UPDATE SET
            department_id = EXCLUDED.department_id,
            college_id = EXCLUDED.college_id,
            is_active = true
        RETURNING id INTO cse_course_id;

        RAISE NOTICE 'Created/Updated Course ID: %', cse_course_id;

        -- Create academic years for the course if they don't exist
        FOR i IN 1..4 LOOP
            INSERT INTO academic_years (
                course_id,
                year_number,
                year_name,
                is_active
            ) VALUES (
                cse_course_id,
                i,
                i || CASE i
                    WHEN 1 THEN 'st Year'
                    WHEN 2 THEN 'nd Year'
                    WHEN 3 THEN 'rd Year'
                    ELSE 'th Year'
                END,
                true
            ) ON CONFLICT DO NOTHING;
        END LOOP;

        RAISE NOTICE 'Created academic years for course';

        -- Create a section if it doesn't exist
        INSERT INTO sections (
            name,
            course_id,
            department_id,
            academic_year_id,
            max_students,
            status,
            academic_session
        ) 
        SELECT 
            'Section A',
            cse_course_id,
            cse_dept_id,
            ay.id,
            60,
            'active',
            '2023-2024'
        FROM academic_years ay
        WHERE ay.course_id = cse_course_id AND ay.year_number = 2
        LIMIT 1
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Created section for course';
    END IF;

    -- Verify final counts
    SELECT COUNT(*) INTO cse_course_count 
    FROM courses 
    WHERE department_id = cse_dept_id;
    
    RAISE NOTICE 'Final CSE Courses Count: %', cse_course_count;

    -- Show all courses with department info
    RAISE NOTICE '--- All Courses ---';
    FOR cse_course_id IN 
        SELECT c.id 
        FROM courses c 
        WHERE c.department_id = cse_dept_id
    LOOP
        RAISE NOTICE 'Course ID: % Department ID: %', 
            (SELECT name FROM courses WHERE id = cse_course_id),
            (SELECT department_id FROM courses WHERE id = cse_course_id);
    END LOOP;

END $$;

-- Query to verify data
SELECT 
    u.email as student_email,
    u.department_id as student_dept_id,
    d.name as department_name,
    d.code as department_code,
    c.id as course_id,
    c.name as course_name,
    c.code as course_code,
    c.department_id as course_dept_id
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN courses c ON c.department_id = u.department_id
WHERE u.email = 'student1@demo.com';
