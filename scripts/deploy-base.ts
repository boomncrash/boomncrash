import fs from "fs";
import path from "path";
import { ethers } from "hardhat";

const PLATFORM_FEE_BPS = 300;
const DISPUTE_WINDOW = 48 * 60 * 60;

const USDC_BY_CHAIN: Record<number, string> = {
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  5042002: "0x3600000000000000000000000000000000000000",
};

const DEPLOYMENT_FILENAME: Record<number, string> = {
  84532: "base-sepolia.json",
  8453: "base-mainnet.json",
  5042002: "arc-testnet.json",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  const usdcAddress =
    process.env.BASE_USDC_ADDRESS ?? USDC_BY_CHAIN[chainId];

  if (!usdcAddress) {
    throw new Error(`No USDC address configured for chain ${chainId}`);
  }

  console.log("Deploying boomncrash contracts...");
  console.log("Deployer:", deployer.address);
  console.log("Chain ID:", chainId.toString());
  console.log("USDC:", usdcAddress);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("ETH balance:", ethers.formatEther(balance));

  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  const feeCollector = await FeeCollector.deploy(deployer.address);
  await feeCollector.waitForDeployment();

  const BountyFactory = await ethers.getContractFactory("BountyFactory");
  const factory = await BountyFactory.deploy(
    usdcAddress,
    await feeCollector.getAddress(),
    PLATFORM_FEE_BPS,
    DISPUTE_WINDOW
  );
  await factory.waitForDeployment();

  const deployment = {
    network: network.name,
    chainId,
    usdc: usdcAddress,
    feeCollector: await feeCollector.getAddress(),
    bountyFactory: await factory.getAddress(),
    platformFeeBps: PLATFORM_FEE_BPS,
    rallySupport: true,
    deployedAt: new Date().toISOString(),
  };

  console.log("\n✅ Deployment complete:");
  console.log(JSON.stringify(deployment, null, 2));

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const filename = DEPLOYMENT_FILENAME[chainId] ?? `chain-${chainId}.json`;
  fs.writeFileSync(path.join(outDir, filename), JSON.stringify(deployment, null, 2));

  console.log(`\nSaved to deployments/${filename}`);
  console.log(`\nAdd to web/.env.local (or Netlify env):`);
  console.log(`NEXT_PUBLIC_BOUNTY_FACTORY_ADDRESS=${deployment.bountyFactory}`);
  if (chainId === 8453) {
    console.log(`NEXT_PUBLIC_BASE_NETWORK=mainnet`);
    console.log(`NEXT_PUBLIC_BASE_USDC_ADDRESS=${usdcAddress}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
