ALTER TABLE "email_preferences" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false NOT NULL;
ALTER TABLE "email_preferences" ADD COLUMN IF NOT EXISTS "verify_token" varchar(64);
ALTER TABLE "email_preferences" ADD COLUMN IF NOT EXISTS "verify_token_expires" timestamp with time zone;
ALTER TABLE "email_preferences" ADD COLUMN IF NOT EXISTS "notify_new_bounties" boolean DEFAULT true NOT NULL;
