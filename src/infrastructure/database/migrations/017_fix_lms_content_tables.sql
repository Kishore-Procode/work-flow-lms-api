-- Migration: Fix LMS Content Tables
-- Description: Add missing columns to examination_questions and assignment_submissions tables
-- Date: 2025-11-02

-- Set schema
SET search_path TO lmsact;

-- ==================== FIX EXAMINATION_QUESTIONS TABLE ====================

-- Add explanation column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'lmsact' 
    AND table_name = 'examination_questions' 
    AND column_name = 'explanation'
  ) THEN
    ALTER TABLE examination_questions ADD COLUMN explanation TEXT;
    COMMENT ON COLUMN examination_questions.explanation IS 'Explanation for the correct answer';
  END IF;
END $$;

-- Add is_required column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'lmsact' 
    AND table_name = 'examination_questions' 
    AND column_name = 'is_required'
  ) THEN
    ALTER TABLE examination_questions ADD COLUMN is_required BOOLEAN DEFAULT TRUE;
    COMMENT ON COLUMN examination_questions.is_required IS 'Whether the question must be answered';
  END IF;
END $$;

-- ==================== FIX SESSION_ASSIGNMENT_SUBMISSIONS TABLE ====================

-- Add is_late column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'lmsact'
    AND table_name = 'session_assignment_submissions'
    AND column_name = 'is_late'
  ) THEN
    ALTER TABLE session_assignment_submissions ADD COLUMN is_late BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN session_assignment_submissions.is_late IS 'Whether the submission was made after the due date';
  END IF;
END $$;

-- Update is_late based on submitted_at and assignment due_date
UPDATE session_assignment_submissions sub
SET is_late = (sub.submitted_at > a.due_date)
FROM assignments a
WHERE sub.assignment_id = a.id
AND sub.is_late IS NULL;

-- ==================== VERIFICATION ====================

-- Verify examination_questions columns
SELECT 
  'examination_questions' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'lmsact' 
AND table_name = 'examination_questions'
AND column_name IN ('explanation', 'is_required')
ORDER BY column_name;

-- Verify session_assignment_submissions columns
SELECT
  'session_assignment_submissions' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'lmsact'
AND table_name = 'session_assignment_submissions'
AND column_name = 'is_late'
ORDER BY column_name;

COMMENT ON TABLE examination_questions IS 'Questions for LMS examinations with explanation and is_required fields';
COMMENT ON TABLE session_assignment_submissions IS 'Student submissions for LMS assignments with is_late tracking';

