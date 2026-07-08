CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS account_wallets (
  id VARCHAR(64) PRIMARY KEY,
  account_id VARCHAR(64) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  chain VARCHAR(20) NOT NULL,
  address VARCHAR(100) NOT NULL,
  encrypted_private_key TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  label VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, address)
);

CREATE INDEX IF NOT EXISTS idx_account_wallets_account_id ON account_wallets(account_id);
CREATE INDEX IF NOT EXISTS idx_account_wallets_address ON account_wallets(address);
