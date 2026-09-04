"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_crypto_1 = require("node:crypto");
const x402_middleware_1 = require("@x402/x402-middleware");
const service_runtime_1 = require("@x402/service-runtime");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const payment = (0, service_runtime_1.paymentOptions)();
app.use((0, x402_middleware_1.createPaymentMiddleware)(payment, { path: "/api/v1/verify/zkproof", method: "POST", pricing: (0, x402_middleware_1.flatPrice)("$1.50"), description: "zkML proof generation" }));
app.post("/api/v1/verify/zkproof", (_request, response) => response.status(202).json({ proofId: "stub-proof", settlementTxHash: null, estimatedCompletionSec: 60 }));
app.use((0, x402_middleware_1.createPaymentMiddleware)(payment, { path: "/api/v1/verify/teeattest", method: "POST", pricing: (0, x402_middleware_1.flatPrice)("$0.03"), description: "TEE computation attestation" }));
app.post("/api/v1/verify/teeattest", (_request, response) => response.json({ verified: true, attestation: "stub-attestation", settlementTxHash: null }));
app.use((0, x402_middleware_1.createPaymentMiddleware)(payment, { path: "/api/v1/verify/status/*", pricing: (0, x402_middleware_1.flatPrice)("$0.001"), description: "Paid proof status polling" }));
app.get("/api/v1/verify/status/:proofId", (request, response) => {
    const proofId = request.params.proofId;
    if (!/^[-A-Za-z0-9_]{4,120}$/.test(proofId))
        return response.status(400).json({ error: "proofId is invalid" });
    const digest = (0, node_crypto_1.createHash)("sha256").update(proofId).digest("hex");
    const phase = Number.parseInt(digest.slice(0, 2), 16) % 4;
    const status = ["queued", "proving", "complete", "failed"][phase];
    return response.json({ proofId, status, proof: status === "complete" ? `0x${digest}${digest}` : null, proofSystem: phase % 2 ? "risczero" : "ezkl", progressPercent: status === "queued" ? 0 : status === "proving" ? 50 : 100, resultFingerprint: `0x${digest.slice(0, 64)}` });
});
app.use((0, x402_middleware_1.createPaymentMiddleware)(payment, { path: "/health", pricing: (0, x402_middleware_1.flatPrice)("$0.001"), description: "Paid ProofMesh health request" }));
app.get("/health", (_request, response) => response.json({ status: "ok", service: "proofmesh" }));
exports.default = app;
