# Production Deployment Checklist

## Coinbase CDP and Base

- Create a dedicated CDP API key with only the facilitator permissions required by the deployment.
- Set `FACILITATOR_URL` to the current CDP x402 facilitator URL from the CDP dashboard.
- Set `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` as server-side secrets.
- Set `PAY_TO` to the treasury EVM address that should receive USDC. The existing `WALLET_ADDRESS` is accepted as a fallback.
- Set `NETWORK=base` and verify the asset is Base USDC, not Base Sepolia USDC.
- Set `RPC_URL` to an authenticated Base RPC endpoint if business logic needs chain reads.
- Fund the agent wallet used by smoke tests with Base ETH for gas where required by the payment flow.
- Confirm the treasury address and payment amounts in the CDP facilitator supported-payment response.

## HTTPS and proxying

- Put the reverse proxy behind HTTPS before accepting real `X-PAYMENT` requests.
- Preserve `X-PAYMENT`, `PAYMENT-REQUIRED`, and `PAYMENT-RESPONSE` headers without normalization or truncation.
- Forward the original host and protocol headers.
- Do not expose service container ports directly to the public internet.
- Configure request body limits, timeouts, rate limits, and access logs at the proxy.

## Before first live payment

- Call every paid route without `X-PAYMENT` and confirm HTTP 402.
- Confirm the 402 requirement has the expected Base network, USDC asset, treasury address, amount, and resource.
- Retry using an agent wallet on Base and confirm facilitator verification, settlement, and the `PAYMENT-RESPONSE` transaction hash.
- Check the settlement transaction on a Base block explorer.
- Test duplicate payment payloads and expired authorizations; both must be rejected.
- Replace all TODO business stubs and add persistence/idempotency before production traffic.
- Add monitoring for facilitator latency, verification failures, settlement failures, rejected payments, and treasury balance.
- Never commit `.env`, CDP secrets, private keys, or production RPC credentials.

## Single-project Vercel routing

The five services are mounted by `api/portfolio.ts` and deployed through the existing project. The public prefixes are `/alpharoute`, `/sentinelfeed`, `/complyrail`, `/distillforge`, and `/proofmesh`. Deploy from the repository root with `vercel --prod`.
