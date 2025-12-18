-- Migration: Add Subject to Session Mapping for Play Session Feature
-- Description: Creates a lightweight mapping table to link LMS subjects to Workflow sessions
-- Author: Student-ACT LMS Team
-- Date: 2025-10-24
-- Architecture: Shared Database - LMS queries workflowmgmt schema for content

-- ============================================================================
-- ENABLE UUID EXTENSION
-- ============================================================================

-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- MAPPING TABLE
-- ============================================================================

-- Subject to Session Mapping Table
-- This is the ONLY new table needed - all content, progress, comments, and quizzes
-- are stored in the existing workflowmgmt schema
CREATE TABLE lmsact.subject_session_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_map_sub_details_id UUID NOT NULL,
    workflow_session_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    
    -- Foreign Keys
    CONSTRAINT fk_mapping_subject 
        FOREIGN KEY (content_map_sub_details_id) 
        REFERENCES lmsact.content_map_sub_details(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_mapping_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES lmsact.users(id) 
        ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT unique_subject_session UNIQUE (content_map_sub_details_id, workflow_session_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_subject_session_mapping_subject ON lmsact.subject_session_mapping(content_map_sub_details_id);
CREATE INDEX idx_subject_session_mapping_session ON lmsact.subject_session_mapping(workflow_session_id);
CREATE INDEX idx_subject_session_mapping_active ON lmsact.subject_session_mapping(is_active);
CREATE INDEX idx_subject_session_mapping_created_by ON lmsact.subject_session_mapping(created_by);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE lmsact.subject_session_mapping IS 'Maps LMS subjects to Workflow sessions for Play Session feature. Enables students to access interactive content from the workflow system.';
COMMENT ON COLUMN lmsact.subject_session_mapping.content_map_sub_details_id IS 'References lmsact.content_map_sub_details(id) - the LMS subject';
COMMENT ON COLUMN lmsact.subject_session_mapping.workflow_session_id IS 'References workflowmgmt.sessions(id) - the workflow session with interactive content. Not enforced by FK due to cross-schema reference.';
COMMENT ON COLUMN lmsact.subject_session_mapping.notes IS 'Optional notes explaining why this session was mapped to this subject, or any special instructions';

-- ============================================================================
-- HELPER VIEW
-- ============================================================================

-- View to easily see which subjects have interactive content available
CREATE OR REPLACE VIEW lmsact.subjects_with_interactive_content AS
SELECT 
    csub.id as subject_id,
    csub.act_subject_code as subject_code,
    csub.act_subject_name as subject_name,
    ssm.workflow_session_id,
    ssm.created_at as mapped_at,
    ssm.is_active as mapping_active,
    u.name as mapped_by_name,
    u.email as mapped_by_email
FROM lmsact.content_map_sub_details csub
INNER JOIN lmsact.subject_session_mapping ssm ON csub.id = ssm.content_map_sub_details_id
LEFT JOIN lmsact.users u ON ssm.created_by = u.id
WHERE ssm.is_active = true
ORDER BY csub.act_subject_name;

COMMENT ON VIEW lmsact.subjects_with_interactive_content IS 'Shows all LMS subjects that have been mapped to workflow sessions and have interactive content available';

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Uncomment to insert sample mapping for testing
/*
-- Example: Map a subject to a session
-- Replace UUIDs with actual values from your database
INSERT INTO lmsact.subject_session_mapping (
    content_map_sub_details_id,
    workflow_session_id,
    notes,
    is_active
) VALUES (
    'your-subject-uuid-here'::UUID,
    'your-session-uuid-here'::UUID,
    'Sample mapping for testing Play Session feature',
    true
);
*/

-- ============================================================================
-- ROLLBACK SCRIPT (commented out - uncomment to rollback)
-- ============================================================================

/*
-- Drop view
DROP VIEW IF EXISTS lmsact.subjects_with_interactive_content;

-- Drop table
DROP TABLE IF EXISTS lmsact.subject_session_mapping;
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table was created
-- SELECT * FROM information_schema.tables WHERE table_schema = 'lmsact' AND table_name = 'subject_session_mapping';

-- Verify indexes were created
-- SELECT * FROM pg_indexes WHERE schemaname = 'lmsact' AND tablename = 'subject_session_mapping';

-- Check view
-- SELECT * FROM lmsact.subjects_with_interactive_content;

