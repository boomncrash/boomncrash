import fs from "fs";
import path from "path";

type SolanaNetwork = "devnet" | "mainnet";

const CONFIG: Record<
  SolanaNetwork,
  { cluster: string; usdcMint: string; filename: string; anchorSection: string; envNetwork: string }
> = {
  devnet: {
    cluster: "https://api.devnet.solana.com",
    usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    filename: "solana-devnet.json",
    anchorSection: "devnet",
    envNetwork: "devnet",
  },
  mainnet: {
    cluster: "https://api.mainnet-beta.solana.com",
    usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    filename: "solana-mainnet.json",
    anchorSection: "mainnet",
    envNetwork: "mainnet",
  },
};

function main() {
  const network = (process.env.SOLANA_NETWORK ?? process.argv[2] ?? "devnet") as SolanaNetwork;
  const cfg = CONFIG[network];
  if (!cfg) {
    throw new Error(`Unknown network: ${network}. Use devnet or mainnet.`);
  }

  const anchorToml = fs.readFileSync(
    path.join(__dirname, "..", "Anchor.toml"),
    "utf8"
  );

  const regex = new RegExp(
    `\\[programs\\.${cfg.anchorSection}\\]\\s*\\nbounty_escrow\\s*=\\s*"([^"]+)"`
  );
  const match = anchorToml.match(regex);
  const programId =
    process.env.SOLANA_PROGRAM_ID ?? match?.[1] ?? "Bount1111111111111111111111111111111111111";

  const deployment = {
    network,
    cluster: cfg.cluster,
    programId,
    usdcMint: cfg.usdcMint,
    platformFeeBps: 300,
    rallySupport: true,
    deployedAt: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, cfg.filename);
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));

  console.log(`✅ Solana ${network} deployment manifest written:`);
  console.log(JSON.stringify(deployment, null, 2));
  console.log(`\nSaved to deployments/${cfg.filename}`);
  console.log(`\nAdd to web/.env.local (or Netlify env):`);
  console.log(`NEXT_PUBLIC_SOLANA_PROGRAM_ID=${programId}`);
  console.log(`NEXT_PUBLIC_SOLANA_NETWORK=${cfg.envNetwork}`);
  console.log(`NEXT_PUBLIC_SOLANA_USDC_MINT=${cfg.usdcMint}`);
}

main();
