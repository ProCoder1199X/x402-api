# x402 API Portfolio

Five Express + TypeScript services monetized with x402 on Base USDC.

## Services

- AlphaRoute: port 3001
- SentinelFeed: port 3002
- ComplyRail: port 3003
- DistillForge: port 3004
- ProofMesh: port 3005

Every public route is payment-gated, including health, catalog, and status routes. Business implementations are intentionally stubbed and marked by their response values; replace them before production.

## Run

```bash
npm install
npm run build
copy .env.example .env
npm run dev:alpharoute
```

See `scripts/smoke-test.ps1` for unpaid 402 checks and the signed-payment retry flow.
