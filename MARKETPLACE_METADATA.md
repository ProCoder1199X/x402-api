# Marketplace Metadata for All Paid APIs

Production base URL:

```text
https://x402-api-91r3.vercel.app
```

Every endpoint below requires x402 payment on Base mainnet using USDC. The marketplace flow is:

1. Call the endpoint.
2. Receive HTTP `402 Payment Required`.
3. Read the payment requirements from the response JSON/header.
4. Sign the EIP-3009 USDC payment.
5. Retry with `X-PAYMENT`.
6. Receive the JSON output and `PAYMENT-RESPONSE` settlement header.

## Shared x402 input/output metadata

Input payment header:

```json
{
  "X-PAYMENT": "base64-encoded-x402-payment-payload"
}
```

Input payment schema:

```json
{
  "type": "object",
  "required": ["X-PAYMENT"],
  "properties": {
    "X-PAYMENT": {
      "type": "string",
      "description": "Base64-encoded EIP-3009 USDC payment payload returned after the HTTP 402 challenge."
    }
  }
}
```

Shared output payment response header:

```json
{
  "PAYMENT-RESPONSE": "base64-encoded-x402-settlement-response"
}
```

## AlphaRoute

### AlphaRoute quote

Endpoint:

```text
GET https://x402-api-91r3.vercel.app/alpharoute/api/v1/quote
```

Price: `$0.015` standard; `$0.12` when `amountIn > 10000`.

Input payload/query:

```json
{
  "tokenIn": "0x0000000000000000000000000000000000000001",
  "tokenOut": "0x0000000000000000000000000000000000000002",
  "amountIn": "1000",
  "maxSlippageBps": 50,
  "chainId": 8453
}
```

Input schema:

```json
{
  "type": "object",
  "required": ["tokenIn", "tokenOut", "amountIn", "chainId"],
  "properties": {
    "tokenIn": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
    "tokenOut": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
    "amountIn": { "type": "string", "pattern": "^[0-9]+$" },
    "maxSlippageBps": { "type": "integer", "minimum": 0, "maximum": 10000, "default": 50 },
    "chainId": { "type": "integer", "enum": [8453] }
  }
}
```

Output example:

```json
{
  "routeId": "ar_8f2c4d9a12ab34cd56ef7890",
  "chainId": 8453,
  "tokenIn": "0x0000000000000000000000000000000000000001",
  "tokenOut": "0x0000000000000000000000000000000000000002",
  "amountIn": "1000",
  "expectedOut": "980",
  "priceImpactBps": 47,
  "maxSlippageBps": 50,
  "selectedVenues": ["uniswap-v4", "aerodrome"],
  "routeType": "single-hop",
  "calldata": "0x1234...",
  "quoteFingerprint": "0xabcd...",
  "expiresAt": "2099-01-01T00:00:00.000Z"
}
```

Output schema:

```json
{
  "type": "object",
  "required": ["routeId", "chainId", "tokenIn", "tokenOut", "amountIn", "expectedOut", "priceImpactBps", "maxSlippageBps", "selectedVenues", "routeType", "calldata", "quoteFingerprint", "expiresAt"],
  "properties": {
    "routeId": { "type": "string" },
    "chainId": { "type": "integer" },
    "tokenIn": { "type": "string" },
    "tokenOut": { "type": "string" },
    "amountIn": { "type": "string" },
    "expectedOut": { "type": "string" },
    "priceImpactBps": { "type": "integer" },
    "maxSlippageBps": { "type": "integer" },
    "selectedVenues": { "type": "array", "items": { "type": "string" } },
    "routeType": { "type": "string" },
    "calldata": { "type": "string" },
    "quoteFingerprint": { "type": "string" },
    "expiresAt": { "type": "string", "format": "date-time" }
  }
}
```

### AlphaRoute execute

Endpoint: `POST https://x402-api-91r3.vercel.app/alpharoute/api/v1/execute`

Input payload:

```json
{
  "routeId": "ar_8f2c4d9a12ab34cd56ef7890",
  "signedPermit": "0x...",
  "maxSlippageBps": 50,
  "notionalUsd": 1000
}
```

Input schema:

```json
{
  "type": "object",
  "required": ["routeId", "signedPermit", "maxSlippageBps"],
  "properties": {
    "routeId": { "type": "string" },
    "signedPermit": { "type": "string" },
    "maxSlippageBps": { "type": "integer" },
    "notionalUsd": { "type": "number", "minimum": 0 }
  }
}
```

Output example:

```json
{
  "routeId": "ar_8f2c4d9a12ab34cd56ef7890",
  "status": "accepted",
  "settlementTxHash": null
}
```

Output schema:

```json
{
  "type": "object",
  "properties": {
    "routeId": { "type": "string" },
    "status": { "type": "string" },
    "settlementTxHash": { "type": ["string", "null"] }
  }
}
```

### AlphaRoute route status

Endpoint: `GET https://x402-api-91r3.vercel.app/alpharoute/api/v1/route-status/{routeId}`

Input payload:

```json
{ "routeId": "ar_8f2c4d9a12ab34cd56ef7890" }
```

Input schema:

```json
{
  "type": "object",
  "required": ["routeId"],
  "properties": { "routeId": { "type": "string" } }
}
```

Output example:

```json
{ "routeId": "ar_8f2c4d9a12ab34cd56ef7890", "status": "pending" }
```

Output schema:

```json
{
  "type": "object",
  "required": ["routeId", "status"],
  "properties": { "routeId": { "type": "string" }, "status": { "type": "string" } }
}
```

## SentinelFeed

### SentinelFeed events

Endpoint: `GET https://x402-api-91r3.vercel.app/sentinelfeed/api/v1/events`

Price: `$0.005` standard; `$0.08` realtime.

Input payload:

```json
{
  "topic": "token_launch",
  "since": "2026-01-01T00:00:00.000Z",
  "tier": "standard"
}
```

Input schema:

```json
{
  "type": "object",
  "required": ["topic"],
  "properties": {
    "topic": { "type": "string", "maxLength": 120 },
    "since": { "type": "string", "format": "date-time" },
    "tier": { "type": "string", "enum": ["standard", "realtime"] }
  }
}
```

Output example:

```json
{
  "topic": "token_launch",
  "tier": "standard",
  "since": "2026-01-01T00:00:00.000Z",
  "events": [{
    "id": "sf_8f2c4d9a12ab34cd56ef",
    "topic": "token_launch",
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

Output schema:

```json
{
  "type": "object",
  "required": ["topic", "tier", "events", "freshnessMs", "nextCursor"],
  "properties": {
    "topic": { "type": "string" },
    "tier": { "type": "string" },
    "since": { "type": "string", "format": "date-time" },
    "events": { "type": "array", "items": { "type": "object", "additionalProperties": true } },
    "freshnessMs": { "type": "integer" },
    "nextCursor": { "type": "string" }
  }
}
```

### SentinelFeed entity mentions

Endpoint: `GET https://x402-api-91r3.vercel.app/sentinelfeed/api/v1/entities/{entityId}/mentions`

Input payload:

```json
{ "entityId": "entity_91ab23cd45", "window": "15m" }
```

Input schema:

```json
{
  "type": "object",
  "required": ["entityId"],
  "properties": {
    "entityId": { "type": "string", "pattern": "^[-A-Za-z0-9_:.]{1,100}$" },
    "window": { "type": "string", "pattern": "^[0-9]+[mhd]$", "default": "15m" }
  }
}
```

Output example:

```json
{
  "entityId": "entity_91ab23cd45",
  "window": "15m",
  "mentions": [{
    "id": "mention_8f2c4d9a12ab34cd",
    "entityId": "entity_91ab23cd45",
    "source": "news",
    "sentiment": "positive",
    "confidence": 0.88,
    "observedAt": "2099-01-01T00:00:00.000Z",
    "textFingerprint": "..."
  }]
}
```

Output schema:

```json
{
  "type": "object",
  "required": ["entityId", "window", "mentions"],
  "properties": {
    "entityId": { "type": "string" },
    "window": { "type": "string" },
    "mentions": { "type": "array", "items": { "type": "object", "additionalProperties": true } }
  }
}
```

### SentinelFeed stream subscription

Endpoint: `POST https://x402-api-91r3.vercel.app/sentinelfeed/api/v1/stream/subscribe`

Input payload:

```json
{ "eventsPerSecondLimit": 10, "topics": ["token_launch"] }
```

Input schema:

```json
{
  "type": "object",
  "properties": {
    "eventsPerSecondLimit": { "type": "integer", "minimum": 1 },
    "topics": { "type": "array", "items": { "type": "string" } }
  }
}
```

Output example:

```json
{ "subscriptionId": "stub-subscription", "balanceUsdc": "5.00" }
```

Output schema:

```json
{
  "type": "object",
  "required": ["subscriptionId", "balanceUsdc"],
  "properties": { "subscriptionId": { "type": "string" }, "balanceUsdc": { "type": "string" } }
}
```

## ComplyRail

### ComplyRail wallet screening

Endpoint: `GET https://x402-api-91r3.vercel.app/complyrail/api/v1/screen/wallet/{address}`

Input payload:

```json
{ "address": "0x0000000000000000000000000000000000000001", "chainId": 8453 }
```

Input schema:

```json
{
  "type": "object",
  "required": ["address"],
  "properties": {
    "address": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
    "chainId": { "type": "integer", "enum": [8453] }
  }
}
```

Output example:

```json
{
  "address": "0x0000000000000000000000000000000000000001",
  "sanctioned": false,
  "riskScore": 0
}
```

Output schema:

```json
{
  "type": "object",
  "required": ["address", "sanctioned", "riskScore"],
  "properties": {
    "address": { "type": "string" },
    "sanctioned": { "type": "boolean" },
    "riskScore": { "type": "number", "minimum": 0, "maximum": 1 }
  }
}
```

### ComplyRail transaction screening

Endpoint: `GET https://x402-api-91r3.vercel.app/complyrail/api/v1/screen/transaction`

Input payload:

```json
{
  "from": "0x0000000000000000000000000000000000000001",
  "to": "0x0000000000000000000000000000000000000002",
  "amount": "25.00",
  "asset": "USDC"
}
```

Input schema:

```json
{
  "type": "object",
  "required": ["from", "to", "amount", "asset"],
  "properties": {
    "from": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
    "to": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
    "amount": { "type": "string", "pattern": "^[0-9]+(\\.[0-9]+)?$" },
    "asset": { "type": "string" }
  }
}
```

Output example:

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

Output schema:

```json
{
  "type": "object",
  "required": ["from", "to", "amount", "asset", "riskScore", "sanctioned", "decision", "attestation"],
  "properties": {
    "from": { "type": "string" },
    "to": { "type": "string" },
    "amount": { "type": "string" },
    "asset": { "type": "string" },
    "riskScore": { "type": "number", "minimum": 0, "maximum": 1 },
    "sanctioned": { "type": "boolean" },
    "decision": { "type": "string", "enum": ["allow", "review", "block"] },
    "attestation": { "type": "object", "additionalProperties": true },
    "settlementTxHash": { "type": ["string", "null"] }
  }
}
```

### ComplyRail batch attestation

Endpoint: `POST https://x402-api-91r3.vercel.app/complyrail/api/v1/attest/batch`

Input payload:

```json
{ "addresses": ["0x0000000000000000000000000000000000000001"] }
```

Input schema:

```json
{
  "type": "object",
  "required": ["addresses"],
  "properties": {
    "addresses": { "type": "array", "items": { "type": "string" } }
  }
}
```

Output example:

```json
{ "attestations": [] }
```

Output schema:

```json
{
  "type": "object",
  "required": ["attestations"],
  "properties": { "attestations": { "type": "array", "items": { "type": "object", "additionalProperties": true } } }
}
```

## DistillForge

### DistillForge model catalog

Endpoint: `GET https://x402-api-91r3.vercel.app/distillforge/api/v1/models`

Input payload:

```json
{}
```

Input schema:

```json
{ "type": "object", "properties": {} }
```

Output example:

```json
{
  "generatedAt": "2099-01-01T00:00:00.000Z",
  "models": [
    {
      "id": "classify-onchain-events-v3",
      "task": "classify",
      "description": "Classifies on-chain events into a stable taxonomy",
      "pricePerThousandTokensUsdc": "0.0002",
      "minimumRequestUsdc": "0.001",
      "contextTokens": 8192,
      "outputFormat": "json",
      "benchmark": { "accuracy": 0.94, "dataset": "onchain-events-v3-eval" }
    }
  ]
}
```

Output schema:

```json
{
  "type": "object",
  "required": ["generatedAt", "models"],
  "properties": {
    "generatedAt": { "type": "string", "format": "date-time" },
    "models": { "type": "array", "items": { "type": "object", "additionalProperties": true } }
  }
}
```

### DistillForge classify

Endpoint: `POST https://x402-api-91r3.vercel.app/distillforge/api/v1/infer/classify`

Input payload:

```json
{ "text": "Token swap executed", "taxonomy": "onchain_events_v3", "maxTokens": 1000 }
```

Input schema:

```json
{
  "type": "object",
  "required": ["text", "taxonomy"],
  "properties": {
    "text": { "type": "string" },
    "taxonomy": { "type": "string" },
    "maxTokens": { "type": "integer", "minimum": 1 }
  }
}
```

Output example:

```json
{
  "model": "classify-onchain-events-v3",
  "result": { "label": "swap", "confidence": 0.84, "taxonomy": "onchain_events_v3", "evidenceFingerprint": "..." },
  "tokensUsed": 42,
  "billedAmountUsdc": "0.001000"
}
```

Output schema:

```json
{
  "type": "object",
  "required": ["model", "result", "tokensUsed", "billedAmountUsdc"],
  "properties": {
    "model": { "type": "string" },
    "result": { "type": "object", "additionalProperties": true },
    "tokensUsed": { "type": "integer" },
    "billedAmountUsdc": { "type": "string" }
  }
}
```

### DistillForge extract

Endpoint: `POST https://x402-api-91r3.vercel.app/distillforge/api/v1/infer/extract`

Input payload:

```json
{ "document": "Contract deployer: Alice", "schema": { "properties": { "deployer": { "type": "string" } } }, "maxTokensCeiling": 2000 }
```

Input schema:

```json
{
  "type": "object",
  "required": ["document", "schema"],
  "properties": {
    "document": { "type": "string" },
    "schema": { "type": "object" },
    "maxTokensCeiling": { "type": "integer", "minimum": 1, "default": 2000 }
  }
}
```

Output example:

```json
{
  "model": "extract-contract-entities-v1",
  "result": { "deployer": { "value": "extracted_8f2c4d9a", "confidence": 0.82 } },
  "tokensUsed": 8,
  "billedAmountUsdc": "0.001000",
  "refundTxHash": null,
  "schemaProperties": ["deployer"]
}
```

Output schema:

```json
{
  "type": "object",
  "required": ["model", "result", "tokensUsed", "billedAmountUsdc", "schemaProperties"],
  "properties": {
    "model": { "type": "string" },
    "result": { "type": "object", "additionalProperties": true },
    "tokensUsed": { "type": "integer" },
    "billedAmountUsdc": { "type": "string" },
    "refundTxHash": { "type": ["string", "null"] },
    "schemaProperties": { "type": "array", "items": { "type": "string" } }
  }
}
```

### DistillForge reason

Endpoint: `POST https://x402-api-91r3.vercel.app/distillforge/api/v1/infer/reason`

Input payload:

```json
{ "contractHash": "0x...", "task": "triage vulnerabilities" }
```

Input schema:

```json
{ "type": "object", "minProperties": 1, "additionalProperties": true }
```

Output example:

```json
{
  "model": "reason-smart-contract-risk-v1",
  "result": { "assessment": "review_required", "riskBand": "medium", "rationaleFingerprint": "...", "nextActions": ["verify source provenance", "run independent simulation"] },
  "tokensUsed": 20,
  "billedAmountUsdc": "0.001000"
}
```

Output schema:

```json
{
  "type": "object",
  "required": ["model", "result", "tokensUsed", "billedAmountUsdc"],
  "properties": {
    "model": { "type": "string" },
    "result": { "type": "object", "additionalProperties": true },
    "tokensUsed": { "type": "integer" },
    "billedAmountUsdc": { "type": "string" }
  }
}
```

## ProofMesh

### ProofMesh zk proof submission

Endpoint: `POST https://x402-api-91r3.vercel.app/proofmesh/api/v1/verify/zkproof`

Input payload:

```json
{ "modelHash": "0xmodel", "inputHash": "0xinput", "outputHash": "0xoutput", "proofSystem": "ezkl" }
```

Input schema:

```json
{
  "type": "object",
  "required": ["modelHash", "inputHash", "outputHash", "proofSystem"],
  "properties": {
    "modelHash": { "type": "string" },
    "inputHash": { "type": "string" },
    "outputHash": { "type": "string" },
    "proofSystem": { "type": "string", "enum": ["ezkl", "risczero"] }
  }
}
```

Output example:

```json
{ "proofId": "stub-proof", "settlementTxHash": null, "estimatedCompletionSec": 60 }
```

Output schema:

```json
{
  "type": "object",
  "required": ["proofId", "estimatedCompletionSec"],
  "properties": {
    "proofId": { "type": "string" },
    "settlementTxHash": { "type": ["string", "null"] },
    "estimatedCompletionSec": { "type": "integer" }
  }
}
```

### ProofMesh TEE attestation

Endpoint: `POST https://x402-api-91r3.vercel.app/proofmesh/api/v1/verify/teeattest`

Input payload:

```json
{ "enclaveId": "enclave-001", "computationDigest": "0xdigest" }
```

Input schema:

```json
{
  "type": "object",
  "required": ["enclaveId", "computationDigest"],
  "properties": {
    "enclaveId": { "type": "string" },
    "computationDigest": { "type": "string" }
  }
}
```

Output example:

```json
{ "verified": true, "attestation": "stub-attestation", "settlementTxHash": null }
```

Output schema:

```json
{
  "type": "object",
  "required": ["verified", "attestation"],
  "properties": {
    "verified": { "type": "boolean" },
    "attestation": { "type": "string" },
    "settlementTxHash": { "type": ["string", "null"] }
  }
}
```

### ProofMesh proof status

Endpoint: `GET https://x402-api-91r3.vercel.app/proofmesh/api/v1/verify/status/{proofId}`

Input payload:

```json
{ "proofId": "stub-proof" }
```

Input schema:

```json
{
  "type": "object",
  "required": ["proofId"],
  "properties": { "proofId": { "type": "string", "pattern": "^[-A-Za-z0-9_]{4,120}$" } }
}
```

Output example:

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

Output schema:

```json
{
  "type": "object",
  "required": ["proofId", "status", "proofSystem", "progressPercent", "resultFingerprint"],
  "properties": {
    "proofId": { "type": "string" },
    "status": { "type": "string", "enum": ["queued", "proving", "complete", "failed"] },
    "proof": { "type": ["string", "null"] },
    "proofSystem": { "type": "string", "enum": ["ezkl", "risczero"] },
    "progressPercent": { "type": "integer", "minimum": 0, "maximum": 100 },
    "resultFingerprint": { "type": "string" }
  }
}
```

## Marketplace listing links

- Machine-readable contract: `https://x402-api-91r3.vercel.app/openapi.json`
- Human-readable service listings: [MARKETPLACE.md](MARKETPLACE.md)
- This complete metadata guide: [MARKETPLACE_METADATA.md](MARKETPLACE_METADATA.md)

## Existing scraper API

Endpoint: `GET https://x402-api-91r3.vercel.app/api/scraped-data`

Price: `$0.01`.

Input payload:

```json
{ "target": "https://example.com" }
```

Input schema:

```json
{
  "type": "object",
  "properties": { "target": { "type": "string", "format": "uri", "default": "https://example.com" } }
}
```

Output example:

```json
{
  "success": true,
  "data": {
    "target": "https://example.com",
    "scrapedAt": "2026-09-05T12:00:00.000Z",
    "title": "Example Domain",
    "text": "Example Domain This domain is for use in illustrative examples...",
    "textLength": 125,
    "source": "real-scraper",
    "success": true
  }
}
```

Output schema:

```json
{
  "type": "object",
  "required": ["success", "data"],
  "properties": {
    "success": { "type": "boolean" },
    "data": { "type": "object", "additionalProperties": true }
  }
}
```
