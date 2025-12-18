-- Migration: Create Tree Selection Table
-- Date: 2025-01-30
-- Description: Create table for managing student tree selections and assignments

-- Create tree_selection table
CREATE TABLE IF NOT EXISTS tree_selection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tree_id UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
    selected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    planted_at TIMESTAMP WITH TIME ZONE,
    is_planted BOOLEAN DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one tree per student and one student per tree
    UNIQUE(user_id),
    UNIQUE(tree_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tree_selection_user_id ON tree_selection(user_id);
CREATE INDEX IF NOT EXISTS idx_tree_selection_tree_id ON tree_selection(tree_id);
CREATE INDEX IF NOT EXISTS idx_tree_selection_status ON tree_selection(status);
CREATE INDEX IF NOT EXISTS idx_tree_selection_selected_at ON tree_selection(selected_at DESC);
CREATE INDEX IF NOT EXISTS idx_tree_selection_is_planted ON tree_selection(is_planted);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tree_selection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tree_selection_updated_at
    BEFORE UPDATE ON tree_selection
    FOR EACH ROW
    EXECUTE FUNCTION update_tree_selection_updated_at();

-- Add comments for documentation
COMMENT ON TABLE tree_selection IS 'Manages student tree selections and assignments';
COMMENT ON COLUMN tree_selection.id IS 'Unique identifier for the tree selection record';
COMMENT ON COLUMN tree_selection.user_id IS 'Reference to the student who selected the tree';
COMMENT ON COLUMN tree_selection.tree_id IS 'Reference to the selected tree';
COMMENT ON COLUMN tree_selection.selected_at IS 'Timestamp when the tree was selected';
COMMENT ON COLUMN tree_selection.planted_at IS 'Timestamp when the tree was marked as planted';
COMMENT ON COLUMN tree_selection.is_planted IS 'Whether the tree has been physically planted';
COMMENT ON COLUMN tree_selection.status IS 'Current status of the tree selection';
COMMENT ON COLUMN tree_selection.notes IS 'Additional notes about the selection';
COMMENT ON COLUMN tree_selection.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN tree_selection.updated_at IS 'Timestamp when the record was last updated';

-- Insert sample data based on existing tree assignments
INSERT INTO tree_selection (user_id, tree_id, selected_at, is_planted, status)
SELECT 
    t.assigned_student_id as user_id,
    t.id as tree_id,
    t.created_at as selected_at,
    CASE WHEN t.status = 'active' THEN true ELSE false END as is_planted,
    'active' as status
FROM trees t 
WHERE t.assigned_student_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Update trees table to remove assigned_student_id column dependency
-- (We'll keep it for now for backward compatibility but tree_selection is the source of truth)

-- Migration completed successfully
SELECT 'Tree selection table created successfully!' as migration_status;
