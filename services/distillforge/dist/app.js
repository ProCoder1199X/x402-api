"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const x402_middleware_1 = require("@x402/x402-middleware");
const service_runtime_1 = require("@x402/service-runtime");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const payment = (0, service_runtime_1.paymentOptions)();
const tokens = (request) => Number(request.body?.maxTokensCeiling || request.body?.maxTokens || 1000);
for (const kind of ["classify", "extract", "reason"]) {
    const prices = { classify: 0.0002, extract: 0.002, reason: 0.02 };
    app.use((0, x402_middleware_1.createPaymentMiddleware)(payment, { path: `/api/v1/infer/${kind}`, method: "POST", pricing: (0, x402_middleware_1.tokenUsagePrice)({ pricePerThousandTokens: prices[kind], minimum: 0.001, readTokens: tokens }), description: `${kind} model inference` }));
}
app.post("/api/v1/infer/classify", (_request, response) => response.json({ result: { label: "stub", confidence: 0 }, tokensUsed: 0, billedAmountUsdc: "0.001" }));
app.post("/api/v1/infer/extract", (_request, response) => response.json({ result: {}, tokensUsed: 0, billedAmountUsdc: "0.001", refundTxHash: null }));
app.post("/api/v1/infer/reason", (_request, response) => response.json({ result: { assessment: "stub" }, tokensUsed: 0, billedAmountUsdc: "0.001" }));
app.use((0, x402_middleware_1.createPaymentMiddleware)(payment, { path: "/api/v1/models", pricing: (0, x402_middleware_1.flatPrice)("$0.001"), description: "Paid model catalog" }));
app.get("/api/v1/models", (_request, response) => response.json({ models: [] }));
app.use((0, x402_middleware_1.createPaymentMiddleware)(payment, { path: "/health", pricing: (0, x402_middleware_1.flatPrice)("$0.001"), description: "Paid DistillForge health request" }));
app.get("/health", (_request, response) => response.json({ status: "ok", service: "distillforge" }));
(0, service_runtime_1.start)(app);
