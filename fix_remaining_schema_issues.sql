-- Fix Remaining Schema Issues for Student-ACT LMS
-- This script addresses all remaining database schema mismatches

-- Set the schema
SET search_path TO lmsact;

-- Fix courses table - add missing college_id column
ALTER TABLE courses ADD COLUMN IF NOT EXISTS college_id UUID;

-- Add foreign key constraint for courses.college_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'courses_college_id_fkey' 
        AND table_name = 'courses' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE courses ADD CONSTRAINT courses_college_id_fkey 
            FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Update courses to have college_id based on their department
UPDATE courses SET college_id = d.college_id 
FROM departments d 
WHERE courses.department_id = d.id AND courses.college_id IS NULL;

-- Fix academic_years table - add is_active column as alias for is_current
ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update is_active to match is_current
UPDATE academic_years SET is_active = is_current WHERE is_active IS NULL;

-- Create index for is_active
CREATE INDEX IF NOT EXISTS idx_academic_years_is_active ON academic_years(is_active);

-- Fix registration_requests table - add missing columns
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Add foreign key for reviewed_by
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'registration_requests_reviewed_by_fkey' 
        AND table_name = 'registration_requests' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE registration_requests ADD CONSTRAINT registration_requests_reviewed_by_fkey 
            FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Fix invitations table - add missing columns
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS sent_by UUID;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Add foreign key for sent_by
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'invitations_sent_by_fkey' 
        AND table_name = 'invitations' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE invitations ADD CONSTRAINT invitations_sent_by_fkey 
            FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Fix learning_resources table - add missing college_id and department_id columns
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS college_id UUID;
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS department_id UUID;

-- Add foreign keys for learning_resources
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'learning_resources_college_id_fkey' 
        AND table_name = 'learning_resources' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE learning_resources ADD CONSTRAINT learning_resources_college_id_fkey 
            FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'learning_resources_department_id_fkey' 
        AND table_name = 'learning_resources' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE learning_resources ADD CONSTRAINT learning_resources_department_id_fkey 
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Update learning_resources with college_id and department_id based on created_by user
UPDATE learning_resources SET 
    college_id = u.college_id,
    department_id = u.department_id
FROM users u 
WHERE learning_resources.created_by = u.id 
AND (learning_resources.college_id IS NULL OR learning_resources.department_id IS NULL);

-- Create missing states table for admin dashboard
CREATE TABLE IF NOT EXISTS states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,
    country_id UUID,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample states
INSERT INTO states (name, code, active) VALUES
('Karnataka', 'KA', TRUE),
('Tamil Nadu', 'TN', TRUE),
('Maharashtra', 'MH', TRUE),
('Delhi', 'DL', TRUE),
('Gujarat', 'GJ', TRUE)
ON CONFLICT (code) DO NOTHING;

-- Create missing districts table
CREATE TABLE IF NOT EXISTS districts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    state_id UUID,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT districts_state_id_fkey FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE SET NULL
);

-- Insert sample districts
DO $$
DECLARE
    ka_state_id UUID;
    tn_state_id UUID;
BEGIN
    SELECT id INTO ka_state_id FROM states WHERE code = 'KA';
    SELECT id INTO tn_state_id FROM states WHERE code = 'TN';
    
    IF ka_state_id IS NOT NULL THEN
        INSERT INTO districts (name, code, state_id, active) VALUES
        ('Bangalore Urban', 'BU', ka_state_id, TRUE),
        ('Mysore', 'MY', ka_state_id, TRUE)
        ON CONFLICT DO NOTHING;
    END IF;
    
    IF tn_state_id IS NOT NULL THEN
        INSERT INTO districts (name, code, state_id, active) VALUES
        ('Chennai', 'CH', tn_state_id, TRUE),
        ('Coimbatore', 'CB', tn_state_id, TRUE)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Add state_id and district_id to colleges table if they don't exist
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS state_id UUID;
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS district_id UUID;

-- Add foreign keys for colleges
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'colleges_state_id_fkey' 
        AND table_name = 'colleges' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE colleges ADD CONSTRAINT colleges_state_id_fkey 
            FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'colleges_district_id_fkey' 
        AND table_name = 'colleges' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE colleges ADD CONSTRAINT colleges_district_id_fkey 
            FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Update colleges with sample state and district data
DO $$
DECLARE
    ka_state_id UUID;
    bu_district_id UUID;
BEGIN
    SELECT id INTO ka_state_id FROM states WHERE code = 'KA';
    SELECT id INTO bu_district_id FROM districts WHERE code = 'BU';
    
    UPDATE colleges SET 
        state_id = ka_state_id,
        district_id = bu_district_id
    WHERE state_id IS NULL AND name LIKE '%Demo%';
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_college_id ON courses(college_id);
CREATE INDEX IF NOT EXISTS idx_learning_resources_college_id ON learning_resources(college_id);
CREATE INDEX IF NOT EXISTS idx_learning_resources_department_id ON learning_resources(department_id);
CREATE INDEX IF NOT EXISTS idx_registration_requests_reviewed_by ON registration_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_invitations_sent_by ON invitations(sent_by);
CREATE INDEX IF NOT EXISTS idx_colleges_state_id ON colleges(state_id);
CREATE INDEX IF NOT EXISTS idx_colleges_district_id ON colleges(district_id);

-- Update department statistics
UPDATE departments SET
    total_students = (
        SELECT COUNT(*) FROM users 
        WHERE department_id = departments.id AND role = 'student'
    ),
    total_staff = (
        SELECT COUNT(*) FROM users 
        WHERE department_id = departments.id AND role IN ('faculty', 'hod')
    );

-- Copy head_id to hod_id for all departments where hod_id is null
UPDATE departments SET hod_id = head_id WHERE hod_id IS NULL AND head_id IS NOT NULL;

-- Display completion summary
SELECT 
    'All remaining schema issues fixed successfully!' as status,
    (SELECT COUNT(*) FROM states) as total_states,
    (SELECT COUNT(*) FROM districts) as total_districts,
    (SELECT COUNT(*) FROM courses WHERE college_id IS NOT NULL) as courses_with_college,
    (SELECT COUNT(*) FROM learning_resources WHERE college_id IS NOT NULL) as resources_with_college;

-- Display sample data verification
SELECT 'States and Districts:' as info;
SELECT s.name as state_name, s.code as state_code, COUNT(d.id) as districts_count
FROM states s 
LEFT JOIN districts d ON s.id = d.state_id 
GROUP BY s.id, s.name, s.code 
ORDER BY s.name;

SELECT 'Colleges with Location:' as info;
SELECT c.name, s.name as state_name, d.name as district_name
FROM colleges c
LEFT JOIN states s ON c.state_id = s.id
LEFT JOIN districts d ON c.district_id = d.id
ORDER BY c.name;
