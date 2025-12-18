-- Migration: Create Assignment Submissions Table
-- Description: Creates table for storing student assignment submissions and grading
-- Schema: workflowmgmt (to match existing session_quiz_attempts pattern)
-- Author: ACT-LMS Team
-- Date: 2025-02-11

-- Set search path
SET search_path TO workflowmgmt, public;

-- Create assignment submissions table
-- This table stores student submissions for assignment-type content blocks
-- Similar structure to session_quiz_attempts but for assignments
CREATE TABLE IF NOT EXISTS session_assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_block_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Submission details
    submission_text TEXT, -- Text submission (if submission format allows text)
    submission_files JSONB, -- Array of file metadata: [{fileName, fileUrl, fileSize, uploadedAt}]
    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Grading details
    graded_by UUID, -- Staff member who graded
    graded_at TIMESTAMPTZ,
    score INTEGER, -- Marks awarded
    max_score INTEGER, -- Maximum marks possible (from content_data.maxPoints)
    percentage NUMERIC(5,2), -- Calculated percentage
    is_passed BOOLEAN DEFAULT FALSE, -- Whether student passed (score >= criteria marks)
    
    -- Feedback
    feedback TEXT, -- Staff feedback/comments
    rubric_scores JSONB, -- Detailed rubric scores: [{criteria, score, maxScore, comments}]
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned', 'resubmitted')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_assignment_content_block 
        FOREIGN KEY (content_block_id) 
        REFERENCES session_content_blocks(id) 
        ON DELETE CASCADE,
    
    -- Indexes for performance
    CONSTRAINT unique_user_assignment UNIQUE (content_block_id, user_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_content_block 
    ON session_assignment_submissions(content_block_id);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_user 
    ON session_assignment_submissions(user_id);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_graded_by 
    ON session_assignment_submissions(graded_by);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status 
    ON session_assignment_submissions(status);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_submitted_at 
    ON session_assignment_submissions(submitted_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_assignment_submission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_assignment_submission_updated_at
    BEFORE UPDATE ON session_assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_assignment_submission_updated_at();

-- Add comments for documentation
COMMENT ON TABLE session_assignment_submissions IS 'Stores student submissions and grading for assignment-type content blocks';
COMMENT ON COLUMN session_assignment_submissions.content_block_id IS 'References session_content_blocks(id) - the assignment content block';
COMMENT ON COLUMN session_assignment_submissions.user_id IS 'Student who submitted the assignment';
COMMENT ON COLUMN session_assignment_submissions.submission_text IS 'Text submission content (if submission format allows text)';
COMMENT ON COLUMN session_assignment_submissions.submission_files IS 'Array of uploaded file metadata: [{fileName, fileUrl, fileSize, uploadedAt}]';
COMMENT ON COLUMN session_assignment_submissions.graded_by IS 'Staff member who graded the assignment';
COMMENT ON COLUMN session_assignment_submissions.score IS 'Marks awarded by staff';
COMMENT ON COLUMN session_assignment_submissions.max_score IS 'Maximum marks possible (from content_data.maxPoints)';
COMMENT ON COLUMN session_assignment_submissions.percentage IS 'Calculated percentage (score/max_score * 100)';
COMMENT ON COLUMN session_assignment_submissions.is_passed IS 'Whether student passed (score >= criteria marks from content_data)';
COMMENT ON COLUMN session_assignment_submissions.feedback IS 'Staff feedback/comments on the submission';
COMMENT ON COLUMN session_assignment_submissions.rubric_scores IS 'Detailed rubric scores: [{criteria, score, maxScore, comments}]';
COMMENT ON COLUMN session_assignment_submissions.status IS 'Submission status: submitted, graded, returned, resubmitted';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON session_assignment_submissions TO lms_app_user;
-- GRANT USAGE ON SEQUENCE session_assignment_submissions_id_seq TO lms_app_user;

