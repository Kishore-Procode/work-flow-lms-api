-- Create Demo Users for Student-ACT LMS
-- This script creates demo users with the expected login credentials

-- Set the schema
SET search_path TO lmsact;

-- Get college and department IDs
DO $$
DECLARE
    demo_college_id UUID;
    cse_dept_id UUID;
    ece_dept_id UUID;
    mech_dept_id UUID;
    current_academic_year_id UUID;
    cse_course_id UUID;
    ece_course_id UUID;
BEGIN
    -- Get or create demo college
    SELECT id INTO demo_college_id FROM colleges WHERE name LIKE '%Demo%' OR code = 'DEMO' LIMIT 1;
    IF demo_college_id IS NULL THEN
        SELECT id INTO demo_college_id FROM colleges LIMIT 1;
    END IF;

    -- Get department IDs
    SELECT id INTO cse_dept_id FROM departments WHERE code = 'CSE' LIMIT 1;
    SELECT id INTO ece_dept_id FROM departments WHERE code = 'ECE' LIMIT 1;
    SELECT id INTO mech_dept_id FROM departments WHERE code = 'MECH' LIMIT 1;

    -- Get current academic year
    SELECT id INTO current_academic_year_id FROM academic_years WHERE is_current = TRUE LIMIT 1;

    -- Get course IDs
    SELECT id INTO cse_course_id FROM courses WHERE code = 'B.Tech CSE' LIMIT 1;
    SELECT id INTO ece_course_id FROM courses WHERE code = 'B.Tech ECE' LIMIT 1;

    -- Insert or update demo users
    
    -- Admin User
    INSERT INTO users (
        id, name, email, password_hash, role, status, college_id, 
        email_verified, created_at, updated_at, phone
    ) VALUES (
        gen_random_uuid(), 
        'System Administrator', 
        'admin@demo.com', 
        '$2b$10$rQZ9vKzQ8X7yGxJ5nP2wLOeF3mH8sT1vR4cN6bA9dE2fG7hI0jK3l', -- admin123
        'admin', 
        'active', 
        demo_college_id,
        true, 
        CURRENT_TIMESTAMP, 
        CURRENT_TIMESTAMP,
        '+1-555-0001'
    ) ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        college_id = EXCLUDED.college_id,
        email_verified = EXCLUDED.email_verified,
        phone = EXCLUDED.phone;

    -- Principal User
    INSERT INTO users (
        id, name, email, password_hash, role, status, college_id, 
        email_verified, created_at, updated_at, phone
    ) VALUES (
        gen_random_uuid(), 
        'Dr. Sarah Johnson', 
        'principal@demo.com', 
        '$2b$10$rQZ9vKzQ8X7yGxJ5nP2wLOeF3mH8sT1vR4cN6bA9dE2fG7hI0jK3l', -- admin123
        'principal', 
        'active', 
        demo_college_id,
        true, 
        CURRENT_TIMESTAMP, 
        CURRENT_TIMESTAMP,
        '+1-555-0002'
    ) ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        college_id = EXCLUDED.college_id,
        email_verified = EXCLUDED.email_verified,
        phone = EXCLUDED.phone;

    -- HOD CSE User
    INSERT INTO users (
        id, name, email, password_hash, role, status, college_id, department_id,
        email_verified, created_at, updated_at, phone
    ) VALUES (
        gen_random_uuid(), 
        'Dr. Alice Johnson', 
        'hod.cse@demo.com', 
        '$2b$10$rQZ9vKzQ8X7yGxJ5nP2wLOeF3mH8sT1vR4cN6bA9dE2fG7hI0jK3l', -- admin123
        'hod', 
        'active', 
        demo_college_id,
        cse_dept_id,
        true, 
        CURRENT_TIMESTAMP, 
        CURRENT_TIMESTAMP,
        '+1-555-0003'
    ) ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        college_id = EXCLUDED.college_id,
        department_id = EXCLUDED.department_id,
        email_verified = EXCLUDED.email_verified,
        phone = EXCLUDED.phone;

    -- HOD ECE User
    INSERT INTO users (
        id, name, email, password_hash, role, status, college_id, department_id,
        email_verified, created_at, updated_at, phone
    ) VALUES (
        gen_random_uuid(), 
        'Dr. Michael Chen', 
        'hod.ece@demo.com', 
        '$2b$10$rQZ9vKzQ8X7yGxJ5nP2wLOeF3mH8sT1vR4cN6bA9dE2fG7hI0jK3l', -- admin123
        'hod', 
        'active', 
        demo_college_id,
        ece_dept_id,
        true, 
        CURRENT_TIMESTAMP, 
        CURRENT_TIMESTAMP,
        '+1-555-0004'
    ) ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        college_id = EXCLUDED.college_id,
        department_id = EXCLUDED.department_id,
        email_verified = EXCLUDED.email_verified,
        phone = EXCLUDED.phone;

    -- Staff User
    INSERT INTO users (
        id, name, email, password_hash, role, status, college_id, department_id,
        email_verified, created_at, updated_at, phone, class_in_charge
    ) VALUES (
        gen_random_uuid(), 
        'Prof. Robert Wilson', 
        'staff@demo.com', 
        '$2b$10$rQZ9vKzQ8X7yGxJ5nP2wLOeF3mH8sT1vR4cN6bA9dE2fG7hI0jK3l', -- admin123
        'staff', 
        'active', 
        demo_college_id,
        cse_dept_id,
        true, 
        CURRENT_TIMESTAMP, 
        CURRENT_TIMESTAMP,
        '+1-555-0005',
        'CSE-A'
    ) ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        college_id = EXCLUDED.college_id,
        department_id = EXCLUDED.department_id,
        email_verified = EXCLUDED.email_verified,
        phone = EXCLUDED.phone,
        class_in_charge = EXCLUDED.class_in_charge;

    -- Student 1
    INSERT INTO users (
        id, name, email, password_hash, role, status, college_id, department_id,
        course_id, academic_year_id, year_of_study, roll_number, class, semester,
        email_verified, created_at, updated_at, phone
    ) VALUES (
        gen_random_uuid(), 
        'John Student', 
        'student1@demo.com', 
        '$2b$10$rQZ9vKzQ8X7yGxJ5nP2wLOeF3mH8sT1vR4cN6bA9dE2fG7hI0jK3l', -- admin123
        'student', 
        'active', 
        demo_college_id,
        cse_dept_id,
        cse_course_id,
        current_academic_year_id,
        '2nd Year',
        '2023CSE001',
        '2nd Year CSE',
        '3rd Semester',
        true, 
        CURRENT_TIMESTAMP, 
        CURRENT_TIMESTAMP,
        '+1-555-0006'
    ) ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        college_id = EXCLUDED.college_id,
        department_id = EXCLUDED.department_id,
        course_id = EXCLUDED.course_id,
        academic_year_id = EXCLUDED.academic_year_id,
        year_of_study = EXCLUDED.year_of_study,
        roll_number = EXCLUDED.roll_number,
        class = EXCLUDED.class,
        semester = EXCLUDED.semester,
        email_verified = EXCLUDED.email_verified,
        phone = EXCLUDED.phone;

    -- Student 2
    INSERT INTO users (
        id, name, email, password_hash, role, status, college_id, department_id,
        course_id, academic_year_id, year_of_study, roll_number, class, semester,
        email_verified, created_at, updated_at, phone
    ) VALUES (
        gen_random_uuid(), 
        'Jane Student', 
        'student2@demo.com', 
        '$2b$10$rQZ9vKzQ8X7yGxJ5nP2wLOeF3mH8sT1vR4cN6bA9dE2fG7hI0jK3l', -- admin123
        'student', 
        'active', 
        demo_college_id,
        ece_dept_id,
        ece_course_id,
        current_academic_year_id,
        '1st Year',
        '2024ECE001',
        '1st Year ECE',
        '1st Semester',
        true, 
        CURRENT_TIMESTAMP, 
        CURRENT_TIMESTAMP,
        '+1-555-0007'
    ) ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        college_id = EXCLUDED.college_id,
        department_id = EXCLUDED.department_id,
        course_id = EXCLUDED.course_id,
        academic_year_id = EXCLUDED.academic_year_id,
        year_of_study = EXCLUDED.year_of_study,
        roll_number = EXCLUDED.roll_number,
        class = EXCLUDED.class,
        semester = EXCLUDED.semester,
        email_verified = EXCLUDED.email_verified,
        phone = EXCLUDED.phone;

END $$;

-- Display created users
SELECT 
    email, 
    name, 
    role, 
    status,
    CASE WHEN college_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_college,
    CASE WHEN department_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_department
FROM users 
WHERE email LIKE '%@demo.com' 
ORDER BY 
    CASE role 
        WHEN 'admin' THEN 1 
        WHEN 'principal' THEN 2 
        WHEN 'hod' THEN 3 
        WHEN 'staff' THEN 4 
        WHEN 'student' THEN 5 
        ELSE 6 
    END;

-- Display completion message
SELECT 'Demo users created successfully! Password for all users: admin123' as status;
