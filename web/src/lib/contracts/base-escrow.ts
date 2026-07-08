import {
  createWalletClient,
  custom,
  decodeEventLog,
  parseUnits,
  type Address,
  type Hash,
} from "viem";
import { getActiveBaseAddress, getPrivyEthereumProvider } from "@/lib/auth/active-wallet";
import { createRpcPublicClient } from "@/lib/contracts/embedded-evm";
import { getBaseViemChain } from "@/lib/wallet-ethereum";
import { CHAINS } from "@/lib/constants";
import { bountyEscrowAbi, bountyFactoryAbi, erc20Abi } from "./abis";

const baseChain = CHAINS.base;

export function getFactoryAddress(): Address | null {
  const addr = process.env.NEXT_PUBLIC_BOUNTY_FACTORY_ADDRESS;
  if (!addr || !addr.startsWith("0x")) return null;
  return addr as Address;
}

export function getUsdcAddress(): Address {
  return (process.env.NEXT_PUBLIC_BASE_USDC_ADDRESS ??
    baseChain.usdcAddress!) as Address;
}

export function isEscrowConfigured(): boolean {
  return getFactoryAddress() !== null;
}

function requireBaseAddress(): Address {
  const address = getActiveBaseAddress();
  if (!address) throw new Error("Sign in to use your Base wallet.");
  return address;
}

export function getPublicClient() {
  return createRpcPublicClient();
}

export function getWalletClient() {
  const address = requireBaseAddress();
  return createWalletClient({
    account: address,
    chain: getBaseViemChain(),
    transport: custom(getPrivyEthereumProvider()),
  });
}

export function usdcToWei(amount: number): bigint {
  return parseUnits(amount.toString(), 6);
}

export async function ensureUsdcAllowance(
  owner: Address,
  amount: bigint,
  spender?: Address
): Promise<void> {
  const factory = spender ?? getFactoryAddress();
  if (!factory) throw new Error("Bounty factory not deployed");

  const publicClient = getPublicClient();
  const walletClient = getWalletClient();
  const usdc = getUsdcAddress();

  const allowance = await publicClient.readContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, factory],
  });

  if (allowance >= amount) return;

  const [account] = await walletClient.getAddresses();
  const hash = await walletClient.writeContract({
    account,
    address: usdc,
    abi: erc20Abi,
    functionName: "approve",
    args: [factory, amount],
  });

  await publicClient.waitForTransactionReceipt({ hash });
}

export async function createBaseEscrow(params: {
  bountyId: string;
  rewardUsdc: number;
  deadlineIso: string;
  creator: Address;
}): Promise<{ escrowAddress: Address; txHash: Hash }> {
  return createEscrowOnChain({
    ...params,
    mode: "bounty",
    seedUsdc: params.rewardUsdc,
  });
}

export async function createBaseRally(params: {
  bountyId: string;
  targetUsdc: number;
  seedUsdc: number;
  deadlineIso: string;
  creator: Address;
}): Promise<{ escrowAddress: Address; txHash: Hash }> {
  return createEscrowOnChain({
    bountyId: params.bountyId,
    rewardUsdc: params.targetUsdc,
    deadlineIso: params.deadlineIso,
    creator: params.creator,
    mode: "rally",
    seedUsdc: params.seedUsdc,
  });
}

export async function contributeBaseRally(params: {
  bountyId: string;
  amountUsdc: number;
  backer: Address;
}): Promise<Hash> {
  const factory = getFactoryAddress();
  if (!factory) throw new Error("Bounty factory not deployed");

  const amount = usdcToWei(params.amountUsdc);
  await ensureUsdcAllowance(params.backer, amount, factory);

  const publicClient = getPublicClient();
  const walletClient = getWalletClient();
  const [account] = await walletClient.getAddresses();

  const hash = await walletClient.writeContract({
    account,
    address: factory,
    abi: bountyFactoryAbi,
    functionName: "contributeToRally",
    args: [params.bountyId, amount],
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

async function createEscrowOnChain(params: {
  bountyId: string;
  rewardUsdc: number;
  deadlineIso: string;
  creator: Address;
  mode: "bounty" | "rally";
  seedUsdc: number;
}): Promise<{ escrowAddress: Address; txHash: Hash }> {
  const factory = getFactoryAddress();
  if (!factory) throw new Error("Bounty factory not deployed. Set NEXT_PUBLIC_BOUNTY_FACTORY_ADDRESS.");

  const seed = usdcToWei(params.seedUsdc);
  const target = usdcToWei(params.rewardUsdc);
  const deadline = BigInt(Math.floor(new Date(params.deadlineIso).getTime() / 1000));

  await ensureUsdcAllowance(params.creator, seed, factory);

  const publicClient = getPublicClient();
  const walletClient = getWalletClient();
  const [account] = await walletClient.getAddresses();

  const balance = await publicClient.readContract({
    address: getUsdcAddress(),
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [params.creator],
  });

  if (balance < seed) {
    throw new Error(
      "Insufficient USDC balance. Get testnet USDC from https://faucet.circle.com/"
    );
  }

  const hash =
    params.mode === "rally"
      ? await walletClient.writeContract({
          account,
          address: factory,
          abi: bountyFactoryAbi,
          functionName: "createRally",
          args: [params.bountyId, target, seed, deadline],
        })
      : await walletClient.writeContract({
          account,
          address: factory,
          abi: bountyFactoryAbi,
          functionName: "createBounty",
          args: [params.bountyId, target, deadline],
        });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  let escrowAddress: Address | null = null;
  const eventName = params.mode === "rally" ? "RallyCreated" : "BountyCreated";

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: bountyFactoryAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === eventName) {
        escrowAddress = (decoded.args as { escrow: Address }).escrow;
        break;
      }
    } catch {
      // not our event
    }
  }

  if (!escrowAddress) {
    escrowAddress = await publicClient.readContract({
      address: factory,
      abi: bountyFactoryAbi,
      functionName: "escrowByBountyId",
      args: [params.bountyId],
    });
  }

  if (!escrowAddress || escrowAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("Escrow creation failed — no escrow address returned");
  }

  return { escrowAddress, txHash: hash };
}

export async function approveBasePayout(params: {
  escrowAddress: Address;
  hunterAddress: Address;
}): Promise<Hash> {
  const publicClient = getPublicClient();
  const walletClient = getWalletClient();
  const [account] = await walletClient.getAddresses();

  const hash = await walletClient.writeContract({
    account,
    address: params.escrowAddress,
    abi: bountyEscrowAbi,
    functionName: "approveAndPay",
    args: [params.hunterAddress],
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function submitBaseEscrow(params: {
  escrowAddress: Address;
  hunterAddress: Address;
}): Promise<Hash> {
  const publicClient = getPublicClient();
  const walletClient = getWalletClient();
  const [account] = await walletClient.getAddresses();

  const hash = await walletClient.writeContract({
    account,
    address: params.escrowAddress,
    abi: bountyEscrowAbi,
    functionName: "submit",
    args: [params.hunterAddress],
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/** Escrow status: 0=Open, 1=Submitted, 2=Approved, 3=Paid, 4=Expired, 5=Disputed, 6=Refunded */
export async function getBaseEscrowStatus(escrowAddress: Address): Promise<number> {
  const publicClient = getPublicClient();
  return publicClient.readContract({
    address: escrowAddress,
    abi: bountyEscrowAbi,
    functionName: "status",
  });
}

export async function markBaseEscrowDisputed(escrowAddress: Address): Promise<Hash> {
  const publicClient = getPublicClient();
  const walletClient = getWalletClient();
  const [account] = await walletClient.getAddresses();

  const hash = await walletClient.writeContract({
    account,
    address: escrowAddress,
    abi: bountyEscrowAbi,
    functionName: "markDisputed",
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function getUsdcBalance(address: Address): Promise<number> {
  const publicClient = getPublicClient();
  const raw = await publicClient.readContract({
    address: getUsdcAddress(),
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  });
  return Number(raw) / 1_000_000;
}
