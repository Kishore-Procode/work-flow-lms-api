-- Migration: Add Image Storage and Approval Workflow Tables
-- Date: 2025-07-30
-- Description: Add tables for tree image storage and hierarchical approval workflows

-- Tree Images table for storing multiple images per tree
CREATE TABLE IF NOT EXISTS tree_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  image_type VARCHAR(50) DEFAULT 'progress' CHECK (image_type IN ('planting', 'progress', 'milestone', 'final')),
  caption TEXT,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  file_size INTEGER,
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Approval Workflow table for managing hierarchical approvals
CREATE TABLE IF NOT EXISTS approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('student_registration', 'staff_registration', 'hod_registration', 'principal_registration')),
  request_id UUID NOT NULL, -- References registration_requests.id
  current_approver_role VARCHAR(50) NOT NULL,
  current_approver_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tree_images_tree_id ON tree_images(tree_id);
CREATE INDEX IF NOT EXISTS idx_tree_images_student_id ON tree_images(student_id);
CREATE INDEX IF NOT EXISTS idx_tree_images_upload_date ON tree_images(upload_date);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_request_id ON approval_workflows(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_approver ON approval_workflows(current_approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_status ON approval_workflows(status);

-- Add proper hierarchy constraints to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_class VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES users(id);

-- Update existing tables to support proper hierarchy
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS assigned_approver_id UUID REFERENCES users(id);
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS approval_level INTEGER DEFAULT 1;

-- Add tree selection and planting workflow
CREATE TABLE IF NOT EXISTS tree_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tree_id UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  selection_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  planting_instructions TEXT,
  is_planted BOOLEAN DEFAULT FALSE,
  planting_date TIMESTAMP WITH TIME ZONE,
  planting_image_id UUID REFERENCES tree_images(id),
  status VARCHAR(50) DEFAULT 'selected' CHECK (status IN ('selected', 'planted', 'monitoring', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, tree_id)
);

-- Add indexes for tree selections
CREATE INDEX IF NOT EXISTS idx_tree_selections_student_id ON tree_selections(student_id);
CREATE INDEX IF NOT EXISTS idx_tree_selections_tree_id ON tree_selections(tree_id);
CREATE INDEX IF NOT EXISTS idx_tree_selections_status ON tree_selections(status);

-- Add file upload configuration table
CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  upload_type VARCHAR(50) NOT NULL CHECK (upload_type IN ('tree_image', 'profile_image', 'document')),
  related_entity_id UUID, -- Can reference tree_id, user_id, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for file uploads
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploaded_by ON file_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_uploads_type ON file_uploads(upload_type);
CREATE INDEX IF NOT EXISTS idx_file_uploads_entity ON file_uploads(related_entity_id);

-- Insert default planting instructions
INSERT INTO tree_selections (id, student_id, tree_id, planting_instructions, status) 
SELECT 
  gen_random_uuid(),
  t.assigned_student_id,
  t.id,
  'Please follow these steps: 1. Dig a hole twice the width of the root ball. 2. Place the tree in the hole. 3. Backfill with soil. 4. Water thoroughly. 5. Take a photo and upload it to the portal.',
  'selected'
FROM trees t 
WHERE t.assigned_student_id IS NOT NULL
ON CONFLICT (student_id, tree_id) DO NOTHING;
