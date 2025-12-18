-- Migration: Create Tree Monitoring Table
-- Date: 2025-01-30
-- Description: Create table for storing tree monitoring data and photo uploads

-- Create tree_monitoring table
CREATE TABLE IF NOT EXISTS tree_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    monitoring_date DATE NOT NULL DEFAULT CURRENT_DATE,
    height_cm DECIMAL(10,2),
    trunk_diameter_cm DECIMAL(10,2),
    health_status VARCHAR(50) NOT NULL DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'sick', 'dying', 'dead', 'recovering')),
    watered BOOLEAN DEFAULT false,
    fertilized BOOLEAN DEFAULT false,
    pruned BOOLEAN DEFAULT false,
    pest_issues TEXT,
    disease_issues TEXT,
    general_notes TEXT,
    weather_conditions VARCHAR(100),
    image_url TEXT,
    image_type VARCHAR(20) DEFAULT 'progress' CHECK (image_type IN ('progress', 'issue', 'general', 'before', 'after')),
    monitoring_type VARCHAR(20) DEFAULT 'progress' CHECK (monitoring_type IN ('progress', 'issue', 'general', 'maintenance')),
    description TEXT,
    location_latitude DECIMAL(10,8),
    location_longitude DECIMAL(11,8),
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tree_monitoring_tree_id ON tree_monitoring(tree_id);
CREATE INDEX IF NOT EXISTS idx_tree_monitoring_user_id ON tree_monitoring(user_id);
CREATE INDEX IF NOT EXISTS idx_tree_monitoring_date ON tree_monitoring(monitoring_date DESC);
CREATE INDEX IF NOT EXISTS idx_tree_monitoring_created_at ON tree_monitoring(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tree_monitoring_health_status ON tree_monitoring(health_status);
CREATE INDEX IF NOT EXISTS idx_tree_monitoring_verified ON tree_monitoring(verified);
CREATE INDEX IF NOT EXISTS idx_tree_monitoring_image_url ON tree_monitoring(image_url) WHERE image_url IS NOT NULL;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tree_monitoring_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tree_monitoring_updated_at
    BEFORE UPDATE ON tree_monitoring
    FOR EACH ROW
    EXECUTE FUNCTION update_tree_monitoring_updated_at();

-- Add comments for documentation
COMMENT ON TABLE tree_monitoring IS 'Stores tree monitoring data, measurements, and photo uploads from students';
COMMENT ON COLUMN tree_monitoring.id IS 'Unique identifier for the monitoring record';
COMMENT ON COLUMN tree_monitoring.tree_id IS 'Reference to the tree being monitored';
COMMENT ON COLUMN tree_monitoring.user_id IS 'Reference to the user who created the monitoring record';
COMMENT ON COLUMN tree_monitoring.monitoring_date IS 'Date when the monitoring was performed';
COMMENT ON COLUMN tree_monitoring.height_cm IS 'Tree height in centimeters';
COMMENT ON COLUMN tree_monitoring.trunk_diameter_cm IS 'Trunk diameter in centimeters';
COMMENT ON COLUMN tree_monitoring.health_status IS 'Current health status of the tree';
COMMENT ON COLUMN tree_monitoring.watered IS 'Whether the tree was watered during this monitoring';
COMMENT ON COLUMN tree_monitoring.fertilized IS 'Whether the tree was fertilized during this monitoring';
COMMENT ON COLUMN tree_monitoring.pruned IS 'Whether the tree was pruned during this monitoring';
COMMENT ON COLUMN tree_monitoring.pest_issues IS 'Description of any pest issues observed';
COMMENT ON COLUMN tree_monitoring.disease_issues IS 'Description of any disease issues observed';
COMMENT ON COLUMN tree_monitoring.general_notes IS 'General observations and notes';
COMMENT ON COLUMN tree_monitoring.weather_conditions IS 'Weather conditions during monitoring';
COMMENT ON COLUMN tree_monitoring.image_url IS 'URL/path to the uploaded image';
COMMENT ON COLUMN tree_monitoring.image_type IS 'Type of image (progress, issue, general, before, after)';
COMMENT ON COLUMN tree_monitoring.monitoring_type IS 'Type of monitoring record';
COMMENT ON COLUMN tree_monitoring.description IS 'Description or caption for the monitoring record';
COMMENT ON COLUMN tree_monitoring.location_latitude IS 'GPS latitude where photo was taken';
COMMENT ON COLUMN tree_monitoring.location_longitude IS 'GPS longitude where photo was taken';
COMMENT ON COLUMN tree_monitoring.verified IS 'Whether the record has been verified by staff';
COMMENT ON COLUMN tree_monitoring.verified_by IS 'ID of the staff member who verified the record';
COMMENT ON COLUMN tree_monitoring.verified_at IS 'Timestamp when the record was verified';
COMMENT ON COLUMN tree_monitoring.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN tree_monitoring.updated_at IS 'Timestamp when the record was last updated';

-- Insert some sample data for testing (optional)
-- INSERT INTO tree_monitoring (tree_id, user_id, height_cm, trunk_diameter_cm, health_status, watered, general_notes, image_url, description) 
-- SELECT 
--     t.id as tree_id,
--     t.assigned_student_id as user_id,
--     50.0 + (RANDOM() * 100) as height_cm,
--     5.0 + (RANDOM() * 10) as trunk_diameter_cm,
--     'healthy' as health_status,
--     true as watered,
--     'Initial monitoring record' as general_notes,
--     '/uploads/tree-images/sample-' || t.tree_code || '.jpg' as image_url,
--     'Progress update for ' || t.species as description
-- FROM trees t 
-- WHERE t.assigned_student_id IS NOT NULL 
-- LIMIT 5;

-- Migration completed successfully
SELECT 'Tree monitoring table created successfully!' as migration_status;
