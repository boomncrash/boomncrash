# Deploy Bountly on Netlify

Step-by-step guide to host the Bountly web app on [Netlify](https://www.netlify.com).

## Prerequisites

- GitHub repo: [boomncrash/boomncrash](https://github.com/boomncrash/boomncrash)
- Netlify account
- Resend account (email alerts + verification)
- Base Sepolia / Solana devnet wallets for initial testing (mainnet when ready — see [MAINNET.md](./MAINNET.md))

## 1. Connect the repo

1. Log in to [Netlify](https://app.netlify.com)
2. **Add new site → Import an existing project → GitHub**
3. Select `boomncrash/boomncrash`
4. Netlify auto-detects settings from `netlify.toml`:
   - **Base directory:** `web`
   - **Build command:** `npm run build:netlify`
   - **Publish directory:** `.next` (handled by `@netlify/plugin-nextjs`)

## 2. Enable Netlify Database

1. In the site dashboard: **Extensions → Netlify Database → Enable**
2. This injects `NETLIFY_DB_URL` automatically
3. Migrations in `web/netlify/database/migrations/` are applied **automatically by Netlify during deploy** (not in the build command)

## 3. Set environment variables

In **Site settings → Environment variables**, add (production + deploy previews as needed):

| Variable | Dev / preview | Production |
|----------|---------------|------------|
| `NEXT_PUBLIC_APP_URL` | Netlify preview URL | Your custom domain |
| `NEXT_PUBLIC_BASE_NETWORK` | `testnet` | `mainnet` |
| `NEXT_PUBLIC_BOUNTY_FACTORY_ADDRESS` | From `deployments/base-sepolia.json` | From `deployments/base-mainnet.json` |
| `NEXT_PUBLIC_BASE_USDC_ADDRESS` | Sepolia USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `devnet` | `mainnet` |
| `NEXT_PUBLIC_SOLANA_PROGRAM_ID` | Devnet deploy output | Mainnet deploy output |
| `NEXT_PUBLIC_SOLANA_USDC_MINT` | Devnet USDC mint | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| `ADMIN_SECRET` | Strong random string | Strong random string |
| `RESEND_API_KEY` | Resend API key | Resend API key |
| `EMAIL_FROM` | `Bountly <onboarding@resend.dev>` | Verified domain sender |
| `ADMIN_ALERT_EMAIL` | Your ops inbox | Your ops inbox |
| `NEXT_PUBLIC_ONRAMPER_API_KEY` | Optional | Onramper widget key |

See `web/.env.example` for the full list.

**Never commit secrets.** Set them only in Netlify (or local `.env.local` for dev).

## 4. Deploy

### Git-based (recommended)

Push to `main` — Netlify builds and deploys automatically.

### CLI manual deploy

```bash
cd web
npm install
npx netlify login
npx netlify init          # link site if not connected via Git
npx netlify deploy --prod --build
```

Run from repo root with build context:

```bash
npx netlify deploy --prod --build --dir=web
```

## 5. Post-deploy checklist

- [ ] Site loads at production URL
- [ ] `NEXT_PUBLIC_APP_URL` matches the live domain (required for OG images + email links)
- [ ] `/admin` — enter `ADMIN_SECRET`, moderation queue works
- [ ] Create a test bounty → appears in admin queue → approve → visible on `/explore`
- [ ] Connect wallet on `/dashboard` — email settings + referral link work
- [ ] `/sitemap.xml` and `/robots.txt` reachable
- [ ] Database-backed data (not in-memory): check leaderboard after a submission

## 6. Custom domain

1. **Domain management → Add custom domain**
2. Update DNS per Netlify instructions
3. Set `NEXT_PUBLIC_APP_URL` to `https://yourdomain.com`
4. Trigger a redeploy

## 7. Solana program updates

If you change `programs/bounty_escrow`, redeploy before production:

```bash
npm run contracts:deploy:solana-devnet   # or solana-mainnet
```

Update `NEXT_PUBLIC_SOLANA_PROGRAM_ID` in Netlify env vars, then redeploy the site.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails on migrations | Enable Netlify Database; confirm `NETLIFY_DB_URL` is set |
| Emails not sending | Verify `RESEND_API_KEY`, `EMAIL_FROM` domain, `NEXT_PUBLIC_APP_URL` |
| Admin 401 | Match `ADMIN_SECRET` in env and admin UI |
| Deploy cancelled after function upload | Another deploy superseded it — wait, run only one deploy at a time (see below) |

### Deploy keeps saying "Command was cancelled"

This usually means **two deploys ran at once** (e.g. git push + manual "Deploy site"). Netlify cancels the older one.

1. Open **Deploys** — check if a newer deploy shows **Published** (green)
2. **Do not** click Deploy repeatedly — wait for one to finish
3. **Site settings → Build & deploy → Continuous deployment** — note if "Cancel in-progress builds" is on (normal for git pushes)
4. Run **one** deploy: **Deploys → Trigger deploy → Clear cache and deploy site**
5. Leave the tab open until status is **Published** (~2–3 min)
| OG images broken | Set `NEXT_PUBLIC_APP_URL` to production URL |

## Related docs

- [MAINNET.md](./MAINNET.md) — production chain rollout
- [README.md](../README.md) — local development
