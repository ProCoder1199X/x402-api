import express from "express";
import { createHash } from "node:crypto";
import { createPaymentMiddleware, flatPrice } from "@x402/x402-middleware";
import { paymentOptions } from "@x402/service-runtime";

const app = express();
app.use(express.json());
const payment = paymentOptions();

app.use(createPaymentMiddleware(payment, { path: "/api/v1/verify/zkproof", method: "POST", pricing: flatPrice("$1.50"), description: "zkML proof generation" }));
app.post("/api/v1/verify/zkproof", (_request, response) => response.status(202).json({ proofId: "stub-proof", settlementTxHash: null, estimatedCompletionSec: 60 }));
app.use(createPaymentMiddleware(payment, { path: "/api/v1/verify/teeattest", method: "POST", pricing: flatPrice("$0.03"), description: "TEE computation attestation" }));
app.post("/api/v1/verify/teeattest", (_request, response) => response.json({ verified: true, attestation: "stub-attestation", settlementTxHash: null }));
app.use(createPaymentMiddleware(payment, { path: "/api/v1/verify/status/*", pricing: flatPrice("$0.001"), description: "Paid proof status polling" }));
app.get("/api/v1/verify/status/:proofId", (request, response) => {
	const proofId = request.params.proofId;
	if (!/^[-A-Za-z0-9_]{4,120}$/.test(proofId)) return response.status(400).json({ error: "proofId is invalid" });
	const digest = createHash("sha256").update(proofId).digest("hex");
	const phase = Number.parseInt(digest.slice(0, 2), 16) % 4;
	const status = ["queued", "proving", "complete", "failed"][phase];
	return response.json({ proofId, status, proof: status === "complete" ? `0x${digest}${digest}` : null, proofSystem: phase % 2 ? "risczero" : "ezkl", progressPercent: status === "queued" ? 0 : status === "proving" ? 50 : 100, resultFingerprint: `0x${digest.slice(0, 64)}` });
});
app.use(createPaymentMiddleware(payment, { path: "/health", pricing: flatPrice("$0.001"), description: "Paid ProofMesh health request" }));
app.get("/health", (_request, response) => response.json({ status: "ok", service: "proofmesh" }));
export default app;
