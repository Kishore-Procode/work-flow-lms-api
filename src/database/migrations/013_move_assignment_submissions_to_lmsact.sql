-- Migration: Move Assignment Submissions Table to lmsact Schema
-- Description: Moves session_assignment_submissions from workflowmgmt to lmsact schema
-- Reason: Assignments are LMS-specific functionality, not part of core workflow system
-- Author: ACT-LMS Team
-- Date: 2025-11-02

-- ============================================================================
-- STEP 1: Create the table in lmsact schema
-- ============================================================================

SET search_path TO lmsact, public;

-- Create assignment submissions table in lmsact schema
CREATE TABLE IF NOT EXISTS lmsact.session_assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_block_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Submission details
    submission_text TEXT,
    submission_files JSONB,
    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Grading details
    graded_by UUID,
    graded_at TIMESTAMPTZ,
    score INTEGER,
    max_score INTEGER,
    percentage NUMERIC(5,2),
    is_passed BOOLEAN DEFAULT FALSE,
    
    -- Feedback
    feedback TEXT,
    rubric_scores JSONB,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned', 'resubmitted')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    -- Note: content_block_id references workflowmgmt.session_content_blocks (cross-schema FK)
    CONSTRAINT fk_assignment_content_block 
        FOREIGN KEY (content_block_id) 
        REFERENCES workflowmgmt.session_content_blocks(id) 
        ON DELETE CASCADE,
    
    -- user_id and graded_by reference lmsact.users
    CONSTRAINT fk_assignment_user 
        FOREIGN KEY (user_id) 
        REFERENCES lmsact.users(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_assignment_graded_by 
        FOREIGN KEY (graded_by) 
        REFERENCES lmsact.users(id) 
        ON DELETE SET NULL,
    
    -- Indexes for performance
    CONSTRAINT unique_user_assignment UNIQUE (content_block_id, user_id)
);

-- ============================================================================
-- STEP 2: Create indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_lmsact_assignment_submissions_content_block 
    ON lmsact.session_assignment_submissions(content_block_id);

CREATE INDEX IF NOT EXISTS idx_lmsact_assignment_submissions_user 
    ON lmsact.session_assignment_submissions(user_id);

CREATE INDEX IF NOT EXISTS idx_lmsact_assignment_submissions_graded_by 
    ON lmsact.session_assignment_submissions(graded_by);

CREATE INDEX IF NOT EXISTS idx_lmsact_assignment_submissions_status 
    ON lmsact.session_assignment_submissions(status);

CREATE INDEX IF NOT EXISTS idx_lmsact_assignment_submissions_submitted_at 
    ON lmsact.session_assignment_submissions(submitted_at DESC);

-- ============================================================================
-- STEP 3: Create updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION lmsact.update_assignment_submission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_assignment_submission_updated_at
    BEFORE UPDATE ON lmsact.session_assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION lmsact.update_assignment_submission_updated_at();

-- ============================================================================
-- STEP 4: Migrate existing data (if any)
-- ============================================================================

-- Copy data from workflowmgmt to lmsact (if the old table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'workflowmgmt' 
        AND table_name = 'session_assignment_submissions'
    ) THEN
        INSERT INTO lmsact.session_assignment_submissions (
            id, content_block_id, user_id,
            submission_text, submission_files, submitted_at,
            graded_by, graded_at, score, max_score, percentage, is_passed,
            feedback, rubric_scores, status,
            created_at, updated_at
        )
        SELECT 
            id, content_block_id, user_id,
            submission_text, submission_files, submitted_at,
            graded_by, graded_at, score, max_score, percentage, is_passed,
            feedback, rubric_scores, status,
            created_at, updated_at
        FROM workflowmgmt.session_assignment_submissions
        ON CONFLICT (content_block_id, user_id) DO NOTHING;
        
        RAISE NOTICE 'Migrated data from workflowmgmt.session_assignment_submissions to lmsact.session_assignment_submissions';
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Drop old table from workflowmgmt schema
-- ============================================================================

-- Drop the old table (after data migration)
DROP TABLE IF EXISTS workflowmgmt.session_assignment_submissions CASCADE;

-- Drop the old trigger function if it exists
DROP FUNCTION IF EXISTS workflowmgmt.update_assignment_submission_updated_at() CASCADE;

-- ============================================================================
-- STEP 6: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE lmsact.session_assignment_submissions IS 'Stores student submissions and grading for assignment-type content blocks (LMS-specific)';
COMMENT ON COLUMN lmsact.session_assignment_submissions.content_block_id IS 'References workflowmgmt.session_content_blocks(id) - the assignment content block';
COMMENT ON COLUMN lmsact.session_assignment_submissions.user_id IS 'Student who submitted the assignment (references lmsact.users)';
COMMENT ON COLUMN lmsact.session_assignment_submissions.submission_text IS 'Text submission content (if submission format allows text)';
COMMENT ON COLUMN lmsact.session_assignment_submissions.submission_files IS 'Array of uploaded file metadata: [{fileName, fileUrl, fileSize, uploadedAt}]';
COMMENT ON COLUMN lmsact.session_assignment_submissions.graded_by IS 'Staff member who graded the assignment (references lmsact.users)';
COMMENT ON COLUMN lmsact.session_assignment_submissions.score IS 'Marks awarded by staff';
COMMENT ON COLUMN lmsact.session_assignment_submissions.max_score IS 'Maximum marks possible (from content_data.maxPoints)';
COMMENT ON COLUMN lmsact.session_assignment_submissions.percentage IS 'Calculated percentage (score/max_score * 100)';
COMMENT ON COLUMN lmsact.session_assignment_submissions.is_passed IS 'Whether student passed (score >= criteria marks from content_data)';
COMMENT ON COLUMN lmsact.session_assignment_submissions.feedback IS 'Staff feedback/comments on the submission';
COMMENT ON COLUMN lmsact.session_assignment_submissions.rubric_scores IS 'Detailed rubric scores: [{criteria, score, maxScore, comments}]';
COMMENT ON COLUMN lmsact.session_assignment_submissions.status IS 'Submission status: submitted, graded, returned, resubmitted';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE '📦 Table moved: workflowmgmt.session_assignment_submissions → lmsact.session_assignment_submissions';
    RAISE NOTICE '⚠️  IMPORTANT: Update all application code to reference lmsact.session_assignment_submissions';
END $$;

