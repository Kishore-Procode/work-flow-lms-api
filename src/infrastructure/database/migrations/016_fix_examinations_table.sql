-- Fix Examinations Table Schema
-- This script adds missing columns to the examinations table to match repository expectations

-- Set the schema
SET search_path TO lmsact;

-- Add missing columns to examinations table
ALTER TABLE examinations ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE examinations ADD COLUMN IF NOT EXISTS total_points INTEGER;
ALTER TABLE examinations ADD COLUMN IF NOT EXISTS passing_percentage INTEGER;
ALTER TABLE examinations ADD COLUMN IF NOT EXISTS show_results BOOLEAN DEFAULT false;
ALTER TABLE examinations ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN DEFAULT false;
ALTER TABLE examinations ADD COLUMN IF NOT EXISTS is_proctored BOOLEAN DEFAULT false;
ALTER TABLE examinations ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE examinations ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE examinations ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT true;

-- Copy data from old columns to new columns (if they exist)
UPDATE examinations SET duration = time_limit WHERE duration IS NULL AND time_limit IS NOT NULL;
UPDATE examinations SET passing_percentage = passing_score WHERE passing_percentage IS NULL AND passing_score IS NOT NULL;
UPDATE examinations SET show_results = show_results_immediately WHERE show_results IS NULL AND show_results_immediately IS NOT NULL;

-- Set default values for total_points if NULL
UPDATE examinations SET total_points = 100 WHERE total_points IS NULL;

-- Make old columns nullable to avoid conflicts
ALTER TABLE examinations ALTER COLUMN time_limit DROP NOT NULL;
ALTER TABLE examinations ALTER COLUMN passing_score DROP NOT NULL;

-- Copy data from new columns back to old columns for backward compatibility
UPDATE examinations SET time_limit = duration WHERE time_limit IS NULL AND duration IS NOT NULL;
UPDATE examinations SET passing_score = passing_percentage WHERE passing_score IS NULL AND passing_percentage IS NOT NULL;

COMMENT ON COLUMN examinations.duration IS 'Examination duration in minutes';
COMMENT ON COLUMN examinations.total_points IS 'Total points for the examination';
COMMENT ON COLUMN examinations.passing_percentage IS 'Passing percentage (0-100)';
COMMENT ON COLUMN examinations.show_results IS 'Whether to show results immediately after completion';
COMMENT ON COLUMN examinations.shuffle_options IS 'Whether to shuffle answer options';
COMMENT ON COLUMN examinations.is_proctored IS 'Whether the examination requires proctoring';
COMMENT ON COLUMN examinations.start_date IS 'Examination start date/time';
COMMENT ON COLUMN examinations.end_date IS 'Examination end date/time';
COMMENT ON COLUMN examinations.is_required IS 'Whether the examination is required for course completion';

