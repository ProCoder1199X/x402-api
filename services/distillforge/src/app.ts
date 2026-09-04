import express from "express";
import { createPaymentMiddleware, flatPrice, tokenUsagePrice } from "@x402/x402-middleware";
import { paymentOptions, start } from "@x402/service-runtime";

const app = express();
app.use(express.json());
const payment = paymentOptions();
const tokens = (request: express.Request) => Number(request.body?.maxTokensCeiling || request.body?.maxTokens || 1000);

for (const kind of ["classify", "extract", "reason"]) {
  const prices = { classify: 0.0002, extract: 0.002, reason: 0.02 };
  app.use(createPaymentMiddleware(payment, { path: `/api/v1/infer/${kind}`, method: "POST", pricing: tokenUsagePrice({ pricePerThousandTokens: prices[kind as keyof typeof prices], minimum: 0.001, readTokens: tokens }), description: `${kind} model inference` }));
}
app.post("/api/v1/infer/classify", (_request, response) => response.json({ result: { label: "stub", confidence: 0 }, tokensUsed: 0, billedAmountUsdc: "0.001" }));
app.post("/api/v1/infer/extract", (_request, response) => response.json({ result: {}, tokensUsed: 0, billedAmountUsdc: "0.001", refundTxHash: null }));
app.post("/api/v1/infer/reason", (_request, response) => response.json({ result: { assessment: "stub" }, tokensUsed: 0, billedAmountUsdc: "0.001" }));
app.use(createPaymentMiddleware(payment, { path: "/api/v1/models", pricing: flatPrice("$0.001"), description: "Paid model catalog" }));
app.get("/api/v1/models", (_request, response) => response.json({ models: [] }));
app.use(createPaymentMiddleware(payment, { path: "/health", pricing: flatPrice("$0.001"), description: "Paid DistillForge health request" }));
app.get("/health", (_request, response) => response.json({ status: "ok", service: "distillforge" }));
start(app);
