-- Create Demo Users for Student-ACT LMS (Simple Version)
-- This script creates demo users with shorter field values

-- Set the schema
SET search_path TO lmsact;

-- Create demo users with simple values
DO $$
DECLARE
    demo_college_id UUID;
    cse_dept_id UUID;
    ece_dept_id UUID;
BEGIN
    -- Get college and department IDs
    SELECT id INTO demo_college_id FROM colleges LIMIT 1;
    SELECT id INTO cse_dept_id FROM departments WHERE code = 'CSE' LIMIT 1;
    SELECT id INTO ece_dept_id FROM departments WHERE code = 'ECE' LIMIT 1;

    -- Admin User
    INSERT INTO users (
        name, email, password_hash, role, status, college_id, email_verified, phone
    ) VALUES (
        'System Administrator', 
        'admin@demo.com', 
        '$2b$10$rQZ9vKzQ8X7yGxJ5nP2wLOeF3mH8sT1vR4cN6bA9dE2fG7hI0jK3l',
        'admin', 
        'active', 
        demo_college_id,
        true,
        '555-0001'
    ) ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        college_id = EXCLUDED.college_id,
        email_verified = EXCLUDED.email_verified,
        phone = EXCLUDED.phone;

    -- Principal User (as admin role)
    INSERT INTO users (
        name, email, password_hash, role, status, college_id, email_verified, phone
    ) VALUES (
        'Dr. Sarah Johnson', 
        'principal@demo.com', 
        '$2b$10$rQZ9vKzQ8X7yGxJ5nP2wLOeF3mH8sT1vR4cN6bA9dE2fG7hI0jK3l',
        'admin', 
        'active', 
        demo_college_id,
        true,
        '555-0002'
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
        name, email, password_hash, role, status, college_id, department_id, email_verified, phone
    ) VALUES (
        'Dr. Alice Johnson', 
        'hod.cse@demo.com', 
        '$2b$10$rQZ9vKzQ8X7yGxJ5nP2wLOeF3mH8sT1vR4cN6bA9dE2fG7hI0jK3l',
        'hod', 
        'active', 
        demo_college_id,
        cse_dept_id,
        true,
        '555-0003'
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
        name, email, password_hash, role, status, college_id, department_id, email_verified, phone
    ) VALUES (
        'Dr. Michael Chen', 
        'hod.ece@demo.com', 
        '$2b$10$rQZ9vKzQ8X7yGxJ5nP2wLOeF3mH8sT1vR4cN6bA9dE2fG7hI0jK3l',
        'hod', 
        'active', 
        demo_college_id,
        ece_dept_id,
        true,
        '555-0004'
    ) ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        college_id = EXCLUDED.college_id,
        department_id = EXCLUDED.department_id,
        email_verified = EXCLUDED.email_verified,
        phone = EXCLUDED.phone;

    -- Staff User (as faculty)
    INSERT INTO users (
        name, email, password_hash, role, status, college_id, department_id, email_verified, phone, class_in_charge
    ) VALUES (
        'Prof. Robert Wilson', 
        'staff@demo.com', 
        '$2b$10$rQZ9vKzQ8X7yGxJ5nP2wLOeF3mH8sT1vR4cN6bA9dE2fG7hI0jK3l',
        'faculty', 
        'active', 
        demo_college_id,
        cse_dept_id,
        true,
        '555-0005',
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

    -- Faculty User
    INSERT INTO users (
        name, email, password_hash, role, status, college_id, department_id, email_verified, phone
    ) VALUES (
        'Prof. Emily Davis', 
        'faculty@demo.com', 
        '$2b$10$rQZ9vKzQ8X7yGxJ5nP2wLOeF3mH8sT1vR4cN6bA9dE2fG7hI0jK3l',
        'faculty', 
        'active', 
        demo_college_id,
        ece_dept_id,
        true,
        '555-0008'
    ) ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        college_id = EXCLUDED.college_id,
        department_id = EXCLUDED.department_id,
        email_verified = EXCLUDED.email_verified,
        phone = EXCLUDED.phone;

    -- Student 1
    INSERT INTO users (
        name, email, password_hash, role, status, college_id, department_id,
        roll_number, class, semester, email_verified, phone
    ) VALUES (
        'John Student', 
        'student1@demo.com', 
        '$2b$10$rQZ9vKzQ8X7yGxJ5nP2wLOeF3mH8sT1vR4cN6bA9dE2fG7hI0jK3l',
        'student', 
        'active', 
        demo_college_id,
        cse_dept_id,
        '2023CSE001',
        'CSE 2nd',
        '3rd',
        true,
        '555-0006'
    ) ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        college_id = EXCLUDED.college_id,
        department_id = EXCLUDED.department_id,
        roll_number = EXCLUDED.roll_number,
        class = EXCLUDED.class,
        semester = EXCLUDED.semester,
        email_verified = EXCLUDED.email_verified,
        phone = EXCLUDED.phone;

    -- Student 2
    INSERT INTO users (
        name, email, password_hash, role, status, college_id, department_id,
        roll_number, class, semester, email_verified, phone
    ) VALUES (
        'Jane Student', 
        'student2@demo.com', 
        '$2b$10$rQZ9vKzQ8X7yGxJ5nP2wLOeF3mH8sT1vR4cN6bA9dE2fG7hI0jK3l',
        'student', 
        'active', 
        demo_college_id,
        ece_dept_id,
        '2024ECE001',
        'ECE 1st',
        '1st',
        true,
        '555-0007'
    ) ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        college_id = EXCLUDED.college_id,
        department_id = EXCLUDED.department_id,
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
        WHEN 'hod' THEN 2 
        WHEN 'faculty' THEN 3 
        WHEN 'student' THEN 4 
        ELSE 5 
    END, email;

-- Display completion message
SELECT 'Demo users created successfully! Password for all users: admin123' as status;
