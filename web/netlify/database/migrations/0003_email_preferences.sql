CREATE TABLE IF NOT EXISTS "email_preferences" (
  "wallet_address" varchar(100) PRIMARY KEY NOT NULL,
  "email" varchar(255) NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "notify_submissions" boolean DEFAULT true NOT NULL,
  "notify_reviews" boolean DEFAULT true NOT NULL,
  "notify_payouts" boolean DEFAULT true NOT NULL,
  "notify_rally" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "email_preferences_wallet_idx" ON "email_preferences" ("wallet_address");
