-- Migration: Create Contact Messages Table
-- Date: 2025-01-30
-- Description: Create table for storing contact form submissions and support messages

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    subject VARCHAR(500) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('technical', 'tree-monitoring', 'account', 'general', 'feedback', 'emergency')),
    message TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'resolved', 'closed')),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_role VARCHAR(50),
    admin_response TEXT,
    responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_category ON contact_messages(category);
CREATE INDEX IF NOT EXISTS idx_contact_messages_priority ON contact_messages(priority);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_user_id ON contact_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON contact_messages(email);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contact_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contact_messages_updated_at
    BEFORE UPDATE ON contact_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_messages_updated_at();

-- Add comments for documentation
COMMENT ON TABLE contact_messages IS 'Stores contact form submissions and support messages from users';
COMMENT ON COLUMN contact_messages.id IS 'Unique identifier for the contact message';
COMMENT ON COLUMN contact_messages.name IS 'Full name of the person sending the message';
COMMENT ON COLUMN contact_messages.email IS 'Email address of the sender';
COMMENT ON COLUMN contact_messages.phone IS 'Optional phone number of the sender';
COMMENT ON COLUMN contact_messages.subject IS 'Subject line of the message';
COMMENT ON COLUMN contact_messages.category IS 'Category of the inquiry (technical, tree-monitoring, account, general, feedback, emergency)';
COMMENT ON COLUMN contact_messages.message IS 'The actual message content';
COMMENT ON COLUMN contact_messages.priority IS 'Priority level of the message (low, medium, high)';
COMMENT ON COLUMN contact_messages.status IS 'Current status of the message (pending, in-progress, resolved, closed)';
COMMENT ON COLUMN contact_messages.user_id IS 'Reference to the user who sent the message (if logged in)';
COMMENT ON COLUMN contact_messages.user_role IS 'Role of the user who sent the message';
COMMENT ON COLUMN contact_messages.admin_response IS 'Response from admin/support team';
COMMENT ON COLUMN contact_messages.responded_by IS 'ID of the admin who responded';
COMMENT ON COLUMN contact_messages.responded_at IS 'Timestamp when the response was sent';
COMMENT ON COLUMN contact_messages.created_at IS 'Timestamp when the message was created';
COMMENT ON COLUMN contact_messages.updated_at IS 'Timestamp when the message was last updated';

-- Insert some sample data for testing (optional)
-- INSERT INTO contact_messages (name, email, subject, category, message, priority, status) VALUES
-- ('John Doe', 'john.doe@example.com', 'Tree monitoring issue', 'tree-monitoring', 'My tree seems to be showing signs of disease. Can someone help?', 'high', 'pending'),
-- ('Jane Smith', 'jane.smith@example.com', 'Account access problem', 'account', 'I cannot log into my account. Please help.', 'medium', 'pending'),
-- ('Bob Johnson', 'bob.johnson@example.com', 'Feature suggestion', 'feedback', 'It would be great to have a mobile app for tree monitoring.', 'low', 'pending');

-- Migration completed successfully
SELECT 'Contact messages table created successfully!' as migration_status;
