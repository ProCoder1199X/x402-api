# x402 Machine-Native API Portfolio
### Five production-viable, agent-only monetization plays on Coinbase CDP (Base)

Design philosophy: every endpoint here fails the "would a human ever call this directly" test — the latency, granularity, and pricing are tuned so that only a software agent operating in a loop (trading bot, scraper swarm, compliance middleware, orchestrator) finds the unit economics rational. That's what keeps these defensible against a human just using a free dashboard instead.

All five follow the same settlement primitive unless noted: **HTTP 402 → EIP-3009 `transferWithAuthorization` (USDC on Base) → CDP x402 facilitator verify/settle → 200 + payload**, so I've only spelled out where a domain deviates from that default (streaming payments, escrow, or subscriptions).

---

## Domain 1 — Autonomous DeFi Orchestration
### `AlphaRoute` — Slippage-Bounded Optimal Execution Oracle

**1. Value Proposition**
Trading agents don't want a price feed, they want an *executable, signed route* across DEX liquidity (Uniswap v4, Aerodrome, Curve, CoW, 1inch-aggregated) with a guaranteed max-slippage bound and MEV-resistant calldata, computed fresh at request time. A human would use a UI and eyeball it; an agent executing hundreds of trades/hour needs a machine-callable route that's already simulated against current mempool state and returns calldata it can sign and broadcast immediately. The API absorbs the computational cost of running parallel route simulations across N DEXs so the agent doesn't have to run its own indexer.

**2. Economic & Earning Logic**
Priced by *notional value at risk* and *simulation depth*, not flat rate — this mirrors how a market maker prices risk, and it's defensible because larger trades need deeper route-splitting (more simulation compute) and carry more MEV exposure to protect against.
- `GET /quote` (single-hop, <$10k notional): **$0.015** — cheap enough for high-frequency polling loops.
- `GET /quote` (multi-hop split-route, >$10k notional): **$0.12** — reflects N-way simulation cost across liquidity venues.
- `POST /execute` (bundled + MEV-protected via private mempool submission): **$0.50 + 3bps of notional** — the premium is for private-relay inclusion (Flashbots Protect equivalent on Base), which is the actual scarce resource.

**3. Core Functional Endpoints**
- `GET /api/v1/quote?tokenIn=0x...&tokenOut=0x...&amountIn=...&maxSlippageBps=50&chainId=8453`
- `POST /api/v1/execute` — body: `{routeId, signedPermit, maxSlippageBps}` — executes a previously quoted route atomically
- `GET /api/v1/route-status/{routeId}` — polling endpoint for async execution confirmation (free, no 402 — settlement status shouldn't be paywalled)

**4. x402 Micro-Transaction Flow**
Agent calls `/quote` → server returns `402` with `PaymentRequirements` (asset: USDC, network: `base`, `payTo`, `maxAmountRequired` scaled to notional tier, `resource` = route hash). Agent's smart-wallet signs an EIP-3009 authorization scoped to that exact `nonce`/route hash so the payment can't be replayed against a different quote. Server verifies via the CDP facilitator's `/verify` call *before* running the expensive simulation (cheap signature check gates expensive compute), then settles via `/settle` and streams back the signed calldata.

**5. OpenAPI 3.0 Snippet**
```yaml
openapi: 3.0.3
info:
  title: AlphaRoute Execution Oracle
  version: 1.2.0
  description: Machine-only DEX route optimization with x402 micropayment gating.
servers:
  - url: https://api.alpharoute.xyz/api/v1
paths:
  /quote:
    get:
      operationId: getOptimalRoute
      summary: Get a slippage-bounded, MEV-aware execution route
      parameters:
        - name: tokenIn
          in: query
          required: true
          schema: { type: string, pattern: '^0x[a-fA-F0-9]{40}$' }
        - name: tokenOut
          in: query
          required: true
          schema: { type: string, pattern: '^0x[a-fA-F0-9]{40}$' }
        - name: amountIn
          in: query
          required: true
          schema: { type: string, description: "amount in wei/base units" }
        - name: maxSlippageBps
          in: query
          required: false
          schema: { type: integer, default: 50 }
        - name: chainId
          in: query
          required: true
          schema: { type: integer, enum: [8453] }
      responses:
        '200':
          description: Signed route returned after settlement confirmation
          content:
            application/json:
              schema:
                type: object
                properties:
                  routeId: { type: string }
                  expectedOut: { type: string }
                  priceImpactBps: { type: integer }
                  calldata: { type: string }
                  expiresAt: { type: string, format: date-time }
        '402':
          description: Payment required before route simulation is executed
          headers:
            X-PAYMENT-REQUIRED:
              schema: { type: string }
              description: Base64-encoded x402 PaymentRequirements object
          content:
            application/json:
              schema:
                type: object
                properties:
                  x402Version: { type: integer, example: 1 }
                  accepts:
                    type: array
                    items:
                      type: object
                      properties:
                        scheme: { type: string, example: "exact" }
                        network: { type: string, example: "base" }
                        maxAmountRequired: { type: string, example: "15000" }
                        asset: { type: string, example: "USDC" }
                        payTo: { type: string, example: "0xTreasuryAddress" }
                        resource: { type: string, example: "/quote#routehash" }
                        description: { type: string, example: "Multi-hop route simulation fee" }
      security:
        - x402Payment: []
components:
  securitySchemes:
    x402Payment:
      type: apiKey
      in: header
      name: X-PAYMENT
      description: >
        Base64-encoded, EIP-3009-signed payment payload submitted on the
        retry request after receiving a 402 challenge.
```

---

## Domain 2 — Real-Time Web Scraping / Intelligence
### `SentinelFeed` — Structured, Deduplicated, LLM-Ready Event Feed

**1. Value Proposition**
Agents (trading bots, research assistants, arbitrage watchers) don't want raw HTML — they want pre-parsed, deduplicated, entity-tagged JSON events with a guaranteed freshness SLA (e.g., "no older than 4 seconds"). A human tolerates a 30-second-stale dashboard; an agent making trading decisions cannot. The value isn't the scraping — it's the normalization, dedup-across-sources, and the SLA that's expensive to run 24/7, which is exactly the kind of always-on infrastructure a lone agent shouldn't have to build itself.

**2. Economic & Earning Logic**
Priced by *freshness tier* and *source exclusivity*, since staleness and coverage are the two things agents actually value.
- `GET /events` (60s-delayed, public-source aggregation): **$0.005/call** — commodity tier, high volume.
- `GET /events?tier=realtime` (sub-5s, includes gated/paywalled source aggregation): **$0.08/call** — this is where the margin lives, because most agents will pay a premium to not build their own low-latency scraper fleet.
- `GET /stream` (WebSocket, streaming settlement): **$0.002/event delivered**, settled via a prepaid escrow balance topped up in batches to avoid a 402 round-trip per event (see flow below).

**3. Core Functional Endpoints**
- `GET /api/v1/events?topic=token_launch&since=<ts>&tier=standard|realtime`
- `GET /api/v1/entities/{entityId}/mentions?window=15m`
- `POST /api/v1/stream/subscribe` — opens a metered WebSocket channel against a prepaid balance

**4. x402 Micro-Transaction Flow**
For REST calls: standard 402 challenge per request, same as AlphaRoute. For the `/stream` endpoint, a single 402 challenge funds a **prepaid settlement account** (a scoped USDC allowance via EIP-3009 for a fixed ceiling, e.g. $5), and the server debits it per-event server-side, closing the stream and emitting a final on-chain settlement receipt when the balance is exhausted or the agent disconnects — this avoids the absurdity of a signature round-trip per streamed event.

**5. OpenAPI 3.0 Snippet**
```yaml
openapi: 3.0.3
info:
  title: SentinelFeed Intelligence API
  version: 2.0.0
paths:
  /api/v1/events:
    get:
      operationId: getStructuredEvents
      summary: Fetch deduplicated, entity-tagged event feed
      parameters:
        - name: topic
          in: query
          required: true
          schema: { type: string, example: "token_launch" }
        - name: since
          in: query
          required: false
          schema: { type: string, format: date-time }
        - name: tier
          in: query
          required: false
          schema: { type: string, enum: [standard, realtime], default: standard }
      responses:
        '200':
          description: Structured event batch
          content:
            application/json:
              schema:
                type: object
                properties:
                  events:
                    type: array
                    items:
                      type: object
                      properties:
                        id: { type: string }
                        topic: { type: string }
                        entities: { type: array, items: { type: string } }
                        sourceCount: { type: integer }
                        confidence: { type: number }
                        observedAt: { type: string, format: date-time }
                  freshnessMs: { type: integer, description: "age of freshest event in ms" }
        '402':
          description: x402 payment challenge, amount varies by tier
          content:
            application/json:
              schema:
                type: object
                properties:
                  x402Version: { type: integer }
                  accepts:
                    type: array
                    items:
                      type: object
                      properties:
                        scheme: { type: string, example: "exact" }
                        network: { type: string, example: "base" }
                        maxAmountRequired: { type: string, example: "80000" }
                        asset: { type: string, example: "USDC" }
                        payTo: { type: string }
                        description: { type: string, example: "Realtime tier per-call fee" }
      security:
        - x402Payment: []
components:
  securitySchemes:
    x402Payment:
      type: apiKey
      in: header
      name: X-PAYMENT
```

---

## Domain 3 — Machine Compliance (RegTech-as-a-Service)
### `ComplyRail` — Real-Time Counterparty & Sanctions Attestation for Agent Transactions

**1. Value Proposition**
As agents start paying other agents autonomously (which is the entire x402 thesis), *someone* has to answer "is this counterparty wallet sanctioned/high-risk/compromised" in under 200ms, on-chain, without a human compliance officer in the loop. This is the API an agent's own payment middleware calls *before* it lets an outbound x402 payment fire — it's infrastructure for infrastructure. No human buys this; it's a pre-flight check baked into an agent's transaction pipeline.

**2. Economic & Earning Logic**
Priced by *liability transferred*, not compute — this is the one domain where the product is closer to insurance/attestation than data lookup, so pricing tracks risk exposure of the transaction being screened, not query cost.
- `GET /screen/wallet/{address}` (basic OFAC/sanctions list match): **$0.01** — commodity lookup, cacheable, low margin, high volume (every agent calls this before every payment).
- `GET /screen/transaction` (full travel-rule-style counterparty risk score + signed attestation): **$0.35** — the signed attestation is the product: it's a cryptographically signed statement the agent can retain as an audit trail, which is what actually carries value if the agent's operator is ever audited.
- `POST /attest/batch` (pre-screen a whole payment route/DAG before an orchestrator agent fires 50 downstream payments): **$0.02/address, volume-discounted**.

**3. Core Functional Endpoints**
- `GET /api/v1/screen/wallet/{address}?chainId=8453`
- `GET /api/v1/screen/transaction?from=0x...&to=0x...&amount=...&asset=USDC`
- `POST /api/v1/attest/batch` — body: `{addresses: [...]}`, returns per-address signed attestations

**4. x402 Micro-Transaction Flow**
Identical 402/EIP-3009 flow, but the **response payload itself is a signed artifact** (ECDSA signature over the risk verdict + timestamp + nonce), so the agent isn't just paying for data, it's paying for a verifiable, non-repudiable compliance record it can present downstream. Settlement receipt (tx hash on Base) and the attestation signature are bundled together in the response so both can be archived as one audit unit.

**5. OpenAPI 3.0 Snippet**
```yaml
openapi: 3.0.3
info:
  title: ComplyRail Machine Compliance API
  version: 1.1.0
paths:
  /api/v1/screen/transaction:
    get:
      operationId: screenTransaction
      summary: Risk-score a counterparty and receive a signed attestation
      parameters:
        - name: from
          in: query
          required: true
          schema: { type: string }
        - name: to
          in: query
          required: true
          schema: { type: string }
        - name: amount
          in: query
          required: true
          schema: { type: string }
        - name: asset
          in: query
          required: true
          schema: { type: string, example: "USDC" }
      responses:
        '200':
          description: Signed compliance attestation
          content:
            application/json:
              schema:
                type: object
                properties:
                  riskScore: { type: number, description: "0.0 (clean) to 1.0 (blocked)" }
                  sanctioned: { type: boolean }
                  attestation:
                    type: object
                    properties:
                      payload: { type: string, description: "canonical JSON that was signed" }
                      signature: { type: string }
                      signerAddress: { type: string }
                      issuedAt: { type: string, format: date-time }
                  settlementTxHash: { type: string }
        '402':
          description: Payment required for screening + attestation
          content:
            application/json:
              schema:
                type: object
                properties:
                  x402Version: { type: integer }
                  accepts:
                    type: array
                    items:
                      type: object
                      properties:
                        scheme: { type: string, example: "exact" }
                        network: { type: string, example: "base" }
                        maxAmountRequired: { type: string, example: "350000" }
                        asset: { type: string, example: "USDC" }
                        payTo: { type: string }
      security:
        - x402Payment: []
components:
  securitySchemes:
    x402Payment:
      type: apiKey
      in: header
      name: X-PAYMENT
```

---

## Domain 4 — AI Model Distillation & Narrow Inference
### `DistillForge` — On-Demand Expert Model Inference Marketplace

**1. Value Proposition**
General-purpose LLMs are expensive and slow for narrow, repeated subtasks (e.g., "classify this on-chain event into one of 40 categories," "extract structured entities from this contract ABI"). `DistillForge` hosts a portfolio of small, distilled expert models — each fine-tuned on one narrow task — and lets an orchestrator agent route subtasks to the cheapest sufficient model instead of always calling a frontier model. An agent pays because it's *economically irrational* to spend frontier-model tokens on a task a 0.5B-parameter distilled model solves just as accurately for 1/50th the cost.

**2. Economic & Earning Logic**
Priced per-token but *segmented by model class*, so the pricing itself signals which tool to pick — this is the mechanism that makes agent routing decisions rational rather than a flat API bill.
- `POST /infer/classify` (distilled classifier, <100M params): **$0.0002/1k tokens** — deliberately near-commodity to win high-frequency routing decisions.
- `POST /infer/extract` (structured extraction expert, ~1-3B params): **$0.002/1k tokens**.
- `POST /infer/reason` (distilled reasoning specialist for one vertical, e.g. smart-contract-vuln triage): **$0.02/1k tokens** — priced closer to frontier-model cost because the distillation targets a narrow but high-stakes task where accuracy justifies the premium.

**3. Core Functional Endpoints**
- `POST /api/v1/infer/classify` — body: `{text, taxonomy: "onchain_events_v3"}`
- `POST /api/v1/infer/extract` — body: `{document, schema}` (returns JSON matching provided schema)
- `GET /api/v1/models` — free catalog listing model classes, benchmarked accuracy, and $/1k-token pricing so an agent's router can make a cost/accuracy tradeoff programmatically

**4. x402 Micro-Transaction Flow**
Because token count (and therefore price) isn't known until after inference runs, this uses a **two-phase settlement**: 402 challenge #1 authorizes a *ceiling* payment (max tokens × price), inference runs, then the server returns the actual cost and refunds the delta via a follow-up on-chain transfer back to the agent — or, more efficiently, the agent pre-funds a metered balance (same escrow pattern as SentinelFeed's stream) so routine classify/extract calls don't each incur challenge-response latency.

**5. OpenAPI 3.0 Snippet**
```yaml
openapi: 3.0.3
info:
  title: DistillForge Expert Inference API
  version: 1.0.0
paths:
  /api/v1/infer/extract:
    post:
      operationId: extractStructured
      summary: Run a distilled extraction-expert model against a document
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [document, schema]
              properties:
                document: { type: string }
                schema:
                  type: object
                  description: "JSON schema the model must conform its output to"
                maxTokensCeiling:
                  type: integer
                  default: 2000
      responses:
        '200':
          description: Extraction result plus final billed usage
          content:
            application/json:
              schema:
                type: object
                properties:
                  result: { type: object }
                  tokensUsed: { type: integer }
                  billedAmountUsdc: { type: string }
                  refundTxHash:
                    type: string
                    nullable: true
                    description: "populated if actual cost < ceiling authorized at 402"
        '402':
          description: Payment ceiling required before inference runs
          content:
            application/json:
              schema:
                type: object
                properties:
                  x402Version: { type: integer }
                  accepts:
                    type: array
                    items:
                      type: object
                      properties:
                        scheme: { type: string, example: "exact" }
                        network: { type: string, example: "base" }
                        maxAmountRequired: { type: string, example: "4000", description: "ceiling = maxTokensCeiling * unit price" }
                        asset: { type: string, example: "USDC" }
                        payTo: { type: string }
      security:
        - x402Payment: []
components:
  securitySchemes:
    x402Payment:
      type: apiKey
      in: header
      name: X-PAYMENT
```

---

## Domain 5 — Verifiable Compute & Agent Trust
### `ProofMesh` — zkML / TEE-Attested Inference Verification

**1. Value Proposition**
When Agent A pays Agent B for an inference result (via any of the APIs above, or a third-party model), Agent A has no way to verify B didn't just return a cheaper, lower-quality model's output while charging for the expensive one. `ProofMesh` generates a cryptographic proof (zkML proof or TEE attestation, depending on the model) that a *specific* model, with *specific* weights, produced a *specific* output — and it's priced for exactly the situation where an agent is transacting with another untrusted agent and needs settlement-grade assurance, not a human-readable disclaimer.

**2. Economic & Earning Logic**
Priced by *proof generation cost*, which varies enormously by proof system — this is the most computationally honest pricing in the portfolio because zk-proving is genuinely expensive and the price should reflect real GPU/prover-cluster time.
- `POST /verify/teeattest` (TEE-based attestation, e.g. via Nvidia confidential computing): **$0.03** — cheap because TEE attestation is near-free once the enclave is running; the cost here is mostly the audit trail generation.
- `POST /verify/zkproof` (full zkML proof for a small model, <50M params): **$1.50** — reflects real proving-cluster GPU time; only worth it for high-value, high-trust-deficit transactions (e.g., agent-to-agent payments above some notional threshold).
- `GET /verify/status/{proofId}` — free polling endpoint (proving can take minutes; don't paywall the wait).

**3. Core Functional Endpoints**
- `POST /api/v1/verify/zkproof` — body: `{modelHash, inputHash, outputHash, proofSystem: "ezkl"|"risczero"}`
- `POST /api/v1/verify/teeattest` — body: `{enclaveId, computationDigest}`
- `GET /api/v1/verify/status/{proofId}`

**4. x402 Micro-Transaction Flow**
Given proof generation can take minutes for the zk path, this uses **payment-on-submission, delivery-on-completion**: the 402 challenge is settled upfront (proving clusters are booked regardless of whether the proof is "used"), the server immediately returns a `proofId` and job receipt, and the actual proof is retrievable free via `/status` once ready — decoupling payment settlement from result delivery so the agent isn't holding an open HTTP connection for a multi-minute proving job.

**5. OpenAPI 3.0 Snippet**
```yaml
openapi: 3.0.3
info:
  title: ProofMesh Verifiable Compute API
  version: 1.0.0
paths:
  /api/v1/verify/zkproof:
    post:
      operationId: generateZkProof
      summary: Generate a zkML proof that a specific model produced a specific output
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [modelHash, inputHash, outputHash, proofSystem]
              properties:
                modelHash: { type: string, description: "hash committing to exact model weights" }
                inputHash: { type: string }
                outputHash: { type: string }
                proofSystem: { type: string, enum: [ezkl, risczero] }
      responses:
        '202':
          description: Proof job accepted; payment settled, proving in progress
          content:
            application/json:
              schema:
                type: object
                properties:
                  proofId: { type: string }
                  settlementTxHash: { type: string }
                  estimatedCompletionSec: { type: integer }
        '402':
          description: Upfront payment required to book prover-cluster time
          content:
            application/json:
              schema:
                type: object
                properties:
                  x402Version: { type: integer }
                  accepts:
                    type: array
                    items:
                      type: object
                      properties:
                        scheme: { type: string, example: "exact" }
                        network: { type: string, example: "base" }
                        maxAmountRequired: { type: string, example: "1500000" }
                        asset: { type: string, example: "USDC" }
                        payTo: { type: string }
                        description: { type: string, example: "zkML proof generation, small model tier" }
      security:
        - x402Payment: []
  /api/v1/verify/status/{proofId}:
    get:
      operationId: getProofStatus
      summary: Poll for proof completion (free, unauthenticated by payment)
      parameters:
        - name: proofId
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Current proof status, and the proof itself once ready
          content:
            application/json:
              schema:
                type: object
                properties:
                  status: { type: string, enum: [queued, proving, complete, failed] }
                  proof:
                    type: string
                    nullable: true
components:
  securitySchemes:
    x402Payment:
      type: apiKey
      in: header
      name: X-PAYMENT
```

---

## Cross-cutting build notes

- **Pricing tiers as routing signal, not just monetization** — in Domains 2 and 4 especially, the price differential is what lets an orchestrator agent make a rational cost/quality tradeoff programmatically. If everything is one flat price, you lose that signal and agents have no reason to prefer your cheap tier over a competitor's.
- **Prepaid/escrow settlement for high-frequency endpoints** — a 402 round-trip per call is fine for `/quote`-style endpoints called a few times a minute, but kills unit economics for streaming/classification endpoints called hundreds of times a second. Batch settlement (fund a ceiling, debit server-side, reconcile) is the pattern to reuse across SentinelFeed's stream and DistillForge's classify/extract.
- **Free polling, paid action** — every domain above keeps status/poll endpoints unpaywalled (ComplyRail's audit retrieval, ProofMesh's `/status`, AlphaRoute's `/route-status`). Paywalling a poll loop just taxes your own agent's patience and creates a bad incentive to spam retries.
- **The attestation-as-product pattern** (ComplyRail, ProofMesh) is probably your highest-margin long-term play — you're not selling compute, you're selling a signed, non-repudiable claim an agent can hold as an audit artifact. That's much harder for a competitor to commoditize than a raw data feed.
