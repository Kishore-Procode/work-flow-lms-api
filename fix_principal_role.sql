-- Fix Principal User Role
-- This script corrects the principal@demo.com user to have the correct 'principal' role instead of 'admin'

-- Set the schema
SET search_path TO lmsact;

-- Update the principal user to have the correct role
UPDATE users 
SET role = 'principal'::user_role,
    name = 'Dr. Sarah Johnson',
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'principal@demo.com';

-- Verify the update
SELECT id, name, email, role, status, college_id, phone 
FROM users 
WHERE email = 'principal@demo.com';

-- Also verify all demo users have correct roles
SELECT name, email, role, status 
FROM users 
WHERE email IN (
    'admin@demo.com',
    'principal@demo.com', 
    'hod.cse@demo.com',
    'hod.ece@demo.com',
    'staff1@demo.com',
    'staff@demo.com',
    'student1@demo.com',
    'student2@demo.com'
)
ORDER BY 
    CASE role 
        WHEN 'admin' THEN 1
        WHEN 'principal' THEN 2
        WHEN 'hod' THEN 3
        WHEN 'staff' THEN 4
        WHEN 'student' THEN 5
    END,
    email;
