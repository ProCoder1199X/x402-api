import express from "express";
import { createHash } from "node:crypto";
import { createPaymentMiddleware, flatPrice, tieredPrice } from "@x402/x402-middleware";
import { paymentOptions } from "@x402/service-runtime";

const app = express();
app.use(express.json());
const payment = paymentOptions();

app.use(createPaymentMiddleware(payment, { path: "/api/v1/events", pricing: tieredPrice((request) => String(request.query.tier || "standard"), { standard: "$0.005", realtime: "$0.08" }, "$0.005"), description: "Structured event feed" }));
app.get("/api/v1/events", (request, response) => {
	const topic = String(request.query.topic || "").trim();
	const tier = String(request.query.tier || "standard");
	const since = String(request.query.since || "2026-01-01T00:00:00.000Z");
	if (!topic || topic.length > 120) return response.status(400).json({ error: "topic is required and must be at most 120 characters" });
	if (!(["standard", "realtime"] as string[]).includes(tier)) return response.status(400).json({ error: "tier must be standard or realtime" });
	if (Number.isNaN(Date.parse(since))) return response.status(400).json({ error: "since must be an ISO-8601 timestamp" });

	const digest = createHash("sha256").update(`${topic.toLowerCase()}:${since}:${tier}`).digest("hex");
	const eventTypes = ["announcement", "listing", "governance"];
	const events = eventTypes.map((eventType, index) => ({
		id: `sf_${digest.slice(index * 12, index * 12 + 20)}`,
		topic,
		eventType,
		entities: [`entity_${digest.slice(index * 8, index * 8 + 10)}`],
		sourceCount: tier === "realtime" ? 4 + index : 2 + index,
		confidence: Number((0.91 - index * 0.04).toFixed(2)),
		observedAt: `2099-01-01T00:0${index}:00.000Z`,
		deduplicationKey: digest.slice(index * 16, index * 16 + 32),
		sourceTier: tier
	}));
	return response.json({ topic, tier, since, events, freshnessMs: tier === "realtime" ? 1200 : 58_000, nextCursor: `sf_${digest.slice(0, 16)}` });
});
app.use(createPaymentMiddleware(payment, { path: "/api/v1/entities/:entityId/mentions", pricing: flatPrice("$0.01"), description: "Entity mention lookup" }));
app.get("/api/v1/entities/:entityId/mentions", (request, response) => {
	const entityId = request.params.entityId;
	const window = String(request.query.window || "15m");
	if (!entityId || !/^[-A-Za-z0-9_:.]{1,100}$/.test(entityId)) return response.status(400).json({ error: "entityId is invalid" });
	if (!/^\d+[mhd]$/.test(window)) return response.status(400).json({ error: "window must look like 15m, 1h, or 1d" });
	const digest = createHash("sha256").update(`${entityId}:${window}`).digest("hex");
	return response.json({ entityId, window, mentions: [0, 1].map((index) => ({ id: `mention_${digest.slice(index * 16, index * 16 + 16)}`, entityId, source: index ? "forum" : "news", sentiment: index ? "neutral" : "positive", confidence: index ? 0.74 : 0.88, observedAt: `2099-01-01T00:0${index}:00.000Z`, textFingerprint: digest.slice(index * 20, index * 20 + 20) })) });
});
app.use(createPaymentMiddleware(payment, { path: "/api/v1/stream/subscribe", method: "POST", pricing: flatPrice("$5.00"), description: "Prepaid metered event stream" }));
app.post("/api/v1/stream/subscribe", (_request, response) => response.status(202).json({ subscriptionId: "stub-subscription", balanceUsdc: "5.00" }));
app.use(createPaymentMiddleware(payment, { path: "/health", pricing: flatPrice("$0.001"), description: "Paid SentinelFeed health request" }));
app.get("/health", (_request, response) => response.json({ status: "ok", service: "sentinelfeed" }));
export default app;
