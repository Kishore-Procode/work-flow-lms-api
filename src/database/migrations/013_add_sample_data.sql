-- Migration: Add Sample Data for Testing
-- Date: 2025-01-30
-- Description: Add sample colleges, departments, users, trees, and monitoring data

-- Insert sample colleges
INSERT INTO colleges (id, name, address, city, state, postal_code, phone, email, website, established_year, type, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'RMK Engineering College', 'RSM Nagar, Kavaraipettai', 'Chennai', 'Tamil Nadu', '601206', '+91-44-27462425', 'info@rmkec.ac.in', 'https://rmkec.ac.in', 1995, 'engineering', 'active'),
('550e8400-e29b-41d4-a716-446655440002', 'Anna University', 'Sardar Patel Road, Guindy', 'Chennai', 'Tamil Nadu', '600025', '+91-44-22203000', 'info@annauniv.edu', 'https://annauniv.edu', 1978, 'university', 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert sample departments
INSERT INTO departments (id, name, code, college_id, hod_name, phone, email, established_year, status) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'Computer Science and Engineering', 'CSE', '550e8400-e29b-41d4-a716-446655440001', 'Dr. Rajesh Kumar', '+91-44-27462426', 'cse@rmkec.ac.in', 1995, 'active'),
('660e8400-e29b-41d4-a716-446655440002', 'Information Technology', 'IT', '550e8400-e29b-41d4-a716-446655440001', 'Dr. Priya Sharma', '+91-44-27462427', 'it@rmkec.ac.in', 1998, 'active'),
('660e8400-e29b-41d4-a716-446655440003', 'Electronics and Communication Engineering', 'ECE', '550e8400-e29b-41d4-a716-446655440001', 'Dr. Suresh Babu', '+91-44-27462428', 'ece@rmkec.ac.in', 1995, 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert sample users (students and faculty)
INSERT INTO users (id, name, email, password_hash, role, status, college_id, department_id, phone, roll_number, class, semester, year_of_study, profile_image_url) VALUES
-- Students
('770e8400-e29b-41d4-a716-446655440001', 'Arjun Krishnan', 'arjun.krishnan@student.rmkec.ac.in', '$2b$10$rQZ8kJQZ8kJQZ8kJQZ8kJO8kJQZ8kJQZ8kJQZ8kJQZ8kJQZ8kJQZ8k', 'student', 'active', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '+91-9876543210', '2021CSE001', '3rd Year', '5th Semester', '3rd Year', null),
('770e8400-e29b-41d4-a716-446655440002', 'Priya Nair', 'priya.nair@student.rmkec.ac.in', '$2b$10$rQZ8kJQZ8kJQZ8kJQZ8kJO8kJQZ8kJQZ8kJQZ8kJQZ8kJQZ8kJQZ8k', 'student', 'active', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '+91-9876543211', '2021CSE002', '3rd Year', '5th Semester', '3rd Year', null),
('770e8400-e29b-41d4-a716-446655440003', 'Rahul Sharma', 'rahul.sharma@student.rmkec.ac.in', '$2b$10$rQZ8kJQZ8kJQZ8kJQZ8kJO8kJQZ8kJQZ8kJQZ8kJQZ8kJQZ8kJQZ8k', 'student', 'active', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', '+91-9876543212', '2021IT001', '3rd Year', '5th Semester', '3rd Year', null),
('770e8400-e29b-41d4-a716-446655440004', 'Sneha Reddy', 'sneha.reddy@student.rmkec.ac.in', '$2b$10$rQZ8kJQZ8kJQZ8kJQZ8kJO8kJQZ8kJQZ8kJQZ8kJQZ8kJQZ8kJQZ8k', 'student', 'active', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440003', '+91-9876543213', '2021ECE001', '3rd Year', '5th Semester', '3rd Year', null),
('770e8400-e29b-41d4-a716-446655440005', 'Vikram Singh', 'vikram.singh@student.rmkec.ac.in', '$2b$10$rQZ8kJQZ8kJQZ8kJQZ8kJO8kJQZ8kJQZ8kJQZ8kJQZ8kJQZ8kJQZ8k', 'student', 'active', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '+91-9876543214', '2022CSE001', '2nd Year', '3rd Semester', '2nd Year', null),
-- Faculty
('770e8400-e29b-41d4-a716-446655440010', 'Dr. Rajesh Kumar', 'rajesh.kumar@rmkec.ac.in', '$2b$10$rQZ8kJQZ8kJQZ8kJQZ8kJO8kJQZ8kJQZ8kJQZ8kJQZ8kJQZ8kJQZ8k', 'hod', 'active', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '+91-9876543220', null, null, null, null, null),
('770e8400-e29b-41d4-a716-446655440011', 'Dr. Priya Sharma', 'priya.sharma@rmkec.ac.in', '$2b$10$rQZ8kJQZ8kJQZ8kJQZ8kJO8kJQZ8kJQZ8kJQZ8kJQZ8kJQZ8kJQZ8k', 'hod', 'active', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', '+91-9876543221', null, null, null, null, null),
('770e8400-e29b-41d4-a716-446655440012', 'Prof. Suresh Babu', 'suresh.babu@rmkec.ac.in', '$2b$10$rQZ8kJQZ8kJQZ8kJQZ8kJO8kJQZ8kJQZ8kJQZ8kJQZ8kJQZ8kJQZ8k', 'staff', 'active', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440003', '+91-9876543222', null, null, null, null, null),
-- Principal
('770e8400-e29b-41d4-a716-446655440020', 'Dr. Venkatesh Iyer', 'principal@rmkec.ac.in', '$2b$10$rQZ8kJQZ8kJQZ8kJQZ8kJO8kJQZ8kJQZ8kJQZ8kJQZ8kJQZ8kJQZ8k', 'principal', 'active', '550e8400-e29b-41d4-a716-446655440001', null, '+91-9876543230', null, null, null, null, null)
ON CONFLICT (id) DO NOTHING;

-- Insert sample trees
INSERT INTO trees (id, tree_code, species, planted_date, location_description, latitude, longitude, assigned_student_id, status, health_status, height_cm, trunk_diameter_cm, last_monitored, notes) VALUES
('880e8400-e29b-41d4-a716-446655440001', 'TREE001', 'Neem (Azadirachta indica)', '2024-01-15', 'Near Main Gate, RMK Engineering College', 12.9716, 77.5946, '770e8400-e29b-41d4-a716-446655440001', 'active', 'healthy', 150.5, 12.3, '2024-12-01', 'Growing well, regular watering maintained'),
('880e8400-e29b-41d4-a716-446655440002', 'TREE002', 'Banyan (Ficus benghalensis)', '2024-01-20', 'Central Courtyard, Block A', 12.9717, 77.5947, '770e8400-e29b-41d4-a716-446655440002', 'active', 'healthy', 180.2, 15.7, '2024-12-02', 'Excellent growth, showing new branches'),
('880e8400-e29b-41d4-a716-446655440003', 'TREE003', 'Mango (Mangifera indica)', '2024-02-01', 'Behind Library Building', 12.9718, 77.5948, '770e8400-e29b-41d4-a716-446655440003', 'active', 'healthy', 120.8, 10.2, '2024-11-30', 'Seasonal growth, preparing for flowering'),
('880e8400-e29b-41d4-a716-446655440004', 'TREE004', 'Peepal (Ficus religiosa)', '2024-02-10', 'Sports Ground Area', 12.9719, 77.5949, '770e8400-e29b-41d4-a716-446655440004', 'active', 'healthy', 165.3, 13.8, '2024-12-03', 'Strong root system developing'),
('880e8400-e29b-41d4-a716-446655440005', 'TREE005', 'Gulmohar (Delonix regia)', '2024-02-15', 'Parking Area, Block B', 12.9720, 77.5950, '770e8400-e29b-41d4-a716-446655440005', 'active', 'healthy', 95.6, 8.4, '2024-11-28', 'Young tree, showing good adaptation'),
-- Available trees (not assigned)
('880e8400-e29b-41d4-a716-446655440006', 'TREE006', 'Coconut (Cocos nucifera)', '2024-03-01', 'Hostel Area', 12.9721, 77.5951, null, 'available', 'healthy', 200.0, 18.5, null, 'Ready for assignment'),
('880e8400-e29b-41d4-a716-446655440007', 'TREE007', 'Jackfruit (Artocarpus heterophyllus)', '2024-03-05', 'Faculty Quarters', 12.9722, 77.5952, null, 'available', 'healthy', 110.3, 9.7, null, 'Available for student assignment'),
('880e8400-e29b-41d4-a716-446655440008', 'TREE008', 'Tamarind (Tamarindus indica)', '2024-03-10', 'Canteen Area', 12.9723, 77.5953, null, 'available', 'healthy', 85.2, 7.1, null, 'Young sapling, needs regular care')
ON CONFLICT (id) DO NOTHING;

-- Insert tree selections
INSERT INTO tree_selection (id, user_id, tree_id, selected_at, is_planted, status, notes) VALUES
('990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', '2024-01-15 10:00:00+00', true, 'active', 'First tree selection, student very enthusiastic'),
('990e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440002', '2024-01-20 11:30:00+00', true, 'active', 'Selected banyan for its longevity'),
('990e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440003', '2024-02-01 09:15:00+00', true, 'active', 'Interested in fruit-bearing trees'),
('990e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440004', '2024-02-10 14:20:00+00', true, 'active', 'Chose peepal for its cultural significance'),
('990e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440005', '880e8400-e29b-41d4-a716-446655440005', '2024-02-15 16:45:00+00', true, 'active', 'Attracted to colorful flowering tree')
ON CONFLICT (id) DO NOTHING;

-- Insert sample tree monitoring data
INSERT INTO tree_monitoring (id, tree_id, user_id, monitoring_date, height_cm, trunk_diameter_cm, health_status, watered, fertilized, general_notes, image_url, description, monitoring_type) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', '2024-11-01', 145.2, 11.8, 'healthy', true, false, 'Regular growth observed, leaves are green and healthy', '/uploads/tree-images/tree001-nov2024.jpg', 'Monthly progress update - November', 'progress'),
('aa0e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', '2024-12-01', 150.5, 12.3, 'healthy', true, true, 'Applied organic fertilizer, noticed new leaf growth', '/uploads/tree-images/tree001-dec2024.jpg', 'Monthly progress update - December', 'progress'),
('aa0e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', '2024-11-15', 175.8, 15.2, 'healthy', true, false, 'Banyan showing excellent aerial root development', '/uploads/tree-images/tree002-nov2024.jpg', 'Bi-weekly check - aerial roots appearing', 'progress'),
('aa0e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', '2024-12-02', 180.2, 15.7, 'healthy', true, false, 'Continued healthy growth, strong branch development', '/uploads/tree-images/tree002-dec2024.jpg', 'Monthly progress update - December', 'progress'),
('aa0e8400-e29b-41d4-a716-446655440005', '880e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440003', '2024-11-30', 120.8, 10.2, 'healthy', true, true, 'Mango tree preparing for flowering season', '/uploads/tree-images/tree003-nov2024.jpg', 'Pre-flowering season check', 'progress'),
('aa0e8400-e29b-41d4-a716-446655440006', '880e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440004', '2024-12-03', 165.3, 13.8, 'healthy', true, false, 'Peepal tree showing strong root system development', '/uploads/tree-images/tree004-dec2024.jpg', 'Root system development check', 'progress'),
('aa0e8400-e29b-41d4-a716-446655440007', '880e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440005', '2024-11-28', 95.6, 8.4, 'healthy', true, true, 'Young gulmohar adapting well to environment', '/uploads/tree-images/tree005-nov2024.jpg', 'Young tree adaptation check', 'progress')
ON CONFLICT (id) DO NOTHING;

-- Migration completed successfully
SELECT 'Sample data inserted successfully!' as migration_status;
