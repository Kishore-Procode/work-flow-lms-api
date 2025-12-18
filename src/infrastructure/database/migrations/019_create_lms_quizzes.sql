-- Migration: Create LMS Quizzes Tables
-- Description: Create quizzes, quiz_questions, and quiz_attempts tables in lmsact schema
-- Author: Student-ACT LMS Team
-- Date: 2025-11-03

-- Set search path to lmsact schema
SET search_path TO lmsact;

-- ============================================================================
-- TABLE: quizzes
-- Description: Stores LMS quizzes (standalone, not tied to workflow sessions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_map_sub_details_id UUID NOT NULL REFERENCES content_map_sub_details(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  instructions TEXT,
  duration INTEGER, -- Duration in minutes (optional for quizzes)
  total_points INTEGER DEFAULT 100,
  passing_percentage INTEGER DEFAULT 50,
  max_attempts INTEGER DEFAULT 3, -- Quizzes typically allow multiple attempts
  show_results BOOLEAN DEFAULT TRUE,
  show_correct_answers BOOLEAN DEFAULT TRUE, -- Show correct answers after submission
  shuffle_questions BOOLEAN DEFAULT FALSE,
  shuffle_options BOOLEAN DEFAULT FALSE,
  allow_review BOOLEAN DEFAULT TRUE,
  is_required BOOLEAN DEFAULT FALSE, -- Quizzes are typically optional
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for quizzes table
CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON quizzes(content_map_sub_details_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON quizzes(created_by);
CREATE INDEX IF NOT EXISTS idx_quizzes_active ON quizzes(is_active);

-- ============================================================================
-- TABLE: quiz_questions
-- Description: Stores questions for LMS quizzes
-- ============================================================================
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL, -- 'multiple_choice', 'true_false', 'short_answer', 'essay'
  points INTEGER DEFAULT 1,
  order_index INTEGER NOT NULL,
  options JSONB, -- For multiple choice: [{"text": "Option A", "isCorrect": true}, ...]
  correct_answer JSONB, -- Stores correct answer(s) based on question type
  explanation TEXT, -- Explanation shown after answering
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for quiz_questions table
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order ON quiz_questions(quiz_id, order_index);

-- ============================================================================
-- TABLE: quiz_attempts
-- Description: Stores student quiz attempts
-- ============================================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'submitted', 'graded'
  score INTEGER, -- Points earned
  max_score INTEGER, -- Total points possible
  percentage DECIMAL(5,2), -- Calculated percentage
  passed BOOLEAN, -- Whether student passed based on passing_percentage
  time_taken INTEGER, -- Time taken in seconds
  answers JSONB, -- Student's answers: [{"questionId": "...", "answer": "...", "isCorrect": true}]
  feedback TEXT, -- Optional feedback from instructor
  graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  graded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(quiz_id, student_id, attempt_number)
);

-- Create indexes for quiz_attempts table
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON quiz_attempts(status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_graded_by ON quiz_attempts(graded_by);

-- ============================================================================
-- TABLE: quiz_attempt_answers
-- Description: Stores individual answers for each question in a quiz attempt
-- ============================================================================
CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  quiz_question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  answer JSONB NOT NULL, -- Student's answer (format depends on question type)
  is_correct BOOLEAN, -- Whether the answer is correct (auto-graded for objective questions)
  points_earned INTEGER DEFAULT 0,
  max_points INTEGER NOT NULL,
  feedback TEXT, -- Optional feedback for this specific answer
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(quiz_attempt_id, quiz_question_id)
);

-- Create indexes for quiz_attempt_answers table
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_attempt ON quiz_attempt_answers(quiz_attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_question ON quiz_attempt_answers(quiz_question_id);

-- ============================================================================
-- TRIGGERS: Update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_questions_updated_at
  BEFORE UPDATE ON quiz_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_attempts_updated_at
  BEFORE UPDATE ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_attempt_answers_updated_at
  BEFORE UPDATE ON quiz_attempt_answers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE quizzes IS 'Stores LMS quizzes (standalone, not tied to workflow sessions)';
COMMENT ON TABLE quiz_questions IS 'Stores questions for LMS quizzes';
COMMENT ON TABLE quiz_attempts IS 'Stores student quiz attempts';
COMMENT ON TABLE quiz_attempt_answers IS 'Stores individual answers for each question in a quiz attempt';

COMMENT ON COLUMN quizzes.content_map_sub_details_id IS 'Reference to the subject this quiz belongs to';
COMMENT ON COLUMN quizzes.max_attempts IS 'Maximum number of attempts allowed (quizzes typically allow multiple attempts)';
COMMENT ON COLUMN quizzes.show_correct_answers IS 'Whether to show correct answers after submission';
COMMENT ON COLUMN quizzes.is_required IS 'Whether this quiz is required (quizzes are typically optional)';

COMMENT ON COLUMN quiz_questions.question_type IS 'Type of question: multiple_choice, true_false, short_answer, essay';
COMMENT ON COLUMN quiz_questions.options IS 'For multiple choice questions: array of options with isCorrect flag';
COMMENT ON COLUMN quiz_questions.correct_answer IS 'Correct answer(s) based on question type';

COMMENT ON COLUMN quiz_attempts.attempt_number IS 'Attempt number for this student (1, 2, 3, etc.)';
COMMENT ON COLUMN quiz_attempts.status IS 'Status: in_progress, submitted, graded';
COMMENT ON COLUMN quiz_attempts.passed IS 'Whether student passed based on passing_percentage';
COMMENT ON COLUMN quiz_attempts.answers IS 'Student answers in JSONB format';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Grant permissions to application user (adjust as needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON quizzes TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON quiz_questions TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON quiz_attempts TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON quiz_attempt_answers TO postgres;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration creates the LMS quiz tables structure
-- Quizzes are now standalone in the LMS schema, not tied to workflow sessions

