-- Migration: Create LMS-specific assignments and examinations tables
-- Description: Separate LMS assignments/examinations from workflow session content blocks
-- Author: Student-ACT LMS Team
-- Date: 2025-11-02

-- Set search path
SET search_path TO lmsact;

-- ============================================================================
-- TABLE: assignments
-- Description: LMS-specific assignments linked to subjects (not workflow sessions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Subject linkage (LMS subject, not workflow session)
    content_map_sub_details_id UUID NOT NULL,
    
    -- Assignment details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    
    -- Assignment configuration
    submission_format VARCHAR(50) NOT NULL DEFAULT 'text', -- 'text', 'file', 'both'
    max_points INTEGER NOT NULL DEFAULT 100,
    due_date TIMESTAMPTZ,
    allow_late_submission BOOLEAN DEFAULT false,
    
    -- Grading rubric (JSONB for flexibility)
    rubric JSONB,
    
    -- Metadata
    estimated_time INTEGER, -- in minutes
    is_required BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key
    CONSTRAINT fk_assignment_subject 
        FOREIGN KEY (content_map_sub_details_id) 
        REFERENCES content_map_sub_details(id) 
        ON DELETE CASCADE
);

-- Indexes for assignments
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON assignments(content_map_sub_details_id);
CREATE INDEX IF NOT EXISTS idx_assignments_active ON assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

-- ============================================================================
-- TABLE: examinations
-- Description: LMS-specific examinations linked to subjects (not workflow sessions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS examinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Subject linkage (LMS subject, not workflow session)
    content_map_sub_details_id UUID NOT NULL,
    
    -- Examination details
    title VARCHAR(255) NOT NULL,
    instructions TEXT,
    
    -- Examination configuration
    time_limit INTEGER NOT NULL, -- in minutes
    passing_score INTEGER NOT NULL DEFAULT 50, -- percentage
    max_attempts INTEGER DEFAULT 1,
    
    -- Examination rules
    shuffle_questions BOOLEAN DEFAULT false,
    show_results_immediately BOOLEAN DEFAULT false,
    allow_review BOOLEAN DEFAULT true,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key
    CONSTRAINT fk_examination_subject 
        FOREIGN KEY (content_map_sub_details_id) 
        REFERENCES content_map_sub_details(id) 
        ON DELETE CASCADE
);

-- Indexes for examinations
CREATE INDEX IF NOT EXISTS idx_examinations_subject ON examinations(content_map_sub_details_id);
CREATE INDEX IF NOT EXISTS idx_examinations_active ON examinations(is_active);

-- ============================================================================
-- TABLE: assignment_questions
-- Description: Questions for LMS assignments (for structured assignments)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assignment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Assignment linkage
    assignment_id UUID NOT NULL,
    
    -- Question details
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- 'short_answer', 'long_answer', 'file_upload'
    order_index INTEGER NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 10,
    
    -- Question configuration
    is_required BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key
    CONSTRAINT fk_assignment_question_assignment 
        FOREIGN KEY (assignment_id) 
        REFERENCES assignments(id) 
        ON DELETE CASCADE
);

-- Indexes for assignment_questions
CREATE INDEX IF NOT EXISTS idx_assignment_questions_assignment ON assignment_questions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_questions_order ON assignment_questions(assignment_id, order_index);

-- ============================================================================
-- TABLE: examination_questions
-- Description: Questions for LMS examinations
-- ============================================================================
CREATE TABLE IF NOT EXISTS examination_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Examination linkage
    examination_id UUID NOT NULL,
    
    -- Question details
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- 'single_choice', 'multiple_choice', 'true_false', 'short_answer', 'long_answer'
    order_index INTEGER NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 1,
    
    -- Question options (for MCQ, True/False)
    options JSONB, -- Array of options with text and isCorrect flag
    
    -- Correct answer (for auto-grading)
    correct_answer TEXT, -- For short answer, true/false
    
    -- Grading configuration
    requires_manual_grading BOOLEAN DEFAULT false,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key
    CONSTRAINT fk_examination_question_examination 
        FOREIGN KEY (examination_id) 
        REFERENCES examinations(id) 
        ON DELETE CASCADE
);

-- Indexes for examination_questions
CREATE INDEX IF NOT EXISTS idx_examination_questions_examination ON examination_questions(examination_id);
CREATE INDEX IF NOT EXISTS idx_examination_questions_order ON examination_questions(examination_id, order_index);

-- ============================================================================
-- UPDATE: session_assignment_submissions
-- Description: Add assignment_id column and make content_block_id nullable
-- ============================================================================
ALTER TABLE session_assignment_submissions 
    ADD COLUMN IF NOT EXISTS assignment_id UUID,
    ALTER COLUMN content_block_id DROP NOT NULL;

-- Add foreign key for assignment_id
ALTER TABLE session_assignment_submissions 
    DROP CONSTRAINT IF EXISTS fk_submission_assignment;

ALTER TABLE session_assignment_submissions 
    ADD CONSTRAINT fk_submission_assignment 
        FOREIGN KEY (assignment_id) 
        REFERENCES assignments(id) 
        ON DELETE CASCADE;

-- Add index
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON session_assignment_submissions(assignment_id);

-- ============================================================================
-- UPDATE: session_examination_attempts
-- Description: Add examination_id column and make content_block_id nullable
-- ============================================================================
ALTER TABLE session_examination_attempts 
    ADD COLUMN IF NOT EXISTS examination_id UUID,
    ALTER COLUMN content_block_id DROP NOT NULL;

-- Add foreign key for examination_id
ALTER TABLE session_examination_attempts 
    DROP CONSTRAINT IF EXISTS fk_attempt_examination;

ALTER TABLE session_examination_attempts 
    ADD CONSTRAINT fk_attempt_examination 
        FOREIGN KEY (examination_id) 
        REFERENCES examinations(id) 
        ON DELETE CASCADE;

-- Add index
CREATE INDEX IF NOT EXISTS idx_examination_attempts_examination ON session_examination_attempts(examination_id);

-- ============================================================================
-- TABLE: assignment_submission_answers
-- Description: Individual answers for structured assignment questions
-- ============================================================================
CREATE TABLE IF NOT EXISTS assignment_submission_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Submission linkage
    submission_id UUID NOT NULL,
    
    -- Question linkage
    question_id UUID NOT NULL,
    
    -- Answer details
    answer_text TEXT,
    answer_files JSONB, -- Array of file objects
    
    -- Grading
    points_awarded INTEGER,
    feedback TEXT,
    graded_at TIMESTAMPTZ,
    graded_by UUID,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_answer_submission 
        FOREIGN KEY (submission_id) 
        REFERENCES session_assignment_submissions(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_answer_question 
        FOREIGN KEY (question_id) 
        REFERENCES assignment_questions(id) 
        ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submission_answers_submission ON assignment_submission_answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_answers_question ON assignment_submission_answers(question_id);

-- ============================================================================
-- TABLE: examination_attempt_answers
-- Description: Individual answers for examination questions
-- ============================================================================
CREATE TABLE IF NOT EXISTS examination_attempt_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Attempt linkage
    attempt_id UUID NOT NULL,
    
    -- Question linkage
    question_id UUID NOT NULL,
    
    -- Answer details
    answer_text TEXT,
    selected_options JSONB, -- Array of selected option indices
    
    -- Grading
    is_correct BOOLEAN,
    points_awarded INTEGER,
    feedback TEXT,
    graded_at TIMESTAMPTZ,
    graded_by UUID,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_exam_answer_attempt 
        FOREIGN KEY (attempt_id) 
        REFERENCES session_examination_attempts(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_exam_answer_question 
        FOREIGN KEY (question_id) 
        REFERENCES examination_questions(id) 
        ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt ON examination_attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_question ON examination_attempt_answers(question_id);

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE assignments IS 'LMS-specific assignments linked to subjects (not workflow sessions)';
COMMENT ON TABLE examinations IS 'LMS-specific examinations linked to subjects (not workflow sessions)';
COMMENT ON TABLE assignment_questions IS 'Questions for structured LMS assignments';
COMMENT ON TABLE examination_questions IS 'Questions for LMS examinations';
COMMENT ON TABLE assignment_submission_answers IS 'Individual answers for assignment questions';
COMMENT ON TABLE examination_attempt_answers IS 'Individual answers for examination questions';

