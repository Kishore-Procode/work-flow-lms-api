-- Create guidelines table
CREATE TABLE IF NOT EXISTS guidelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(100) NOT NULL,
    tips JSONB NOT NULL DEFAULT '[]',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- PDF, Video, Link, etc.
    size VARCHAR(20), -- File size like "2.5 MB" or duration like "15 min"
    link TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_guidelines_active_order ON guidelines(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_resources_category_order ON resources(category, display_order);
CREATE INDEX IF NOT EXISTS idx_resources_active ON resources(is_active);

-- Insert default guidelines
INSERT INTO guidelines (title, description, icon, tips, display_order) VALUES
('Tree Selection', 'Choose a healthy sapling from the approved list. Ensure it''s suitable for your local climate.', 'TreePine', 
 '["Select native species when possible", "Check for healthy root system", "Avoid damaged or diseased saplings"]', 1),

('Location Selection', 'Pick a suitable location with adequate space for growth and proper sunlight.', 'MapPin',
 '["Ensure 6-8 hours of sunlight daily", "Check for underground utilities", "Allow 10-15 feet spacing from buildings"]', 2),

('Watering Schedule', 'Maintain consistent watering schedule, especially during the first year.', 'Droplets',
 '["Water deeply 2-3 times per week", "Increase frequency during hot weather", "Reduce watering during monsoon season"]', 3),

('Progress Documentation', 'Take regular photos to track your tree''s growth and health.', 'Camera',
 '["Upload photos monthly", "Include height measurements", "Note any changes or concerns"]', 4),

('Seasonal Care', 'Adjust care routine based on seasonal requirements.', 'Sun',
 '["Mulch around base in summer", "Protect from strong winds", "Prune dead branches regularly"]', 5),

('Problem Identification', 'Learn to identify common issues and when to seek help.', 'AlertTriangle',
 '["Watch for pest infestations", "Monitor leaf color changes", "Report serious issues immediately"]', 6);

-- Insert default resources
INSERT INTO resources (category, title, description, type, size, link, display_order) VALUES
-- Educational Materials
('Educational Materials', 'Tree Planting Handbook', 'Comprehensive guide to tree planting and care', 'PDF', '2.5 MB', '#handbook', 1),
('Educational Materials', 'Native Species Guide', 'Guide to native tree species suitable for our region', 'PDF', '1.8 MB', '#species-guide', 2),
('Educational Materials', 'Seasonal Care Calendar', 'Month-by-month tree care schedule', 'PDF', '0.9 MB', '#care-calendar', 3),

-- Video Tutorials
('Video Tutorials', 'Proper Planting Technique', 'Step-by-step video guide for planting saplings', 'Video', '15 min', '#planting-video', 1),
('Video Tutorials', 'Watering Best Practices', 'Learn the correct watering techniques', 'Video', '8 min', '#watering-video', 2),
('Video Tutorials', 'Identifying Tree Diseases', 'How to spot and address common tree problems', 'Video', '12 min', '#disease-video', 3),

-- Tools & Supplies
('Tools & Supplies', 'Recommended Tools List', 'Essential tools for tree care and maintenance', 'PDF', '0.5 MB', '#tools-list', 1),
('Tools & Supplies', 'Supplier Directory', 'Local suppliers for saplings and gardening tools', 'PDF', '1.2 MB', '#suppliers', 2),
('Tools & Supplies', 'Budget Planning Guide', 'Cost estimation for tree care activities', 'PDF', '0.7 MB', '#budget-guide', 3);

-- Create contact information table
CREATE TABLE IF NOT EXISTS contact_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default contact information
INSERT INTO contact_info (role, name, email, phone, display_order) VALUES
('Environmental Coordinator', 'Dr. Priya Sharma', 'priya.sharma@rmkec.ac.in', '+91 98765 43210', 1),
('Horticulture Expert', 'Mr. Rajesh Kumar', 'rajesh.kumar@rmkec.ac.in', '+91 98765 43211', 2),
('Student Coordinator', 'Ms. Anitha Devi', 'anitha.devi@rmkec.ac.in', '+91 98765 43212', 3);
