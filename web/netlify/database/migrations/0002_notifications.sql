CREATE TABLE IF NOT EXISTS "notifications" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "wallet_address" varchar(100) NOT NULL,
  "type" varchar(40) NOT NULL,
  "title" varchar(200) NOT NULL,
  "message" text NOT NULL,
  "link" varchar(300),
  "read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notifications_wallet_idx" ON "notifications" ("wallet_address");
CREATE INDEX IF NOT EXISTS "notifications_wallet_read_idx" ON "notifications" ("wallet_address", "read");
