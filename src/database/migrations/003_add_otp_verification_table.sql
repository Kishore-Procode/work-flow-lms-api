-- Migration: Add OTP Verification System
-- Date: 2025-01-27
-- Description: Add comprehensive OTP verification system for user authentication workflows

-- Create OTP verification table
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL, -- email or phone number
  otp_hash VARCHAR(255) NOT NULL, -- hashed OTP for security
  type VARCHAR(10) NOT NULL CHECK (type IN ('email', 'sms')),
  purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('registration', 'login', 'password_reset', 'phone_verification', 'email_verification')),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- optional user reference
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_otp_verifications_identifier ON otp_verifications(identifier);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_purpose ON otp_verifications(purpose);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_expires_at ON otp_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_verified ON otp_verifications(verified);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_user_id ON otp_verifications(user_id);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_otp_verifications_identifier_purpose ON otp_verifications(identifier, purpose);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_active ON otp_verifications(identifier, purpose, verified, expires_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_otp_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_otp_verifications_updated_at
  BEFORE UPDATE ON otp_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_otp_verifications_updated_at();

-- Add phone number field to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Update existing users to have email_verified = true if they have logged in
UPDATE users SET email_verified = TRUE WHERE last_login IS NOT NULL;

-- Add batch management fields to support student batch system
CREATE TABLE IF NOT EXISTS student_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_year INTEGER NOT NULL, -- e.g., 2026 for "Batch 2026"
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  total_students INTEGER DEFAULT 0,
  enrolled_students INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(batch_year, department_id)
);

-- Create indexes for student batches
CREATE INDEX IF NOT EXISTS idx_student_batches_department_id ON student_batches(department_id);
CREATE INDEX IF NOT EXISTS idx_student_batches_batch_year ON student_batches(batch_year);

-- Add batch reference to users table for students
ALTER TABLE users ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES student_batches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_batch_id ON users(batch_id);

-- Add trigger to update student_batches updated_at timestamp
CREATE TRIGGER trigger_update_student_batches_updated_at
  BEFORE UPDATE ON student_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add additional fields for complete profile information
ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhar_number VARCHAR(12);
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS website_url VARCHAR(255);

-- Add SPOC (Single Point of Contact) fields for colleges
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS spoc_name VARCHAR(255);
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS spoc_email VARCHAR(255);
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS spoc_phone VARCHAR(20);
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS department_count INTEGER DEFAULT 0;

-- Add department management fields
ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE; -- for "Others" option

-- Create location hierarchy tables for cascading dropdowns
CREATE TABLE IF NOT EXISTS states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(10) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  state_id UUID NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, state_id)
);

CREATE TABLE IF NOT EXISTS pincodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL,
  area_name VARCHAR(255),
  district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(code, district_id)
);

-- Create indexes for location tables
CREATE INDEX IF NOT EXISTS idx_districts_state_id ON districts(state_id);
CREATE INDEX IF NOT EXISTS idx_pincodes_district_id ON pincodes(district_id);
CREATE INDEX IF NOT EXISTS idx_pincodes_code ON pincodes(code);

-- Insert sample Indian states (can be expanded)
INSERT INTO states (name, code) VALUES
  ('Tamil Nadu', 'TN'),
  ('Karnataka', 'KA'),
  ('Andhra Pradesh', 'AP'),
  ('Telangana', 'TS'),
  ('Kerala', 'KL'),
  ('Maharashtra', 'MH'),
  ('Gujarat', 'GJ'),
  ('Rajasthan', 'RJ'),
  ('Uttar Pradesh', 'UP'),
  ('West Bengal', 'WB')
ON CONFLICT (name) DO NOTHING;

-- Insert sample districts for Tamil Nadu (can be expanded)
INSERT INTO districts (name, state_id) 
SELECT 'Chennai', id FROM states WHERE code = 'TN'
UNION ALL
SELECT 'Coimbatore', id FROM states WHERE code = 'TN'
UNION ALL
SELECT 'Madurai', id FROM states WHERE code = 'TN'
UNION ALL
SELECT 'Tiruchirappalli', id FROM states WHERE code = 'TN'
UNION ALL
SELECT 'Salem', id FROM states WHERE code = 'TN'
UNION ALL
SELECT 'Tirunelveli', id FROM states WHERE code = 'TN'
UNION ALL
SELECT 'Vellore', id FROM states WHERE code = 'TN'
UNION ALL
SELECT 'Erode', id FROM states WHERE code = 'TN'
UNION ALL
SELECT 'Thanjavur', id FROM states WHERE code = 'TN'
UNION ALL
SELECT 'Kanchipuram', id FROM states WHERE code = 'TN'
ON CONFLICT (name, state_id) DO NOTHING;

-- Create CSV upload audit table for tracking bulk operations
CREATE TABLE IF NOT EXISTS csv_upload_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  upload_type VARCHAR(50) NOT NULL, -- 'students', 'colleges', 'departments'
  total_records INTEGER DEFAULT 0,
  successful_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  error_details JSONB,
  status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for CSV upload logs
CREATE INDEX IF NOT EXISTS idx_csv_upload_logs_uploaded_by ON csv_upload_logs(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_csv_upload_logs_upload_type ON csv_upload_logs(upload_type);
CREATE INDEX IF NOT EXISTS idx_csv_upload_logs_status ON csv_upload_logs(status);

-- Add registration number uniqueness constraint per department/batch
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_reg_number_unique 
ON users(roll_number, department_id, batch_id) 
WHERE roll_number IS NOT NULL AND department_id IS NOT NULL;

-- Add email domain validation for institutional emails
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_domain VARCHAR(100);

-- Create function to extract email domain
CREATE OR REPLACE FUNCTION extract_email_domain(email_address TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(SPLIT_PART(email_address, '@', 2));
END;
$$ LANGUAGE plpgsql;

-- Update existing users with email domains
UPDATE users SET email_domain = extract_email_domain(email) WHERE email_domain IS NULL;

-- Create trigger to automatically set email domain
CREATE OR REPLACE FUNCTION set_email_domain()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_domain = extract_email_domain(NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_email_domain
  BEFORE INSERT OR UPDATE OF email ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_email_domain();

-- Add comments for documentation
COMMENT ON TABLE otp_verifications IS 'Stores OTP verification records for user authentication workflows';
COMMENT ON TABLE student_batches IS 'Manages student batches by graduation year and department';
COMMENT ON TABLE states IS 'Indian states for address hierarchy';
COMMENT ON TABLE districts IS 'Districts within states for address hierarchy';
COMMENT ON TABLE pincodes IS 'Postal codes with area information';
COMMENT ON TABLE csv_upload_logs IS 'Audit trail for CSV bulk upload operations';

-- Migration completed successfully
SELECT 'OTP verification system and batch management tables created successfully!' as migration_status;
