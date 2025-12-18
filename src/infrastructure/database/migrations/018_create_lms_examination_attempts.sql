-- Migration: Create LMS Examination Attempts Table
-- Description: Creates table for tracking LMS examination attempts (separate from workflow examinations)
-- Author: ACT-LMS Team
-- Date: 2025-11-02

SET search_path TO lmsact, public;

-- Create LMS examination attempts table
CREATE TABLE IF NOT EXISTS lmsact.examination_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    examination_id UUID NOT NULL,
    student_id UUID NOT NULL,
    
    -- Attempt details
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMPTZ,
    time_taken INTEGER, -- seconds
    
    -- Answers and grading
    answers JSONB NOT NULL DEFAULT '{}', -- {questionId: answer, ...}
    auto_graded_score INTEGER DEFAULT 0, -- Score from auto-graded questions (MCQ, True/False, etc.)
    auto_graded_max_score INTEGER DEFAULT 0, -- Max possible score from auto-graded questions
    manual_graded_score INTEGER DEFAULT 0, -- Score from manually graded questions (Short/Long Answer)
    manual_graded_max_score INTEGER DEFAULT 0, -- Max possible score from manual graded questions
    total_score INTEGER DEFAULT 0, -- auto_graded_score + manual_graded_score
    max_score INTEGER NOT NULL DEFAULT 0, -- Total maximum score possible
    percentage NUMERIC(5,2) DEFAULT 0, -- (total_score / max_score) * 100
    is_passed BOOLEAN DEFAULT FALSE, -- Whether student passed (percentage >= passing_percentage)
    
    -- Grading details
    graded_by UUID, -- Staff/HOD who graded manual questions
    graded_at TIMESTAMPTZ,
    feedback TEXT, -- Overall feedback from grader
    question_feedback JSONB, -- {questionId: {score, feedback}, ...} for manual grading
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'auto_graded', 'graded', 'completed')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_lms_examination 
        FOREIGN KEY (examination_id) 
        REFERENCES lmsact.examinations(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_lms_examination_student 
        FOREIGN KEY (student_id) 
        REFERENCES lmsact.users(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_lms_examination_graded_by 
        FOREIGN KEY (graded_by) 
        REFERENCES lmsact.users(id) 
        ON DELETE SET NULL,
    
    -- One attempt per student per examination
    CONSTRAINT unique_student_examination UNIQUE (examination_id, student_id)
);

-- Create indexes for LMS examination attempts
CREATE INDEX IF NOT EXISTS idx_lms_examination_attempts_examination 
    ON lmsact.examination_attempts(examination_id);

CREATE INDEX IF NOT EXISTS idx_lms_examination_attempts_student 
    ON lmsact.examination_attempts(student_id);

CREATE INDEX IF NOT EXISTS idx_lms_examination_attempts_graded_by 
    ON lmsact.examination_attempts(graded_by);

CREATE INDEX IF NOT EXISTS idx_lms_examination_attempts_status 
    ON lmsact.examination_attempts(status);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION lmsact.update_examination_attempts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_examination_attempts_updated_at
    BEFORE UPDATE ON lmsact.examination_attempts
    FOR EACH ROW
    EXECUTE FUNCTION lmsact.update_examination_attempts_updated_at();

COMMENT ON TABLE lmsact.examination_attempts IS 'Tracks student attempts for LMS examinations (separate from workflow examinations)';
COMMENT ON COLUMN lmsact.examination_attempts.examination_id IS 'Reference to lmsact.examinations table';
COMMENT ON COLUMN lmsact.examination_attempts.student_id IS 'Student who took the examination';
COMMENT ON COLUMN lmsact.examination_attempts.answers IS 'JSON object containing student answers for each question';
COMMENT ON COLUMN lmsact.examination_attempts.status IS 'Current status: in_progress, submitted, auto_graded, graded, completed';

