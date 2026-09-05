CREATE TABLE IF NOT EXISTS scheduled_campaigns (
  id text PRIMARY KEY,
  subject varchar(500) NOT NULL,
  content text NOT NULL,
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  scheduled_at timestamptz NOT NULL,
  timezone varchar(100),
  status varchar(20) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'processing', 'sent', 'partial', 'failed', 'cancelled')),
  user_email varchar(255) NOT NULL,
  campaign_id text NOT NULL UNIQUE,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  csv_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  cc jsonb NOT NULL DEFAULT '[]'::jsonb,
  bcc jsonb NOT NULL DEFAULT '[]'::jsonb,
  tracking_enabled boolean NOT NULL DEFAULT true,
  is_marketing boolean NOT NULL DEFAULT false,
  has_personalized_attachments boolean NOT NULL DEFAULT false,
  personalized_attachment_column varchar(255),
  sent integer NOT NULL DEFAULT 0 CHECK (sent >= 0),
  failed integer NOT NULL DEFAULT 0 CHECK (failed >= 0),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  locked_at timestamptz,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduled_campaigns_due_idx
  ON scheduled_campaigns (scheduled_at)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS scheduled_campaigns_user_idx
  ON scheduled_campaigns (user_email, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS scheduled_campaigns_stale_idx
  ON scheduled_campaigns (locked_at)
  WHERE status = 'processing';

CREATE TABLE IF NOT EXISTS oauth_tokens (
  user_email varchar(255) PRIMARY KEY,
  refresh_token text NOT NULL,
  scope text NOT NULL DEFAULT '',
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
