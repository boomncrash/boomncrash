ALTER TABLE "email_preferences" ADD COLUMN IF NOT EXISTS "unsubscribe_token" varchar(64);

CREATE TABLE IF NOT EXISTS "disputes" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "bounty_id" varchar(64) NOT NULL REFERENCES "bounties"("id"),
  "submission_id" varchar(64) NOT NULL,
  "filer_address" varchar(100) NOT NULL,
  "reason" text NOT NULL,
  "status" varchar(20) DEFAULT 'open' NOT NULL,
  "resolution_notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "disputes_bounty_idx" ON "disputes" ("bounty_id");
CREATE INDEX IF NOT EXISTS "disputes_status_idx" ON "disputes" ("status");
