import express from "express";
import { createPaymentMiddleware, flatPrice, notionalPrice, tieredPrice } from "@x402/x402-middleware";
import { paymentOptions, start } from "@x402/service-runtime";

const app = express();
app.use(express.json());
const payment = paymentOptions();

app.use(createPaymentMiddleware(payment, {
  path: "/api/v1/quote", pricing: tieredPrice((request) => Number(request.query.amountIn || 0) > 10_000 ? "large" : "standard", { standard: "$0.015", large: "$0.12" }, "$0.015"), description: "Slippage-bounded route simulation"
}));
app.get("/api/v1/quote", (request, response) => response.json({ routeId: "stub-route", expectedOut: "0", priceImpactBps: 0, calldata: "0x", expiresAt: new Date(Date.now() + 60_000).toISOString() }));

app.use(createPaymentMiddleware(payment, { path: "/api/v1/execute", method: "POST", pricing: notionalPrice({ base: 0.50, basisPoints: 3, minimum: 0.50, readNotional: (request) => Number(request.body?.notionalUsd || 0) }), description: "MEV-protected route execution" }));
app.post("/api/v1/execute", (request, response) => response.json({ routeId: request.body?.routeId || "stub-route", status: "accepted", settlementTxHash: null }));

for (const path of ["/api/v1/route-status/:routeId", "/health"]) {
  app.use(createPaymentMiddleware(payment, { path, pricing: flatPrice("$0.001"), description: "Paid AlphaRoute status request" }));
}
app.get("/api/v1/route-status/:routeId", (request, response) => response.json({ routeId: request.params.routeId, status: "pending" }));
app.get("/health", (_request, response) => response.json({ status: "ok", service: "alpharoute" }));

start(app);
