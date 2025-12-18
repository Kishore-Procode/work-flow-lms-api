-- Comprehensive Schema Fix for Student-ACT LMS
-- This script fixes all remaining database schema mismatches

-- Set the schema
SET search_path TO lmsact;

-- Fix departments table - add missing columns
ALTER TABLE departments ADD COLUMN IF NOT EXISTS hod_id UUID;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS total_students INTEGER DEFAULT 0;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS total_staff INTEGER DEFAULT 0;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS established DATE;

-- Copy head_id to hod_id for compatibility
UPDATE departments SET hod_id = head_id WHERE hod_id IS NULL AND head_id IS NOT NULL;

-- Add foreign key constraint for hod_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'departments_hod_id_fkey' 
        AND table_name = 'departments' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE departments ADD CONSTRAINT departments_hod_id_fkey 
            FOREIGN KEY (hod_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Fix learning_resources table - add missing columns
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS assigned_student_id UUID;
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS assignment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS completion_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'available';

-- Add foreign key constraint for assigned_student_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'learning_resources_assigned_student_id_fkey' 
        AND table_name = 'learning_resources' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE learning_resources ADD CONSTRAINT learning_resources_assigned_student_id_fkey 
            FOREIGN KEY (assigned_student_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Fix sections table - add missing columns
ALTER TABLE sections ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Fix users table - add missing columns for enhanced functionality
ALTER TABLE users ADD COLUMN IF NOT EXISTS qualification VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS experience INTEGER; -- years of experience
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS salary DECIMAL(10,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_group VARCHAR(5);
ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality VARCHAR(50) DEFAULT 'Indian';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_departments_hod_id ON departments(hod_id);
CREATE INDEX IF NOT EXISTS idx_learning_resources_assigned_student_id ON learning_resources(assigned_student_id);
CREATE INDEX IF NOT EXISTS idx_learning_resources_status ON learning_resources(status);
CREATE INDEX IF NOT EXISTS idx_sections_status ON sections(status);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_qualification ON users(qualification);

-- Update existing data with default values
UPDATE departments SET 
    total_students = COALESCE(total_students, 0),
    total_staff = COALESCE(total_staff, 0),
    established = COALESCE(established, created_at::date)
WHERE total_students IS NULL OR total_staff IS NULL OR established IS NULL;

UPDATE learning_resources SET 
    status = COALESCE(status, 'available')
WHERE status IS NULL;

UPDATE sections SET 
    status = COALESCE(status, 'active')
WHERE status IS NULL;

-- Update users with some sample data for demo users
UPDATE users SET 
    qualification = CASE 
        WHEN role = 'admin' THEN 'M.Tech Computer Science'
        WHEN role = 'hod' THEN 'Ph.D. in Engineering'
        WHEN role = 'faculty' THEN 'M.Tech/M.E.'
        WHEN role = 'student' THEN 'B.Tech (Pursuing)'
        ELSE NULL
    END,
    experience = CASE 
        WHEN role = 'admin' THEN 15
        WHEN role = 'hod' THEN 20
        WHEN role = 'faculty' THEN 8
        ELSE NULL
    END,
    employee_id = CASE 
        WHEN role IN ('admin', 'hod', 'faculty') THEN 
            CASE role 
                WHEN 'admin' THEN 'EMP' || LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::text, 4, '0')
                WHEN 'hod' THEN 'HOD' || LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::text, 4, '0')
                WHEN 'faculty' THEN 'FAC' || LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::text, 4, '0')
            END
        ELSE NULL
    END,
    joining_date = CASE 
        WHEN role IN ('admin', 'hod', 'faculty') THEN created_at::date
        ELSE NULL
    END,
    nationality = COALESCE(nationality, 'Indian')
WHERE email LIKE '%@demo.com';

-- Create some sample learning resources if none exist
INSERT INTO learning_resources (
    resource_code, category, subcategory, description, instructions,
    duration_minutes, difficulty_level, tags, created_by, status
)
SELECT 
    'RES001', 'Programming', 'Data Structures', 
    'Introduction to Data Structures and Algorithms',
    'Complete the exercises and submit your solutions',
    120, 'Beginner', 'programming,algorithms,data-structures',
    u.id, 'available'
FROM users u 
WHERE u.role = 'faculty' AND u.email LIKE '%@demo.com' 
AND NOT EXISTS (SELECT 1 FROM learning_resources WHERE resource_code = 'RES001')
LIMIT 1;

INSERT INTO learning_resources (
    resource_code, category, subcategory, description, instructions,
    duration_minutes, difficulty_level, tags, created_by, status
)
SELECT 
    'RES002', 'Mathematics', 'Calculus', 
    'Advanced Calculus for Engineering Students',
    'Solve the problem sets and attend virtual sessions',
    90, 'Intermediate', 'mathematics,calculus,engineering',
    u.id, 'available'
FROM users u 
WHERE u.role = 'faculty' AND u.email LIKE '%@demo.com' 
AND NOT EXISTS (SELECT 1 FROM learning_resources WHERE resource_code = 'RES002')
LIMIT 1;

-- Assign some resources to students for testing
DO $$
DECLARE
    student1_id UUID;
    student2_id UUID;
    resource1_id UUID;
    resource2_id UUID;
BEGIN
    -- Get student and resource IDs
    SELECT id INTO student1_id FROM users WHERE email = 'student1@demo.com';
    SELECT id INTO student2_id FROM users WHERE email = 'student2@demo.com';
    SELECT id INTO resource1_id FROM learning_resources WHERE resource_code = 'RES001';
    SELECT id INTO resource2_id FROM learning_resources WHERE resource_code = 'RES002';

    -- Assign resources to students
    IF student1_id IS NOT NULL AND resource1_id IS NOT NULL THEN
        UPDATE learning_resources 
        SET assigned_student_id = student1_id, 
            assignment_date = CURRENT_TIMESTAMP,
            status = 'assigned'
        WHERE id = resource1_id;
    END IF;

    IF student2_id IS NOT NULL AND resource2_id IS NOT NULL THEN
        UPDATE learning_resources 
        SET assigned_student_id = student2_id, 
            assignment_date = CURRENT_TIMESTAMP,
            status = 'assigned'
        WHERE id = resource2_id;
    END IF;
END $$;

-- Update department statistics
DO $$
DECLARE
    dept_record RECORD;
BEGIN
    FOR dept_record IN SELECT id FROM departments LOOP
        UPDATE departments SET
            total_students = (
                SELECT COUNT(*) FROM users 
                WHERE department_id = dept_record.id AND role = 'student'
            ),
            total_staff = (
                SELECT COUNT(*) FROM users 
                WHERE department_id = dept_record.id AND role IN ('faculty', 'hod')
            )
        WHERE id = dept_record.id;
    END LOOP;
END $$;

-- Create unique constraints if they don't exist
DO $$
BEGIN
    -- Add unique constraint for users.employee_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_employee_id_key' 
        AND table_name = 'users' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_employee_id_key UNIQUE (employee_id);
    END IF;
END $$;

-- Display completion summary
SELECT 
    'Schema fixes completed successfully!' as status,
    (SELECT COUNT(*) FROM departments) as total_departments,
    (SELECT COUNT(*) FROM learning_resources) as total_resources,
    (SELECT COUNT(*) FROM learning_resources WHERE assigned_student_id IS NOT NULL) as assigned_resources,
    (SELECT COUNT(*) FROM sections) as total_sections,
    (SELECT COUNT(*) FROM users WHERE email LIKE '%@demo.com') as demo_users;

-- Display sample data
SELECT 'Demo Users with Enhanced Data:' as info;
SELECT 
    email, name, role, qualification, experience, employee_id, joining_date
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

SELECT 'Learning Resources:' as info;
SELECT 
    resource_code, category, subcategory, status,
    CASE WHEN assigned_student_id IS NOT NULL THEN 'Assigned' ELSE 'Available' END as assignment_status
FROM learning_resources 
ORDER BY resource_code;
