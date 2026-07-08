# boomncrash PRD v1.0 (Locked)

## Product Summary

| Field | Value |
|-------|-------|
| Name | boomncrash |
| Tagline | Fund tasks. Get paid in USDC. |
| Pooled bounties | Rally (v1.1) |
| Scope | Global |
| Currency | USDC only |
| Platform fee | 3% |
| Launch chains | Base + Solana |
| Dev chain | Arc testnet |

## MVP Categories

- Social ($5–$500)
- Content ($10–$2,500)
- Product testing ($5–$1,000)

## Pages

- `/` Landing
- `/explore` Bounty feed
- `/bounty/[id]` Detail
- `/create` Post bounty
- `/dashboard` User dashboard
- `/wallet` Buy USDC + balances
- `/submit/[bountyId]` Submit proof
- `/admin` Moderation queue

## Sprint 1 Status

- [x] Next.js scaffold
- [x] Base escrow contracts
- [x] API routes + in-memory store
- [x] Core UI pages

## Sprint 2 Status

- [x] viem + Base escrow client
- [x] Wallet chain switching (Base Sepolia)
- [x] Create bounty → USDC approve + factory.createBounty
- [x] Creator on-chain payout (approveAndPay)
- [x] USDC balance on wallet page
- [x] Deploy script outputs factory address

## Sprint 3 Status

- [x] Netlify Database + Drizzle ORM (in-memory fallback locally)
- [x] Repository layer — all APIs migrated
- [x] Solana Anchor program (SPL USDC + 3% fee vault)
- [x] Phantom wallet (create, submit, wallet page)
- [ ] Solana client escrow txs (needs program deploy + IDL)
- [ ] Onramper live (needs API key)
- [ ] Rally pooled bounties (v1.1)
