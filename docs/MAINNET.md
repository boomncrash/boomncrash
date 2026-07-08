# Bountly Mainnet Rollout Checklist

Use this when switching from testnet/devnet to production on Base and Solana.

## 1. Deploy contracts

### Base mainnet

```bash
# Root .env: DEPLOYER_PRIVATE_KEY=0x... (wallet with ETH on Base)
npm run contracts:deploy:base-mainnet
```

### Solana mainnet

```bash
solana config set --url mainnet-beta
# Ensure deployer wallet has SOL for rent + fees
npm run contracts:deploy:solana-mainnet
```

Initialize the Solana fee vault after first deploy (see `web/src/lib/contracts/solana-escrow.ts`).

If the on-chain program was updated (e.g. new `submit` or `mark_disputed` instructions), redeploy the program and update `NEXT_PUBLIC_SOLANA_PROGRAM_ID` before enabling on-chain escrow actions in production.

## 2. Netlify environment variables

Set in **Site settings → Environment variables** (production context):

| Variable | Production value |
|----------|------------------|
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` |
| `NEXT_PUBLIC_BASE_NETWORK` | `mainnet` |
| `NEXT_PUBLIC_BASE_USDC_ADDRESS` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| `NEXT_PUBLIC_BOUNTY_FACTORY_ADDRESS` | From `deployments/base-mainnet.json` |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `mainnet` |
| `NEXT_PUBLIC_SOLANA_PROGRAM_ID` | From `deployments/solana-mainnet.json` |
| `NEXT_PUBLIC_SOLANA_USDC_MINT` | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| `ADMIN_SECRET` | Strong random string |
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | Verified domain sender, e.g. `Bountly <alerts@bountly.app>` |
| `ADMIN_ALERT_EMAIL` | Ops inbox |

`NETLIFY_DB_URL` is auto-injected when Netlify Database is enabled.

## 3. Pre-launch verification

- [ ] `npm run build` passes in `web/`
- [ ] Admin queue at `/admin` approves a test bounty
- [ ] Base escrow create + payout on mainnet USDC (small amount)
- [ ] Solana escrow create + payout on mainnet USDC (small amount)
- [ ] Rally flow: seed → contribute → fund → moderate → open
- [ ] Email verification link works (`/verify-email?token=...`)
- [ ] Category subscription alerts fire when bounty goes `open`
- [ ] Onramper widget on `/wallet` with NGN default

## 4. Deploy

```bash
npx netlify login
npx netlify deploy --prod --build
```

## 5. Post-launch monitoring

- Watch Netlify function logs for escrow / email errors
- Monitor admin email for moderation queue
- Confirm leaderboard and profiles load from Postgres (not in-memory store)

## Rollback

To revert to testnet without redeploying contracts:

1. Set `NEXT_PUBLIC_BASE_NETWORK=testnet` and restore Sepolia factory address
2. Set `NEXT_PUBLIC_SOLANA_NETWORK=devnet` and restore devnet program ID
3. Redeploy the site

Contract addresses on chain cannot be rolled back — only the frontend network config.
