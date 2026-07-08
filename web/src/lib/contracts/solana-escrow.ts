import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { getActiveChain, getSolanaExplorerUrl as buildExplorerUrl } from "@/lib/chain-config";

const CREATE_BOUNTY_DISCRIMINATOR = Buffer.from([122, 90, 14, 143, 8, 125, 200, 2]);
const CREATE_RALLY_DISCRIMINATOR = Buffer.from([161, 35, 34, 5, 167, 186, 51, 141]);
const CONTRIBUTE_RALLY_DISCRIMINATOR = Buffer.from([67, 100, 64, 13, 1, 185, 69, 124]);
const APPROVE_AND_PAY_DISCRIMINATOR = Buffer.from([17, 171, 252, 175, 75, 86, 76, 96]);
const SUBMIT_DISCRIMINATOR = Buffer.from([0x58, 0xa6, 0x66, 0xb5, 0xa2, 0x7f, 0xaa, 0x30]);
const MARK_DISPUTED_DISCRIMINATOR = Buffer.from([0x88, 0x56, 0x98, 0x78, 0x03, 0x15, 0xdf, 0xfb]);

function encodeCreateBountyArgs(bountyId: string, reward: bigint, deadline: bigint): Buffer {
  const idBytes = Buffer.from(bountyId, "utf8");
  const buf = Buffer.alloc(4 + idBytes.length + 8 + 8);
  let offset = 0;
  buf.writeUInt32LE(idBytes.length, offset);
  offset += 4;
  idBytes.copy(buf, offset);
  offset += idBytes.length;
  buf.writeBigUInt64LE(reward, offset);
  offset += 8;
  buf.writeBigInt64LE(deadline, offset);
  return buf;
}

function encodeCreateRallyArgs(
  bountyId: string,
  targetReward: bigint,
  creatorSeed: bigint,
  deadline: bigint
): Buffer {
  const idBytes = Buffer.from(bountyId, "utf8");
  const buf = Buffer.alloc(4 + idBytes.length + 8 + 8 + 8);
  let offset = 0;
  buf.writeUInt32LE(idBytes.length, offset);
  offset += 4;
  idBytes.copy(buf, offset);
  offset += idBytes.length;
  buf.writeBigUInt64LE(targetReward, offset);
  offset += 8;
  buf.writeBigUInt64LE(creatorSeed, offset);
  offset += 8;
  buf.writeBigInt64LE(deadline, offset);
  return buf;
}

function encodeU64Arg(value: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(value);
  return buf;
}

export function getSolanaProgramId(): PublicKey | null {
  const id = process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID;
  if (!id || id.length < 32) return null;
  try {
    return new PublicKey(id);
  } catch {
    return null;
  }
}

export function isSolanaEscrowConfigured(): boolean {
  return getSolanaProgramId() !== null;
}

export function getSolanaUsdcMint(): PublicKey {
  const chain = getActiveChain("solana");
  return new PublicKey(chain.usdcMint!);
}

export function getSolanaExplorerUrl(path: string): string {
  return buildExplorerUrl(path);
}

export function deriveEscrowPda(programId: PublicKey, bountyId: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), Buffer.from(bountyId, "utf8")],
    programId
  )[0];
}

export function deriveFeeVaultPda(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("fee_vault")], programId)[0];
}

export function usdcToLamports(amount: number): bigint {
  return BigInt(Math.round(amount * 1_000_000));
}

async function sendEscrowTx(
  connection: Connection,
  creator: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  escrow: PublicKey,
  escrowUsdc: PublicKey,
  creatorUsdc: PublicKey,
  usdcMint: PublicKey,
  data: Buffer
): Promise<string> {
  const programId = getSolanaProgramId();
  if (!programId) throw new Error("Solana program not configured");

  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: escrow, isSigner: false, isWritable: true },
      { pubkey: escrowUsdc, isSigner: false, isWritable: true },
      { pubkey: creatorUsdc, isSigner: false, isWritable: true },
      { pubkey: usdcMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const tx = new Transaction();
  const escrowAtaInfo = await connection.getAccountInfo(escrowUsdc);
  if (!escrowAtaInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(creator, escrowUsdc, escrow, usdcMint)
    );
  }
  tx.add(ix);
  tx.feePayer = creator;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  const signed = await signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(sig, "confirmed");
  return sig;
}

export async function createSolanaEscrow(params: {
  connection: Connection;
  creator: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  bountyId: string;
  rewardUsdc: number;
  deadlineIso: string;
}): Promise<{ escrowAddress: string; txSignature: string }> {
  const programId = getSolanaProgramId()!;
  const usdcMint = getSolanaUsdcMint();
  const escrow = deriveEscrowPda(programId, params.bountyId);
  const creatorUsdc = getAssociatedTokenAddressSync(usdcMint, params.creator);
  const escrowUsdc = getAssociatedTokenAddressSync(usdcMint, escrow, true);

  const reward = usdcToLamports(params.rewardUsdc);
  const deadline = BigInt(Math.floor(new Date(params.deadlineIso).getTime() / 1000));

  const data = Buffer.concat([
    CREATE_BOUNTY_DISCRIMINATOR,
    encodeCreateBountyArgs(params.bountyId, reward, deadline),
  ]);

  const txSignature = await sendEscrowTx(
    params.connection,
    params.creator,
    params.signTransaction,
    escrow,
    escrowUsdc,
    creatorUsdc,
    usdcMint,
    data
  );

  return { escrowAddress: escrow.toBase58(), txSignature };
}

export async function createSolanaRally(params: {
  connection: Connection;
  creator: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  bountyId: string;
  targetUsdc: number;
  seedUsdc: number;
  deadlineIso: string;
}): Promise<{ escrowAddress: string; txSignature: string }> {
  const programId = getSolanaProgramId()!;
  const usdcMint = getSolanaUsdcMint();
  const escrow = deriveEscrowPda(programId, params.bountyId);
  const creatorUsdc = getAssociatedTokenAddressSync(usdcMint, params.creator);
  const escrowUsdc = getAssociatedTokenAddressSync(usdcMint, escrow, true);

  const target = usdcToLamports(params.targetUsdc);
  const seed = usdcToLamports(params.seedUsdc);
  const deadline = BigInt(Math.floor(new Date(params.deadlineIso).getTime() / 1000));

  const data = Buffer.concat([
    CREATE_RALLY_DISCRIMINATOR,
    encodeCreateRallyArgs(params.bountyId, target, seed, deadline),
  ]);

  const txSignature = await sendEscrowTx(
    params.connection,
    params.creator,
    params.signTransaction,
    escrow,
    escrowUsdc,
    creatorUsdc,
    usdcMint,
    data
  );

  return { escrowAddress: escrow.toBase58(), txSignature };
}

export async function contributeSolanaRally(params: {
  connection: Connection;
  backer: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  bountyId: string;
  amountUsdc: number;
}): Promise<string> {
  const programId = getSolanaProgramId()!;
  const usdcMint = getSolanaUsdcMint();
  const escrow = deriveEscrowPda(programId, params.bountyId);
  const escrowUsdc = getAssociatedTokenAddressSync(usdcMint, escrow, true);
  const backerUsdc = getAssociatedTokenAddressSync(usdcMint, params.backer);

  const amount = usdcToLamports(params.amountUsdc);
  const data = Buffer.concat([CONTRIBUTE_RALLY_DISCRIMINATOR, encodeU64Arg(amount)]);

  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: params.backer, isSigner: true, isWritable: true },
      { pubkey: escrow, isSigner: false, isWritable: true },
      { pubkey: escrowUsdc, isSigner: false, isWritable: true },
      { pubkey: backerUsdc, isSigner: false, isWritable: true },
      { pubkey: usdcMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = params.backer;
  tx.recentBlockhash = (await params.connection.getLatestBlockhash()).blockhash;

  const signed = await params.signTransaction(tx);
  const sig = await params.connection.sendRawTransaction(signed.serialize());
  await params.connection.confirmTransaction(sig, "confirmed");
  return sig;
}

export async function approveSolanaPayout(params: {
  connection: Connection;
  creator: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  bountyId: string;
  hunter: PublicKey;
}): Promise<string> {
  const programId = getSolanaProgramId()!;
  const usdcMint = getSolanaUsdcMint();
  const escrow = deriveEscrowPda(programId, params.bountyId);
  const feeVault = deriveFeeVaultPda(programId);
  const escrowUsdc = getAssociatedTokenAddressSync(usdcMint, escrow, true);
  const hunterUsdc = getAssociatedTokenAddressSync(usdcMint, params.hunter);
  const feeVaultUsdc = getAssociatedTokenAddressSync(usdcMint, feeVault, true);

  const data = Buffer.concat([APPROVE_AND_PAY_DISCRIMINATOR, params.hunter.toBuffer()]);

  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: params.creator, isSigner: true, isWritable: true },
      { pubkey: escrow, isSigner: false, isWritable: true },
      { pubkey: escrowUsdc, isSigner: false, isWritable: true },
      { pubkey: params.hunter, isSigner: false, isWritable: false },
      { pubkey: hunterUsdc, isSigner: false, isWritable: true },
      { pubkey: feeVaultUsdc, isSigner: false, isWritable: true },
      { pubkey: feeVault, isSigner: false, isWritable: false },
      { pubkey: usdcMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = params.creator;
  tx.recentBlockhash = (await params.connection.getLatestBlockhash()).blockhash;

  const signed = await params.signTransaction(tx);
  const sig = await params.connection.sendRawTransaction(signed.serialize());
  await params.connection.confirmTransaction(sig, "confirmed");
  return sig;
}

export async function submitSolanaEscrow(params: {
  connection: Connection;
  creator: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  bountyId: string;
  hunter: PublicKey;
}): Promise<string> {
  const programId = getSolanaProgramId()!;
  const escrow = deriveEscrowPda(programId, params.bountyId);
  const data = Buffer.concat([SUBMIT_DISCRIMINATOR, params.hunter.toBuffer()]);

  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: params.creator, isSigner: true, isWritable: true },
      { pubkey: escrow, isSigner: false, isWritable: true },
    ],
    data,
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = params.creator;
  tx.recentBlockhash = (await params.connection.getLatestBlockhash()).blockhash;

  const signed = await params.signTransaction(tx);
  const sig = await params.connection.sendRawTransaction(signed.serialize());
  await params.connection.confirmTransaction(sig, "confirmed");
  return sig;
}

export async function markSolanaEscrowDisputed(params: {
  connection: Connection;
  creator: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  bountyId: string;
}): Promise<string> {
  const programId = getSolanaProgramId()!;
  const escrow = deriveEscrowPda(programId, params.bountyId);

  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: params.creator, isSigner: true, isWritable: true },
      { pubkey: escrow, isSigner: false, isWritable: true },
    ],
    data: MARK_DISPUTED_DISCRIMINATOR,
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = params.creator;
  tx.recentBlockhash = (await params.connection.getLatestBlockhash()).blockhash;

  const signed = await params.signTransaction(tx);
  const sig = await params.connection.sendRawTransaction(signed.serialize());
  await params.connection.confirmTransaction(sig, "confirmed");
  return sig;
}
