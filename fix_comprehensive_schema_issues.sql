-- Comprehensive Database Schema Fix for Student-ACT LMS
-- This script addresses all remaining database schema mismatches identified through testing

-- Set the schema
SET search_path TO lmsact;

-- =====================================================
-- 1. Fix registration_requests table
-- =====================================================

-- Add missing columns to registration_requests
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS request_data JSONB;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update existing records to have requested_at = created_at
UPDATE registration_requests SET requested_at = created_at WHERE requested_at IS NULL;

-- =====================================================
-- 2. Fix resource_media table
-- =====================================================

-- Add missing columns to resource_media
ALTER TABLE resource_media ADD COLUMN IF NOT EXISTS student_id UUID;
ALTER TABLE resource_media ADD COLUMN IF NOT EXISTS upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE resource_media ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE resource_media ADD COLUMN IF NOT EXISTS learning_image_id UUID;

-- Add foreign key for student_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'resource_media_student_id_fkey' 
        AND table_name = 'resource_media' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE resource_media ADD CONSTRAINT resource_media_student_id_fkey 
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Update upload_date to match created_at for existing records
UPDATE resource_media SET upload_date = created_at WHERE upload_date IS NULL;

-- =====================================================
-- 3. Fix learning_resources table - Add missing columns
-- =====================================================

-- Add missing columns to learning_resources
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS started_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS learning_context TEXT;
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS location_description TEXT;

-- Update started_date to assignment_date for assigned resources
UPDATE learning_resources SET started_date = assignment_date WHERE started_date IS NULL AND assignment_date IS NOT NULL;

-- Update started_date to created_at for unassigned resources
UPDATE learning_resources SET started_date = created_at WHERE started_date IS NULL;

-- =====================================================
-- 4. Create missing resource_selections table
-- =====================================================

CREATE TABLE IF NOT EXISTS resource_selections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL,
    resource_id UUID NOT NULL,
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'selected',
    learning_image_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT resource_selections_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT resource_selections_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES learning_resources(id) ON DELETE CASCADE,
    CONSTRAINT resource_selections_learning_image_id_fkey FOREIGN KEY (learning_image_id) REFERENCES resource_media(id) ON DELETE SET NULL,
    CONSTRAINT resource_selections_student_resource_unique UNIQUE (student_id, resource_id)
);

-- Create indexes for resource_selections
CREATE INDEX IF NOT EXISTS idx_resource_selections_student_id ON resource_selections(student_id);
CREATE INDEX IF NOT EXISTS idx_resource_selections_resource_id ON resource_selections(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_selections_status ON resource_selections(status);

-- Insert sample resource selections for demo students
INSERT INTO resource_selections (student_id, resource_id, status, selected_at) 
SELECT 
    u.id as student_id,
    lr.id as resource_id,
    'selected' as status,
    lr.assignment_date as selected_at
FROM users u
JOIN learning_resources lr ON lr.assigned_student_id = u.id
WHERE u.role = 'student' AND lr.assigned_student_id IS NOT NULL
ON CONFLICT (student_id, resource_id) DO NOTHING;

-- =====================================================
-- 5. Create missing resource_inventory table
-- =====================================================

CREATE TABLE IF NOT EXISTS resource_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    department_id UUID,
    college_id UUID,
    quantity_available INTEGER DEFAULT 0,
    quantity_assigned INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'available',
    location VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT resource_inventory_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    CONSTRAINT resource_inventory_college_id_fkey FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE SET NULL
);

-- Create indexes for resource_inventory
CREATE INDEX IF NOT EXISTS idx_resource_inventory_department_id ON resource_inventory(department_id);
CREATE INDEX IF NOT EXISTS idx_resource_inventory_college_id ON resource_inventory(college_id);
CREATE INDEX IF NOT EXISTS idx_resource_inventory_status ON resource_inventory(status);
CREATE INDEX IF NOT EXISTS idx_resource_inventory_category ON resource_inventory(category);

-- Insert sample resource inventory data
INSERT INTO resource_inventory (resource_code, name, category, subcategory, department_id, college_id, quantity_available, quantity_assigned, status, location, description)
SELECT 
    'INV-' || lr.resource_code as resource_code,
    lr.description as name,
    lr.category,
    lr.subcategory,
    lr.department_id,
    lr.college_id,
    CASE WHEN lr.assigned_student_id IS NOT NULL THEN 0 ELSE 1 END as quantity_available,
    CASE WHEN lr.assigned_student_id IS NOT NULL THEN 1 ELSE 0 END as quantity_assigned,
    CASE WHEN lr.assigned_student_id IS NOT NULL THEN 'assigned' ELSE 'available' END as status,
    'Department Storage' as location,
    lr.instructions as description
FROM learning_resources lr
WHERE lr.resource_code IS NOT NULL
ON CONFLICT (resource_code) DO NOTHING;

-- =====================================================
-- 6. Fix states table structure
-- =====================================================

-- Check if states table exists and has correct structure
DO $$
BEGIN
    -- Add active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'states' 
        AND column_name = 'active' 
        AND table_schema = 'lmsact'
    ) THEN
        ALTER TABLE states ADD COLUMN active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Update all states to be active
UPDATE states SET active = TRUE WHERE active IS NULL;

-- =====================================================
-- 7. Create content/guidelines table if missing
-- =====================================================

CREATE TABLE IF NOT EXISTS content_guidelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT content_guidelines_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for content_guidelines
CREATE INDEX IF NOT EXISTS idx_content_guidelines_category ON content_guidelines(category);
CREATE INDEX IF NOT EXISTS idx_content_guidelines_display_order ON content_guidelines(display_order);
CREATE INDEX IF NOT EXISTS idx_content_guidelines_is_active ON content_guidelines(is_active);

-- Insert sample content guidelines
INSERT INTO content_guidelines (title, content, category, display_order, is_active)
VALUES 
    ('Learning Resource Guidelines', 'Guidelines for using learning resources effectively in the Student-ACT LMS system.', 'general', 1, TRUE),
    ('Assessment Guidelines', 'Guidelines for conducting assessments and evaluations.', 'assessment', 2, TRUE),
    ('Student Progress Tracking', 'How to track and monitor student progress effectively.', 'progress', 3, TRUE)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 8. Add triggers for updated_at columns
-- =====================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for new tables
DO $$
BEGIN
    -- resource_selections trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_resource_selections_updated_at') THEN
        CREATE TRIGGER trigger_update_resource_selections_updated_at
            BEFORE UPDATE ON resource_selections
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- resource_inventory trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_resource_inventory_updated_at') THEN
        CREATE TRIGGER trigger_update_resource_inventory_updated_at
            BEFORE UPDATE ON resource_inventory
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- content_guidelines trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_content_guidelines_updated_at') THEN
        CREATE TRIGGER trigger_update_content_guidelines_updated_at
            BEFORE UPDATE ON content_guidelines
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =====================================================
-- 9. Update demo data and relationships
-- =====================================================

-- Update resource_media with student associations based on learning_resources assignments
UPDATE resource_media rm
SET student_id = lr.assigned_student_id
FROM learning_resources lr
WHERE rm.resource_id = lr.id 
AND lr.assigned_student_id IS NOT NULL 
AND rm.student_id IS NULL;

-- =====================================================
-- 10. Create summary view for validation
-- =====================================================

-- Display completion summary
SELECT 
    'Comprehensive schema fixes applied successfully!' as status,
    (SELECT COUNT(*) FROM resource_selections) as resource_selections_count,
    (SELECT COUNT(*) FROM resource_inventory) as resource_inventory_count,
    (SELECT COUNT(*) FROM content_guidelines) as content_guidelines_count,
    (SELECT COUNT(*) FROM states WHERE active = TRUE) as active_states_count;

-- Display table structure validation
SELECT 'Table Structure Validation:' as info;

-- Check critical columns exist
SELECT 
    'registration_requests.requested_at' as column_check,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'registration_requests' 
        AND column_name = 'requested_at' 
        AND table_schema = 'lmsact'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'resource_media.student_id' as column_check,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resource_media' 
        AND column_name = 'student_id' 
        AND table_schema = 'lmsact'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'learning_resources.learning_context' as column_check,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'learning_resources' 
        AND column_name = 'learning_context' 
        AND table_schema = 'lmsact'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'states.active' as column_check,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'states' 
        AND column_name = 'active' 
        AND table_schema = 'lmsact'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;
