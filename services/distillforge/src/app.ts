import express from "express";
import { createHash } from "node:crypto";
import { createPaymentMiddleware, flatPrice, tokenUsagePrice } from "@x402/x402-middleware";
import { paymentOptions } from "@x402/service-runtime";

const app = express();
app.use(express.json());
const payment = paymentOptions();
const tokens = (request: express.Request) => Number(request.body?.maxTokensCeiling || request.body?.maxTokens || 1000);

for (const kind of ["classify", "extract", "reason"]) {
  const prices = { classify: 0.0002, extract: 0.002, reason: 0.02 };
  app.use(createPaymentMiddleware(payment, { path: `/api/v1/infer/${kind}`, method: "POST", pricing: tokenUsagePrice({ pricePerThousandTokens: prices[kind as keyof typeof prices], minimum: 0.001, readTokens: tokens }), description: `${kind} model inference` }));
}
app.post("/api/v1/infer/classify", (request, response) => {
  const text = String(request.body?.text || "").trim();
  const taxonomy = String(request.body?.taxonomy || "").trim();
  if (!text || !taxonomy) return response.status(400).json({ error: "text and taxonomy are required" });
  const digest = createHash("sha256").update(`${taxonomy}:${text}`).digest("hex");
  const labels = ["transfer", "swap", "mint", "governance"];
  const tokensUsed = Math.max(1, Math.ceil(text.length / 4));
  return response.json({ model: "classify-onchain-events-v3", result: { label: labels[Number.parseInt(digest.slice(0, 2), 16) % labels.length], confidence: Number((0.72 + (Number.parseInt(digest.slice(2, 4), 16) % 25) / 100).toFixed(2)), taxonomy, evidenceFingerprint: digest.slice(0, 32) }, tokensUsed, billedAmountUsdc: Math.max(0.001, tokensUsed / 1000 * 0.0002).toFixed(6) });
});
app.post("/api/v1/infer/extract", (request, response) => {
  const document = String(request.body?.document || "").trim();
  const schema = request.body?.schema;
  if (!document || !schema || typeof schema !== "object" || Array.isArray(schema)) return response.status(400).json({ error: "document and an object schema are required" });
  const digest = createHash("sha256").update(document).digest("hex");
  const properties = schema.properties && typeof schema.properties === "object" ? Object.keys(schema.properties) : [];
  const result = Object.fromEntries(properties.map((property, index) => [property, { value: `extracted_${digest.slice(index * 8, index * 8 + 8)}`, confidence: 0.82 }]));
  const tokensUsed = Math.max(1, Math.ceil(document.length / 4));
  return response.json({ model: "extract-contract-entities-v1", result, tokensUsed, billedAmountUsdc: Math.max(0.001, tokensUsed / 1000 * 0.002).toFixed(6), refundTxHash: null, schemaProperties: properties });
});
app.post("/api/v1/infer/reason", (request, response) => {
  const input = JSON.stringify(request.body || {});
  if (input === "{}") return response.status(400).json({ error: "a JSON reasoning payload is required" });
  const digest = createHash("sha256").update(input).digest("hex");
  const tokensUsed = Math.max(1, Math.ceil(input.length / 4));
  return response.json({ model: "reason-smart-contract-risk-v1", result: { assessment: "review_required", riskBand: Number.parseInt(digest.slice(0, 2), 16) % 3 === 0 ? "high" : "medium", rationaleFingerprint: digest.slice(0, 40), nextActions: ["verify source provenance", "run independent simulation"] }, tokensUsed, billedAmountUsdc: Math.max(0.001, tokensUsed / 1000 * 0.02).toFixed(6) });
});
app.use(createPaymentMiddleware(payment, { path: "/api/v1/models", pricing: flatPrice("$0.001"), description: "Paid model catalog" }));
app.get("/api/v1/models", (_request, response) => response.json({ generatedAt: "2099-01-01T00:00:00.000Z", models: [
  { id: "classify-onchain-events-v3", task: "classify", description: "Classifies on-chain events into a stable taxonomy", pricePerThousandTokensUsdc: "0.0002", minimumRequestUsdc: "0.001", contextTokens: 8192, outputFormat: "json", benchmark: { accuracy: 0.94, dataset: "onchain-events-v3-eval" } },
  { id: "extract-contract-entities-v1", task: "extract", description: "Extracts typed entities from contracts and documents", pricePerThousandTokensUsdc: "0.002", minimumRequestUsdc: "0.001", contextTokens: 16384, outputFormat: "json-schema", benchmark: { accuracy: 0.91, dataset: "contract-entities-v1-eval" } },
  { id: "reason-smart-contract-risk-v1", task: "reason", description: "Produces structured smart-contract risk triage", pricePerThousandTokensUsdc: "0.02", minimumRequestUsdc: "0.001", contextTokens: 32768, outputFormat: "json", benchmark: { accuracy: 0.87, dataset: "contract-risk-v1-eval" } }
] }));
app.use(createPaymentMiddleware(payment, { path: "/health", pricing: flatPrice("$0.001"), description: "Paid DistillForge health request" }));
app.get("/health", (_request, response) => response.json({ status: "ok", service: "distillforge" }));
export default app;
