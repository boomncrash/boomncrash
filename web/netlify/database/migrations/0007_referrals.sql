CREATE TABLE IF NOT EXISTS "referral_attributions" (
  "referee_wallet" varchar(100) PRIMARY KEY NOT NULL,
  "referrer_wallet" varchar(100) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "referral_referrer_idx" ON "referral_attributions" ("referrer_wallet");
