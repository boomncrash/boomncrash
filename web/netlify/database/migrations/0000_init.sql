CREATE TABLE IF NOT EXISTS "bounties" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "title" varchar(200) NOT NULL,
  "description" text NOT NULL,
  "deliverables" text NOT NULL,
  "category" varchar(50) NOT NULL,
  "chain" varchar(20) NOT NULL,
  "reward_usdc" numeric(18, 6) NOT NULL,
  "status" varchar(30) DEFAULT 'pending_moderation' NOT NULL,
  "creator_address" varchar(100) NOT NULL,
  "escrow_address" varchar(100),
  "deadline" timestamptz NOT NULL,
  "tx_hash" varchar(100),
  "submission_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "submissions" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "bounty_id" varchar(64) NOT NULL REFERENCES "bounties"("id"),
  "hunter_address" varchar(100) NOT NULL,
  "proof_url" text NOT NULL,
  "proof_description" text,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "review_notes" text,
  "payout_tx_hash" varchar(100),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_bounties_status" ON "bounties" ("status");
CREATE INDEX IF NOT EXISTS "idx_bounties_chain" ON "bounties" ("chain");
CREATE INDEX IF NOT EXISTS "idx_bounties_creator" ON "bounties" ("creator_address");
CREATE INDEX IF NOT EXISTS "idx_submissions_bounty" ON "submissions" ("bounty_id");
CREATE INDEX IF NOT EXISTS "idx_submissions_hunter" ON "submissions" ("hunter_address");
