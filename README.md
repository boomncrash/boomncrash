# Bountly

**Fund tasks. Get paid in USDC.**

Global USDC bounty marketplace — creators escrow rewards, hunters complete tasks, get paid in stablecoin.

## Stack

- **Frontend:** Next.js 15 (App Router) + Tailwind CSS
- **Hosting:** [Netlify](https://www.netlify.com) — see [docs/DEPLOY.md](docs/DEPLOY.md)
- **Database:** Netlify Database (Postgres)
- **Chains:** Base + Solana (launch), Arc testnet (dev/future)
- **Currency:** USDC only
- **Platform fee:** 3%

## Getting Started

```bash
# Install root + web dependencies
npm install
cd web && npm install && cd ..

# Web env
cp web/.env.example web/.env.local

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Netlify

1. Push this repo to GitHub
2. Connect [boomncrash/boomncrash](https://github.com/boomncrash/boomncrash) in Netlify
3. Enable **Netlify Database**
4. Set env vars from `web/.env.example`
5. Deploy — full guide: [docs/DEPLOY.md](docs/DEPLOY.md)

Production mainnet checklist: [docs/MAINNET.md](docs/MAINNET.md)

## Project Structure

```
web/src/              # Next.js app (pages, components, API)
web/netlify/database/ # Postgres migrations
contracts/            # Base Solidity escrow (Hardhat)
programs/             # Solana Anchor escrow
docs/                 # PRD, deploy, mainnet guides
```

## Smart Contracts

```bash
npm run contracts:compile
npm run contracts:test
npm run contracts:deploy:base-sepolia
npm run contracts:deploy:solana-devnet
```

## MVP Categories

- **Social** — X posts, engagement, community tasks
- **Content** — memes, clips, graphics, UGC
- **Product testing** — app tests, bug reports, surveys

## Environment Variables

| Location | Purpose |
|----------|---------|
| `web/.env.example` | Next.js app (copy to `web/.env.local`) |
| `.env.example` | Hardhat deployer key (root) |

## License

Private — all rights reserved.
