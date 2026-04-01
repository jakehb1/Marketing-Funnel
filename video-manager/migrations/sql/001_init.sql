-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL UNIQUE,
  original_name VARCHAR(255),
  funnel VARCHAR(100) DEFAULT 'general',
  status VARCHAR(50) DEFAULT 'uploading',
  duration INTEGER,
  size BIGINT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  text TEXT,
  language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create clips table
CREATE TABLE IF NOT EXISTS clips (
  id UUID PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  start_time DECIMAL(10, 2) NOT NULL,
  end_time DECIMAL(10, 2) NOT NULL,
  purpose VARCHAR(255),
  filename VARCHAR(255) NOT NULL UNIQUE,
  duration DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_videos_funnel ON videos(funnel);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_uploaded_at ON videos(uploaded_at DESC);
CREATE INDEX idx_transcripts_video_id ON transcripts(video_id);
CREATE INDEX idx_transcripts_language ON transcripts(language);
CREATE INDEX idx_clips_video_id ON clips(video_id);
CREATE INDEX idx_clips_purpose ON clips(purpose);
