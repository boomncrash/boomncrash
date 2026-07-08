import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Keypair } from "@solana/web3.js";

function getVaultSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set (min 32 characters) for wallet encryption.");
  }
  return secret;
}

function deriveKey(salt: Buffer): Buffer {
  return scryptSync(getVaultSecret(), salt, 32);
}

export function encryptSecret(value: string): string {
  const salt = randomBytes(16);
  const key = deriveKey(salt);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const salt = buf.subarray(0, 16);
  const iv = buf.subarray(16, 28);
  const tag = buf.subarray(28, 44);
  const data = buf.subarray(44);
  const key = deriveKey(salt);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function generateBaseWallet(): { address: string; privateKey: string } {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { address: account.address, privateKey };
}

export function generateSolanaWallet(): { address: string; privateKey: string } {
  const keypair = Keypair.generate();
  return {
    address: keypair.publicKey.toBase58(),
    privateKey: Buffer.from(keypair.secretKey).toString("base64"),
  };
}

export function solanaKeypairFromStoredKey(privateKey: string): Keypair {
  return Keypair.fromSecretKey(Buffer.from(privateKey, "base64"));
}
