CREATE TABLE IF NOT EXISTS "category_subscriptions" (
  "wallet_address" varchar(100) NOT NULL,
  "category" varchar(50) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("wallet_address", "category")
);

CREATE INDEX IF NOT EXISTS "category_subscriptions_category_idx" ON "category_subscriptions" ("category");
