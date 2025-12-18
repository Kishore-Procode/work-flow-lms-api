-- Add Principal Role to Database
-- This script adds the 'principal' role to the user_role enum and updates the principal user

-- Set the schema
SET search_path TO lmsact;

-- Add 'principal' to the user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'principal';

-- Also add 'staff' if it doesn't exist (since I see 'faculty' but not 'staff')
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'staff';

-- Show the updated enum values
SELECT unnest(enum_range(NULL::user_role)) AS available_roles;

-- Now update the principal user to have the correct role
UPDATE users 
SET role = 'principal'::user_role,
    name = 'Dr. Sarah Johnson',
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'principal@demo.com';

-- Verify the update
SELECT id, name, email, role, status, college_id, phone 
FROM users 
WHERE email = 'principal@demo.com';

-- Show all demo users and their roles
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
        WHEN 'faculty' THEN 4
        WHEN 'student' THEN 5
    END,
    email;
