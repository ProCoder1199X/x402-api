# x402 API Portfolio

Five Express + TypeScript x402 services share one Vercel deployment and one Base USDC treasury.

## Production access

Base URL: `https://x402-api-91r3.vercel.app`

- AlphaRoute: `/alpharoute`
- SentinelFeed: `/sentinelfeed`
- ComplyRail: `/complyrail`
- DistillForge: `/distillforge`
- ProofMesh: `/proofmesh`
- Original scraper: `/api/scraped-data`

Every public operation is paid. An unpaid request returns HTTP 402 with a `PAYMENT-REQUIRED` header. Sign the EIP-3009 USDC payment and retry it in `X-PAYMENT`; the successful response includes `PAYMENT-RESPONSE`.

The complete marketplace-ready catalog is in [MARKETPLACE.md](MARKETPLACE.md). Copy-paste payloads and schemas for every business endpoint are in [MARKETPLACE_METADATA.md](MARKETPLACE_METADATA.md), and the machine-readable API contract is [openapi.json](openapi.json).

## Local development

```powershell
npm install
Copy-Item .env.example .env
npm run build:all
npm run dev:alpharoute
```

Use [scripts/smoke-test.ps1](scripts/smoke-test.ps1) for unpaid 402 checks. Use `npm run smoke` with `AGENT_WALLET_PRIVATE_KEY` set locally for signed retries.

The business responses are launch stubs and must be replaced before production use.
