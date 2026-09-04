import express from "express";
import { createPaymentMiddleware, flatPrice } from "@x402/x402-middleware";
import { paymentOptions, start } from "@x402/service-runtime";

const app = express();
app.use(express.json());
const payment = paymentOptions();

app.use(createPaymentMiddleware(payment, { path: "/api/v1/verify/zkproof", method: "POST", pricing: flatPrice("$1.50"), description: "zkML proof generation" }));
app.post("/api/v1/verify/zkproof", (_request, response) => response.status(202).json({ proofId: "stub-proof", settlementTxHash: null, estimatedCompletionSec: 60 }));
app.use(createPaymentMiddleware(payment, { path: "/api/v1/verify/teeattest", method: "POST", pricing: flatPrice("$0.03"), description: "TEE computation attestation" }));
app.post("/api/v1/verify/teeattest", (_request, response) => response.json({ verified: true, attestation: "stub-attestation", settlementTxHash: null }));
app.use(createPaymentMiddleware(payment, { path: "/api/v1/verify/status/:proofId", pricing: flatPrice("$0.001"), description: "Paid proof status polling" }));
app.get("/api/v1/verify/status/:proofId", (request, response) => response.json({ proofId: request.params.proofId, status: "queued", proof: null }));
app.use(createPaymentMiddleware(payment, { path: "/health", pricing: flatPrice("$0.001"), description: "Paid ProofMesh health request" }));
app.get("/health", (_request, response) => response.json({ status: "ok", service: "proofmesh" }));
start(app);
