-- Agent-related tables for orchestration

-- Agent API Keys
CREATE TABLE IF NOT EXISTS agent_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name VARCHAR(50) NOT NULL UNIQUE,
  api_key VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked'))
);

-- User funnel state tracking
CREATE TABLE IF NOT EXISTS user_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  funnel VARCHAR(50) NOT NULL CHECK (funnel IN ('patient', 'healer', 'untrained', 'referral', 'owned')),
  current_stage VARCHAR(100) NOT NULL,
  entered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_action_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'churned')),
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, funnel)
);

-- Agent action logs (audit trail)
CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name VARCHAR(50) NOT NULL,
  user_id VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) CHECK (action_type IN ('email', 'sms', 'match', 'state_update', 'query', 'conversion', 'other')),
  result VARCHAR(50) DEFAULT 'success' CHECK (result IN ('success', 'failed', 'partial')),
  request_id VARCHAR(255),
  details JSONB,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Email/SMS templates (approved by Charlie)
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('email', 'sms')),
  name VARCHAR(255) NOT NULL,
  funnel VARCHAR(50),
  stage VARCHAR(100),
  subject VARCHAR(255),
  content TEXT NOT NULL,
  approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  rejection_notes TEXT,
  variables JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Content assets (videos, transcripts, images, copy)
CREATE TABLE IF NOT EXISTS marketing_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('video', 'transcript', 'image', 'copy', 'landing_page')),
  funnel VARCHAR(50),
  stage VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  content_url VARCHAR(500),
  content_text TEXT,
  approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approval_id UUID REFERENCES approvals(id),
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Healer profiles (for matching)
CREATE TABLE IF NOT EXISTS healers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  experience_level VARCHAR(50) CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  specialties JSONB, -- Array of specialties
  bio TEXT,
  rating DECIMAL(3,2),
  review_count INTEGER DEFAULT 0,
  availability_status VARCHAR(50) DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'unavailable')),
  service_area JSONB, -- Geographic area
  price_range JSONB, -- {min, max}
  calendar_url VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Patient-Healer matches
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id VARCHAR(255) NOT NULL,
  healer_id UUID NOT NULL REFERENCES healers(id),
  compatibility_score DECIMAL(5,2),
  match_reason TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  matched_at TIMESTAMP NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Conversion tracking
CREATE TABLE IF NOT EXISTS conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  funnel VARCHAR(50) NOT NULL,
  stage VARCHAR(100),
  conversion_type VARCHAR(100) NOT NULL CHECK (conversion_type IN ('match', 'booking', 'payment', 'retention')),
  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  trigger_agent VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Email sending logs (for tracking opens, clicks, bounces)
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  email_address VARCHAR(255) NOT NULL,
  template_id UUID REFERENCES templates(id),
  subject VARCHAR(255),
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'opened', 'clicked', 'bounced', 'complained')),
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  bounce_type VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- SMS sending logs
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  template_id UUID REFERENCES templates(id),
  message_text TEXT,
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'failed', 'delivered')),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  failure_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Funnel metrics (cached for performance)
CREATE TABLE IF NOT EXISTS funnel_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel VARCHAR(50) NOT NULL,
  stage VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  users_entered INTEGER DEFAULT 0,
  users_progressed INTEGER DEFAULT 0,
  users_churned INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(funnel, stage, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_states_user_funnel ON user_states(user_id, funnel);
CREATE INDEX IF NOT EXISTS idx_user_states_status ON user_states(status);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_user ON agent_logs(agent_name, user_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON agent_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_templates_approval ON templates(approval_status, funnel, stage);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_funnel_stage ON marketing_assets(funnel, stage, approval_status);
CREATE INDEX IF NOT EXISTS idx_healers_availability ON healers(availability_status);
CREATE INDEX IF NOT EXISTS idx_matches_patient_healer ON matches(patient_id, healer_id);
CREATE INDEX IF NOT EXISTS idx_conversions_user_funnel ON conversions(user_id, funnel);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_status ON email_logs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_user_status ON sms_logs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_funnel_metrics_funnel_date ON funnel_metrics(funnel, date);
