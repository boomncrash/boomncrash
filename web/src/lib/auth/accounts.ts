import { and, eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "../../../db";
import { accounts, accountWallets } from "../../../db/schema";
import { generateId } from "@/lib/utils";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  encryptSecret,
  generateBaseWallet,
  generateSolanaWallet,
} from "@/lib/auth/wallet-vault";
import type { SessionPayload, SessionWallet } from "@/lib/auth/session";
import { upsertEmailPreferences } from "@/lib/repository";

export interface AccountRecord {
  id: string;
  email: string;
  displayName?: string | null;
  wallets: SessionWallet[];
}

function rowToWallet(row: typeof accountWallets.$inferSelect): SessionWallet {
  return {
    id: row.id,
    chain: row.chain as "base" | "solana",
    address: row.address,
    isPrimary: row.isPrimary,
    label: row.label,
    hasPrivateKey: !!row.encryptedPrivateKey,
  };
}

async function loadAccountWallets(accountId: string): Promise<SessionWallet[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(accountWallets)
    .where(eq(accountWallets.accountId, accountId));
  return rows.map(rowToWallet);
}

export async function getAccountByEmail(email: string) {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.email, email.trim().toLowerCase()))
    .limit(1);
  if (!row) return null;
  const wallets = await loadAccountWallets(row.id);
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    displayName: row.displayName,
    wallets,
  };
}

export async function getAccountById(accountId: string): Promise<AccountRecord | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const [row] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    wallets: await loadAccountWallets(row.id),
  };
}

async function createEmbeddedWallet(
  accountId: string,
  chain: "base" | "solana",
  isPrimary: boolean,
  label?: string
) {
  const generated = chain === "base" ? generateBaseWallet() : generateSolanaWallet();
  const id = generateId();
  const db = getDb();
  await db.insert(accountWallets).values({
    id,
    accountId,
    chain,
    address: generated.address,
    encryptedPrivateKey: encryptSecret(generated.privateKey),
    isPrimary,
    label: label ?? null,
  });
  return {
    id,
    chain,
    address: generated.address,
    isPrimary,
    label: label ?? null,
    hasPrivateKey: true,
  } satisfies SessionWallet;
}

export async function createAccount(email: string, password: string): Promise<SessionPayload> {
  if (!isDatabaseConfigured()) {
    throw new Error("Database not configured. Accounts require Netlify Database.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await getAccountByEmail(normalizedEmail);
  if (existing) throw new Error("An account with this email already exists.");

  const accountId = generateId();
  const passwordHash = await hashPassword(password);
  const db = getDb();

  await db.insert(accounts).values({
    id: accountId,
    email: normalizedEmail,
    passwordHash,
  });

  const baseWallet = await createEmbeddedWallet(accountId, "base", true, "Primary Base");
  const solanaWallet = await createEmbeddedWallet(accountId, "solana", true, "Primary Solana");

  await upsertEmailPreferences({
    walletAddress: baseWallet.address,
    email: normalizedEmail,
    enabled: true,
    emailVerified: true,
    notifySubmissions: true,
    notifyReviews: true,
    notifyPayouts: true,
    notifyRally: true,
    notifyNewBounties: true,
  });

  return {
    accountId,
    email: normalizedEmail,
    wallets: [baseWallet, solanaWallet],
  };
}

export async function loginAccount(email: string, password: string): Promise<SessionPayload> {
  const account = await getAccountByEmail(email.trim().toLowerCase());
  if (!account) throw new Error("Invalid email or password.");

  const valid = await verifyPassword(password, account.passwordHash);
  if (!valid) throw new Error("Invalid email or password.");

  return {
    accountId: account.id,
    email: account.email,
    wallets: account.wallets,
  };
}

export async function addEmbeddedWallet(
  accountId: string,
  chain: "base" | "solana",
  label?: string
): Promise<SessionWallet> {
  if (!isDatabaseConfigured()) throw new Error("Database not configured.");
  const wallet = await createEmbeddedWallet(accountId, chain, false, label ?? `Extra ${chain}`);
  return wallet;
}

export async function linkExternalWallet(
  accountId: string,
  chain: "base" | "solana",
  address: string,
  label?: string
): Promise<SessionWallet> {
  if (!isDatabaseConfigured()) throw new Error("Database not configured.");
  const id = generateId();
  const db = getDb();
  await db.insert(accountWallets).values({
    id,
    accountId,
    chain,
    address,
    encryptedPrivateKey: null,
    isPrimary: false,
    label: label ?? "Linked wallet",
  });
  return {
    id,
    chain,
    address,
    isPrimary: false,
    label: label ?? "Linked wallet",
    hasPrivateKey: false,
  };
}

export async function setPrimaryWallet(
  accountId: string,
  walletId: string
): Promise<SessionWallet[]> {
  const db = getDb();
  const [target] = await db
    .select()
    .from(accountWallets)
    .where(and(eq(accountWallets.id, walletId), eq(accountWallets.accountId, accountId)))
    .limit(1);
  if (!target) throw new Error("Wallet not found.");

  await db
    .update(accountWallets)
    .set({ isPrimary: false })
    .where(and(eq(accountWallets.accountId, accountId), eq(accountWallets.chain, target.chain)));

  await db
    .update(accountWallets)
    .set({ isPrimary: true })
    .where(eq(accountWallets.id, walletId));

  return loadAccountWallets(accountId);
}

export async function getWalletPrivateKey(
  accountId: string,
  walletId: string
): Promise<{ chain: "base" | "solana"; address: string; privateKey: string }> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(accountWallets)
    .where(and(eq(accountWallets.id, walletId), eq(accountWallets.accountId, accountId)))
    .limit(1);
  if (!row?.encryptedPrivateKey) throw new Error("Wallet not found or not signable.");
  const { decryptSecret } = await import("@/lib/auth/wallet-vault");
  return {
    chain: row.chain as "base" | "solana",
    address: row.address,
    privateKey: decryptSecret(row.encryptedPrivateKey),
  };
}

export async function getPrimaryWalletPrivateKey(
  accountId: string,
  chain: "base" | "solana"
): Promise<{ address: string; privateKey: string; walletId: string }> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(accountWallets)
    .where(
      and(
        eq(accountWallets.accountId, accountId),
        eq(accountWallets.chain, chain),
        eq(accountWallets.isPrimary, true)
      )
    )
    .limit(1);
  if (!row?.encryptedPrivateKey) throw new Error("No signable primary wallet.");
  const { decryptSecret } = await import("@/lib/auth/wallet-vault");
  return {
    address: row.address,
    privateKey: decryptSecret(row.encryptedPrivateKey),
    walletId: row.id,
  };
}

export function accountToSession(account: AccountRecord): SessionPayload {
  return {
    accountId: account.id,
    email: account.email,
    wallets: account.wallets,
  };
}
