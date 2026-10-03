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

ALTER TABLE scheduled_campaigns ADD COLUMN IF NOT EXISTS request_id uuid;
ALTER TABLE scheduled_campaigns ADD COLUMN IF NOT EXISTS request_hash text;
ALTER TABLE scheduled_campaigns ADD COLUMN IF NOT EXISTS cancel_requested boolean NOT NULL DEFAULT false;
ALTER TABLE scheduled_campaigns ADD COLUMN IF NOT EXISTS progress_migrated boolean NOT NULL DEFAULT false;
ALTER TABLE scheduled_campaigns ALTER COLUMN progress_migrated SET DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS scheduled_campaigns_request_idx
  ON scheduled_campaigns (user_email, request_id);

CREATE TABLE IF NOT EXISTS campaign_deliveries (
  campaign_id text NOT NULL REFERENCES scheduled_campaigns(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL CHECK (status IN ('sending', 'success', 'error', 'skipped', 'unknown')),
  message_id text,
  error text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, email)
);

CREATE TABLE IF NOT EXISTS delivery_worker_health (
  id integer PRIMARY KEY CHECK (id = 1),
  last_tick timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_audiences (
  id uuid PRIMARY KEY,
  user_email text NOT NULL,
  name varchar(100) NOT NULL,
  filters jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saved_audiences_user_idx ON saved_audiences(user_email);

CREATE TABLE IF NOT EXISTS campaign_reviews (
  id uuid PRIMARY KEY,
  team_id text NOT NULL,
  submitter_email text NOT NULL,
  snapshot jsonb NOT NULL,
  snapshot_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'queued')),
  reviewed_by text,
  reviewed_at timestamptz,
  queued_campaign_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campaign_reviews_team_idx ON campaign_reviews(team_id, created_at DESC);
CREATE TABLE IF NOT EXISTS campaign_review_comments (
  id uuid PRIMARY KEY,
  review_id uuid NOT NULL REFERENCES campaign_reviews(id) ON DELETE CASCADE,
  author_email text NOT NULL,
  content varchar(2000) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE scheduled_campaigns ADD COLUMN IF NOT EXISTS team_id text;
ALTER TABLE scheduled_campaigns ADD COLUMN IF NOT EXISTS review_id uuid;
