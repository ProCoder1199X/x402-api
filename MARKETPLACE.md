# Marketplace Listings

Use the following copy for AI-agent marketplaces. All URLs use the production base URL:

`https://x402-api-91r3.vercel.app`

## Payment instructions for every listing

This is an x402 REST API on Base. Call the endpoint normally first. The server returns HTTP 402 and a `PAYMENT-REQUIRED` response header containing the payment requirements. Sign an EIP-3009 USDC `transferWithAuthorization` payload, send it in the `X-PAYMENT` request header, and retry the same request. A successful paid response includes the `PAYMENT-RESPONSE` settlement header.

Network: `base`
Asset: USDC
Payment currency: USDC atomic units with 6 decimals

## 1. AlphaRoute

**Name:** AlphaRoute Slippage-Bounded Execution Oracle

**Description:** Machine-native route validation and deterministic quote fingerprinting for Base DeFi agents. The current engine validates request safety and returns reproducible route metadata; connect venue liquidity providers before production trading.

**Base URL:** `https://x402-api-91r3.vercel.app/alpharoute`

**Paid tools:**

- `GET /api/v1/quote`: required `tokenIn`, `tokenOut`, `amountIn`, `chainId`; optional `maxSlippageBps`. Costs `$0.015` standard or `$0.12` when `amountIn` is greater than 10,000.
- `POST /api/v1/execute`: JSON `{ "routeId": "...", "signedPermit": "...", "maxSlippageBps": 50, "notionalUsd": 1000 }`. Costs `$0.50 + 3 bps` of notional, with a `$0.50` minimum.
- `GET /api/v1/route-status/{routeId}`: costs `$0.001`.

**Successful JSON response example:**

```json
{
	"routeId": "ar_8f2c...",
	"chainId": 8453,
	"tokenIn": "0x0000000000000000000000000000000000000001",
	"tokenOut": "0x0000000000000000000000000000000000000002",
	"amountIn": "1000",
	"expectedOut": "980",
	"priceImpactBps": 47,
	"maxSlippageBps": 50,
	"selectedVenues": ["uniswap-v4", "aerodrome"],
	"routeType": "single-hop",
	"calldata": "0x...",
	"quoteFingerprint": "0x...",
	"expiresAt": "2099-01-01T00:00:00.000Z"
}
```

**Best for:** Trading agents, arbitrage bots, DEX route planners.

## 2. SentinelFeed

**Name:** SentinelFeed Structured Event Intelligence

**Description:** Paid deterministic event normalization and entity-mention utility for agents that need stable machine-readable records. Connect source adapters before relying on it for live news or trading decisions.

**Base URL:** `https://x402-api-91r3.vercel.app/sentinelfeed`

**Paid tools:**

- `GET /api/v1/events`: required `topic`; optional `since` and `tier=standard|realtime`. Costs `$0.005` standard or `$0.08` realtime.
- `GET /api/v1/entities/{entityId}/mentions`: optional `window`; costs `$0.01`.
- `POST /api/v1/stream/subscribe`: opens a prepaid metered stream balance; costs `$5.00`.

**Successful JSON response example:**

```json
{
	"topic": "token_launch",
	"tier": "standard",
	"since": "2026-01-01T00:00:00.000Z",
	"events": [{
		"id": "sf_8f2c...",
		"eventType": "announcement",
		"entities": ["entity_91ab23cd45"],
		"sourceCount": 2,
		"confidence": 0.91,
		"observedAt": "2099-01-01T00:00:00.000Z",
		"deduplicationKey": "...",
		"sourceTier": "standard"
	}],
	"freshnessMs": 58000,
	"nextCursor": "sf_..."
}
```

**Best for:** Market monitors, research agents, launch trackers, arbitrage watchers.

## 3. ComplyRail

**Name:** ComplyRail Wallet and Transaction Compliance

**Description:** Paid deterministic transaction normalization and risk-policy utility for autonomous payment workflows on Base. It returns a reproducible policy decision and attestation-shaped audit record; connect sanctioned-address datasets and a signing key before regulatory use.

**Base URL:** `https://x402-api-91r3.vercel.app/complyrail`

**Paid tools:**

- `GET /api/v1/screen/wallet/{address}`: optional `chainId`; costs `$0.01`.
- `GET /api/v1/screen/transaction`: required `from`, `to`, `amount`, and `asset`; costs `$0.35`.
- `POST /api/v1/attest/batch`: JSON `{ "addresses": ["0x...", "0x..."] }`; costs `$0.10` minimum.

**Successful JSON response example:**

```json
{
	"from": "0x0000000000000000000000000000000000000001",
	"to": "0x0000000000000000000000000000000000000002",
	"amount": "25.00",
	"asset": "USDC",
	"riskScore": 0.1842,
	"sanctioned": false,
	"decision": "allow",
	"attestation": {
		"payload": "{...}",
		"signature": "0x...",
		"signerAddress": "0x0000000000000000000000000000000000000000",
		"issuedAt": "2099-01-01T00:00:00.000Z",
		"policyVersion": "complyrail-stub-1"
	},
	"settlementTxHash": null
}
```

**Best for:** Agent payment middleware, treasury automation, compliance pre-flight checks.

## 4. DistillForge

**Name:** DistillForge Narrow Model Inference

**Description:** Paid deterministic narrow-task inference utility for classification, schema-directed extraction, and structured reasoning. The launch engine exposes stable fingerprints and cost metadata; connect model inference providers before production model decisions.

**Base URL:** `https://x402-api-91r3.vercel.app/distillforge`

**Paid tools:**

- `POST /api/v1/infer/classify`: JSON `{ "text": "...", "taxonomy": "onchain_events_v3", "maxTokens": 1000 }`; `$0.0002` per 1,000 tokens with a `$0.001` minimum.
- `POST /api/v1/infer/extract`: JSON `{ "document": "...", "schema": {}, "maxTokensCeiling": 2000 }`; `$0.002` per 1,000 tokens with a `$0.001` minimum.
- `POST /api/v1/infer/reason`: domain reasoning; `$0.02` per 1,000 tokens with a `$0.001` minimum.
- `GET /api/v1/models`: paid catalog; `$0.001`.

**Successful JSON response example:**

```json
{
	"model": "classify-onchain-events-v3",
	"result": {
		"label": "swap",
		"confidence": 0.84,
		"taxonomy": "onchain_events_v3",
		"evidenceFingerprint": "..."
	},
	"tokensUsed": 42,
	"billedAmountUsdc": "0.001000"
}
```

`GET /api/v1/models` returns model IDs, task types, context limits, output formats, unit prices, and benchmark metadata.

**Best for:** Orchestrators, token-saving routers, contract and event classification agents.

## 5. ProofMesh

**Name:** ProofMesh Verifiable Compute

**Description:** Paid deterministic proof-job status utility for agents that need reproducible job tracking and proof fingerprints. Connect a real prover or TEE verifier before treating the result as cryptographic evidence.

**Base URL:** `https://x402-api-91r3.vercel.app/proofmesh`

**Paid tools:**

- `POST /api/v1/verify/zkproof`: JSON `{ "modelHash": "...", "inputHash": "...", "outputHash": "...", "proofSystem": "ezkl" }`; costs `$1.50`.
- `POST /api/v1/verify/teeattest`: JSON `{ "enclaveId": "...", "computationDigest": "..." }`; costs `$0.03`.
- `GET /api/v1/verify/status/{proofId}`: costs `$0.001`.

**Successful JSON response example:**

```json
{
	"proofId": "stub-proof",
	"status": "complete",
	"proof": "0x...",
	"proofSystem": "ezkl",
	"progressPercent": 100,
	"resultFingerprint": "0x..."
}
```

**Best for:** Agent-to-agent settlement, model provenance, high-value automated decisions.

## Machine-readable specification

OpenAPI: `https://x402-api-91r3.vercel.app/openapi.json`

Note: the public deployment is an x402 REST gateway. The local [mcp-config.json](mcp-config.json) launches the separate stdio MCP adapter for the original scraped-data tool; it is not a remote Streamable HTTP MCP endpoint.
