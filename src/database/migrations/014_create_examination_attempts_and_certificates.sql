-- Migration: Create Examination Attempts and Course Certificates Tables
-- Description: Creates tables for tracking examination attempts and generating course completion certificates
-- Author: ACT-LMS Team
-- Date: 2025-11-02

-- ============================================================================
-- STEP 1: Create Examination Attempts Table (lmsact schema)
-- ============================================================================

SET search_path TO lmsact, public;

-- Create examination attempts table
-- Similar to assignment_submissions but with stricter rules (one attempt only)
CREATE TABLE IF NOT EXISTS lmsact.session_examination_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_block_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Attempt details
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMPTZ,
    time_taken INTEGER, -- seconds
    
    -- Answers and grading
    answers JSONB NOT NULL, -- {questionId: answer, ...}
    auto_graded_score INTEGER DEFAULT 0, -- Score from auto-graded questions (MCQ, True/False, etc.)
    auto_graded_max_score INTEGER DEFAULT 0, -- Max possible score from auto-graded questions
    manual_graded_score INTEGER DEFAULT 0, -- Score from manually graded questions (Short/Long Answer)
    manual_graded_max_score INTEGER DEFAULT 0, -- Max possible score from manual graded questions
    total_score INTEGER DEFAULT 0, -- auto_graded_score + manual_graded_score
    max_score INTEGER NOT NULL, -- Total maximum score possible
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
    CONSTRAINT fk_examination_content_block 
        FOREIGN KEY (content_block_id) 
        REFERENCES workflowmgmt.session_content_blocks(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_examination_user 
        FOREIGN KEY (user_id) 
        REFERENCES lmsact.users(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_examination_graded_by 
        FOREIGN KEY (graded_by) 
        REFERENCES lmsact.users(id) 
        ON DELETE SET NULL,
    
    -- One attempt per student per examination
    CONSTRAINT unique_user_examination UNIQUE (content_block_id, user_id)
);

-- Create indexes for examination attempts
CREATE INDEX IF NOT EXISTS idx_lmsact_examination_attempts_content_block 
    ON lmsact.session_examination_attempts(content_block_id);

CREATE INDEX IF NOT EXISTS idx_lmsact_examination_attempts_user 
    ON lmsact.session_examination_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_lmsact_examination_attempts_graded_by 
    ON lmsact.session_examination_attempts(graded_by);

CREATE INDEX IF NOT EXISTS idx_lmsact_examination_attempts_status 
    ON lmsact.session_examination_attempts(status);

CREATE INDEX IF NOT EXISTS idx_lmsact_examination_attempts_submitted_at 
    ON lmsact.session_examination_attempts(submitted_at DESC);

-- Create updated_at trigger for examination attempts
CREATE OR REPLACE FUNCTION lmsact.update_examination_attempt_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_examination_attempt_updated_at
    BEFORE UPDATE ON lmsact.session_examination_attempts
    FOR EACH ROW
    EXECUTE FUNCTION lmsact.update_examination_attempt_updated_at();

-- ============================================================================
-- STEP 2: Create Course Certificates Table (lmsact schema)
-- ============================================================================

-- Create course certificates table
CREATE TABLE IF NOT EXISTS lmsact.course_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_number VARCHAR(100) UNIQUE NOT NULL, -- Unique certificate ID (e.g., ACTLMS-2025-001234)
    
    -- Student and course details
    user_id UUID NOT NULL,
    subject_id UUID NOT NULL, -- From lmsact.content_map_sub_details
    session_id UUID NOT NULL, -- From workflowmgmt.sessions
    examination_attempt_id UUID NOT NULL, -- Reference to the passing examination attempt
    
    -- Certificate details
    student_name VARCHAR(255) NOT NULL,
    course_name VARCHAR(500) NOT NULL,
    course_code VARCHAR(50),
    completion_date DATE NOT NULL,
    issue_date DATE DEFAULT CURRENT_DATE,
    
    -- Grading details
    final_score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    percentage NUMERIC(5,2) NOT NULL,
    grade VARCHAR(10), -- A+, A, B+, B, C, etc.
    
    -- Certificate metadata
    certificate_url TEXT, -- URL to generated PDF certificate
    certificate_hash VARCHAR(255), -- Hash for verification
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID,
    revocation_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_certificate_user 
        FOREIGN KEY (user_id) 
        REFERENCES lmsact.users(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_certificate_subject 
        FOREIGN KEY (subject_id) 
        REFERENCES lmsact.content_map_sub_details(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_certificate_session 
        FOREIGN KEY (session_id) 
        REFERENCES workflowmgmt.sessions(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_certificate_examination_attempt 
        FOREIGN KEY (examination_attempt_id) 
        REFERENCES lmsact.session_examination_attempts(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_certificate_revoked_by 
        FOREIGN KEY (revoked_by) 
        REFERENCES lmsact.users(id) 
        ON DELETE SET NULL
);

-- Create indexes for certificates
CREATE INDEX IF NOT EXISTS idx_lmsact_certificates_user 
    ON lmsact.course_certificates(user_id);

CREATE INDEX IF NOT EXISTS idx_lmsact_certificates_subject 
    ON lmsact.course_certificates(subject_id);

CREATE INDEX IF NOT EXISTS idx_lmsact_certificates_session 
    ON lmsact.course_certificates(session_id);

CREATE INDEX IF NOT EXISTS idx_lmsact_certificates_certificate_number 
    ON lmsact.course_certificates(certificate_number);

CREATE INDEX IF NOT EXISTS idx_lmsact_certificates_issue_date 
    ON lmsact.course_certificates(issue_date DESC);

CREATE INDEX IF NOT EXISTS idx_lmsact_certificates_is_revoked 
    ON lmsact.course_certificates(is_revoked);

-- Create updated_at trigger for certificates
CREATE OR REPLACE FUNCTION lmsact.update_certificate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_certificate_updated_at
    BEFORE UPDATE ON lmsact.course_certificates
    FOR EACH ROW
    EXECUTE FUNCTION lmsact.update_certificate_updated_at();

-- ============================================================================
-- STEP 3: Create Certificate Number Generator Function
-- ============================================================================

-- Function to generate unique certificate number
CREATE OR REPLACE FUNCTION lmsact.generate_certificate_number()
RETURNS VARCHAR(100) AS $$
DECLARE
    year_part VARCHAR(4);
    sequence_part VARCHAR(6);
    new_certificate_number VARCHAR(100);
    max_sequence INTEGER;
BEGIN
    -- Get current year
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- Get max sequence for current year
    SELECT COALESCE(MAX(CAST(SUBSTRING(certificate_number FROM 13 FOR 6) AS INTEGER)), 0)
    INTO max_sequence
    FROM lmsact.course_certificates
    WHERE certificate_number LIKE 'ACTLMS-' || year_part || '-%';
    
    -- Increment sequence
    sequence_part := LPAD((max_sequence + 1)::TEXT, 6, '0');
    
    -- Generate certificate number: ACTLMS-YYYY-NNNNNN
    new_certificate_number := 'ACTLMS-' || year_part || '-' || sequence_part;
    
    RETURN new_certificate_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Add Comments for Documentation
-- ============================================================================

COMMENT ON TABLE lmsact.session_examination_attempts IS 'Stores student examination attempts with auto-grading and manual grading support (one attempt per student per examination)';
COMMENT ON COLUMN lmsact.session_examination_attempts.content_block_id IS 'References workflowmgmt.session_content_blocks(id) - the examination content block';
COMMENT ON COLUMN lmsact.session_examination_attempts.user_id IS 'Student who attempted the examination (references lmsact.users)';
COMMENT ON COLUMN lmsact.session_examination_attempts.answers IS 'Student answers: {questionId: answer, ...}';
COMMENT ON COLUMN lmsact.session_examination_attempts.auto_graded_score IS 'Score from auto-graded questions (MCQ, True/False, Multiple Select)';
COMMENT ON COLUMN lmsact.session_examination_attempts.manual_graded_score IS 'Score from manually graded questions (Short Answer, Long Answer, File Upload)';
COMMENT ON COLUMN lmsact.session_examination_attempts.question_feedback IS 'Feedback for each manually graded question: {questionId: {score, feedback}, ...}';
COMMENT ON COLUMN lmsact.session_examination_attempts.status IS 'Attempt status: in_progress, submitted, auto_graded, graded, completed';

COMMENT ON TABLE lmsact.course_certificates IS 'Stores course completion certificates issued after passing examinations';
COMMENT ON COLUMN lmsact.course_certificates.certificate_number IS 'Unique certificate ID (format: ACTLMS-YYYY-NNNNNN)';
COMMENT ON COLUMN lmsact.course_certificates.certificate_hash IS 'Hash for certificate verification and authenticity';
COMMENT ON COLUMN lmsact.course_certificates.is_revoked IS 'Whether certificate has been revoked (e.g., due to academic misconduct)';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Created tables: lmsact.session_examination_attempts, lmsact.course_certificates';
    RAISE NOTICE 'Created function: lmsact.generate_certificate_number()';
END $$;

