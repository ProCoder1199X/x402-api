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
app.use((0, x402_middleware_1.createPaymentMiddleware)(payment, {
    path: "/api/v1/quote", pricing: (0, x402_middleware_1.tieredPrice)((request) => Number(request.query.amountIn || 0) > 10_000 ? "large" : "standard", { standard: "$0.015", large: "$0.12" }, "$0.015"), description: "Slippage-bounded route simulation"
}));
app.get("/api/v1/quote", (request, response) => response.json({ routeId: "stub-route", expectedOut: "0", priceImpactBps: 0, calldata: "0x", expiresAt: new Date(Date.now() + 60_000).toISOString() }));
app.use((0, x402_middleware_1.createPaymentMiddleware)(payment, { path: "/api/v1/execute", method: "POST", pricing: (0, x402_middleware_1.notionalPrice)({ base: 0.50, basisPoints: 3, minimum: 0.50, readNotional: (request) => Number(request.body?.notionalUsd || 0) }), description: "MEV-protected route execution" }));
app.post("/api/v1/execute", (request, response) => response.json({ routeId: request.body?.routeId || "stub-route", status: "accepted", settlementTxHash: null }));
for (const path of ["/api/v1/route-status/:routeId", "/health"]) {
    app.use((0, x402_middleware_1.createPaymentMiddleware)(payment, { path, pricing: (0, x402_middleware_1.flatPrice)("$0.001"), description: "Paid AlphaRoute status request" }));
}
app.get("/api/v1/route-status/:routeId", (request, response) => response.json({ routeId: request.params.routeId, status: "pending" }));
app.get("/health", (_request, response) => response.json({ status: "ok", service: "alpharoute" }));
(0, service_runtime_1.start)(app);
