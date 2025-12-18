-- Migration: Create Subject Staff Assignments Table
-- Date: 2025-11-01
-- Description: Create table to track staff assignments to subjects
--              A staff can have multiple subjects, but a subject can only have one staff

-- Set search path
SET search_path TO lmsact;

-- Create subject_staff_assignments table
CREATE TABLE IF NOT EXISTS subject_staff_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_map_sub_details_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    department_id UUID NOT NULL,
    semester_number INTEGER NOT NULL,
    academic_year_id UUID NOT NULL,
    assigned_by UUID NOT NULL, -- HOD or admin who assigned
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_subject_staff_content_map_sub_details 
        FOREIGN KEY (content_map_sub_details_id) 
        REFERENCES content_map_sub_details(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_subject_staff_staff 
        FOREIGN KEY (staff_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_subject_staff_department 
        FOREIGN KEY (department_id) 
        REFERENCES departments(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_subject_staff_assigned_by 
        FOREIGN KEY (assigned_by) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    -- Check constraints
    CONSTRAINT chk_semester_number 
        CHECK (semester_number BETWEEN 1 AND 10)
);

-- Create unique partial index: One staff per subject (for active assignments only)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_subject_active_assignment 
    ON subject_staff_assignments(content_map_sub_details_id) 
    WHERE is_active = TRUE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subject_staff_content_map_sub_details 
    ON subject_staff_assignments(content_map_sub_details_id);

CREATE INDEX IF NOT EXISTS idx_subject_staff_staff_id 
    ON subject_staff_assignments(staff_id);

CREATE INDEX IF NOT EXISTS idx_subject_staff_department 
    ON subject_staff_assignments(department_id);

CREATE INDEX IF NOT EXISTS idx_subject_staff_semester 
    ON subject_staff_assignments(semester_number);

CREATE INDEX IF NOT EXISTS idx_subject_staff_active 
    ON subject_staff_assignments(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_subject_staff_academic_year 
    ON subject_staff_assignments(academic_year_id);

-- Create trigger for updated_at timestamp
CREATE TRIGGER trigger_update_subject_staff_assignments_updated_at
    BEFORE UPDATE ON subject_staff_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE subject_staff_assignments IS 'Tracks staff assignments to subjects for teaching';
COMMENT ON COLUMN subject_staff_assignments.content_map_sub_details_id IS 'Reference to subject in content mapping';
COMMENT ON COLUMN subject_staff_assignments.staff_id IS 'Staff member assigned to teach this subject';
COMMENT ON COLUMN subject_staff_assignments.department_id IS 'Department context for assignment';
COMMENT ON COLUMN subject_staff_assignments.semester_number IS 'Semester number (1-10)';
COMMENT ON COLUMN subject_staff_assignments.academic_year_id IS 'Academic year for this assignment';
COMMENT ON COLUMN subject_staff_assignments.assigned_by IS 'User (typically HOD) who made the assignment';
COMMENT ON COLUMN subject_staff_assignments.is_active IS 'Whether this assignment is currently active';

-- Insert migration record
INSERT INTO migrations (version, name, executed_at) 
VALUES ('009', 'create_subject_staff_assignments', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;

SELECT 'Migration 009: subject_staff_assignments table created successfully!' as status;
