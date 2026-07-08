-- Bountly Database Schema (Netlify Database / Postgres)
-- Run migrations when DATABASE_URL is configured

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_addresses TEXT[] NOT NULL DEFAULT '{}',
  display_name VARCHAR(100),
  reputation_score INTEGER NOT NULL DEFAULT 0,
  completed_bounties INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bounties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  deliverables TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('social', 'content', 'product_testing')),
  chain VARCHAR(20) NOT NULL CHECK (chain IN ('base', 'solana', 'arc')),
  reward_usdc DECIMAL(18, 6) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending_moderation',
  creator_address VARCHAR(100) NOT NULL,
  escrow_address VARCHAR(100),
  deadline TIMESTAMPTZ NOT NULL,
  tx_hash VARCHAR(100),
  submission_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id UUID NOT NULL REFERENCES bounties(id),
  hunter_address VARCHAR(100) NOT NULL,
  proof_url TEXT NOT NULL,
  proof_description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  review_notes TEXT,
  payout_tx_hash VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id UUID REFERENCES bounties(id),
  submission_id UUID REFERENCES submissions(id),
  tx_hash VARCHAR(100) NOT NULL,
  chain VARCHAR(20) NOT NULL,
  amount_usdc DECIMAL(18, 6) NOT NULL,
  fee_usdc DECIMAL(18, 6) NOT NULL DEFAULT 0,
  type VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  reviewer_address VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bounties_status ON bounties(status);
CREATE INDEX idx_bounties_chain ON bounties(chain);
CREATE INDEX idx_bounties_creator ON bounties(creator_address);
CREATE INDEX idx_submissions_bounty ON submissions(bounty_id);
CREATE INDEX idx_submissions_hunter ON submissions(hunter_address);
