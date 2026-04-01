-- Create approvals table
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY,
  content_id UUID NOT NULL,
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('video', 'transcript', 'asset', 'clip')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_by VARCHAR(255),
  reviewed_by VARCHAR(255),
  review_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create approval_comments table
CREATE TABLE IF NOT EXISTS approval_comments (
  id UUID PRIMARY KEY,
  approval_id UUID NOT NULL REFERENCES approvals(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add approval_status column to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Add approval_id column to videos table for reference
ALTER TABLE videos ADD COLUMN IF NOT EXISTS approval_id UUID REFERENCES approvals(id);

-- Create indexes for approvals queries
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_content_id ON approvals(content_id);
CREATE INDEX IF NOT EXISTS idx_approvals_content_type ON approvals(content_type);
CREATE INDEX IF NOT EXISTS idx_approvals_submitted_by ON approvals(submitted_by);
CREATE INDEX IF NOT EXISTS idx_approvals_reviewed_by ON approvals(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_approvals_created_at ON approvals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_comments_approval_id ON approval_comments(approval_id);
CREATE INDEX IF NOT EXISTS idx_videos_approval_status ON videos(approval_status);
