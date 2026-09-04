import express from "express";
import { createPaymentMiddleware, flatPrice, tieredPrice } from "@x402/x402-middleware";
import { paymentOptions, start } from "@x402/service-runtime";

const app = express();
app.use(express.json());
const payment = paymentOptions();

app.use(createPaymentMiddleware(payment, { path: "/api/v1/events", pricing: tieredPrice((request) => String(request.query.tier || "standard"), { standard: "$0.005", realtime: "$0.08" }, "$0.005"), description: "Structured event feed" }));
app.get("/api/v1/events", (_request, response) => response.json({ events: [], freshnessMs: 0 }));
app.use(createPaymentMiddleware(payment, { path: "/api/v1/entities/:entityId/mentions", pricing: flatPrice("$0.01"), description: "Entity mention lookup" }));
app.get("/api/v1/entities/:entityId/mentions", (request, response) => response.json({ entityId: request.params.entityId, mentions: [] }));
app.use(createPaymentMiddleware(payment, { path: "/api/v1/stream/subscribe", method: "POST", pricing: flatPrice("$5.00"), description: "Prepaid metered event stream" }));
app.post("/api/v1/stream/subscribe", (_request, response) => response.status(202).json({ subscriptionId: "stub-subscription", balanceUsdc: "5.00" }));
app.use(createPaymentMiddleware(payment, { path: "/health", pricing: flatPrice("$0.001"), description: "Paid SentinelFeed health request" }));
app.get("/health", (_request, response) => response.json({ status: "ok", service: "sentinelfeed" }));
start(app);
