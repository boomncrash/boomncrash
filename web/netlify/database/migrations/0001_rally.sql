ALTER TABLE "bounties" ADD COLUMN IF NOT EXISTS "is_rally" boolean DEFAULT false NOT NULL;
ALTER TABLE "bounties" ADD COLUMN IF NOT EXISTS "rally_funded" numeric(18, 6) DEFAULT 0;
ALTER TABLE "bounties" ADD COLUMN IF NOT EXISTS "creator_seed" numeric(18, 6);
ALTER TABLE "bounties" ADD COLUMN IF NOT EXISTS "backer_count" integer DEFAULT 0 NOT NULL;

CREATE TABLE IF NOT EXISTS "rally_contributions" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "bounty_id" varchar(64) NOT NULL REFERENCES "bounties"("id"),
  "backer_address" varchar(100) NOT NULL,
  "amount_usdc" numeric(18, 6) NOT NULL,
  "chain" varchar(20) NOT NULL,
  "tx_hash" varchar(100),
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_rally_contributions_bounty" ON "rally_contributions" ("bounty_id");
