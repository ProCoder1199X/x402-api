import express from "express";
import { createPaymentMiddleware, flatPrice, notionalPrice } from "@x402/x402-middleware";
import { paymentOptions, start } from "@x402/service-runtime";

const app = express();
app.use(express.json());
const payment = paymentOptions();

app.use(createPaymentMiddleware(payment, { path: "/api/v1/screen/wallet/:address", pricing: flatPrice("$0.01"), description: "Wallet sanctions screening" }));
app.get("/api/v1/screen/wallet/:address", (request, response) => response.json({ address: request.params.address, sanctioned: false, riskScore: 0 }));
app.use(createPaymentMiddleware(payment, { path: "/api/v1/screen/transaction", pricing: notionalPrice({ base: 0.35, basisPoints: 0, minimum: 0.35, readNotional: () => 0 }), description: "Signed transaction compliance attestation" }));
app.get("/api/v1/screen/transaction", (_request, response) => response.json({ riskScore: 0, sanctioned: false, attestation: { payload: "{}", signature: "0x", signerAddress: "0x0000000000000000000000000000000000000000", issuedAt: new Date().toISOString() }, settlementTxHash: null }));
app.use(createPaymentMiddleware(payment, { path: "/api/v1/attest/batch", method: "POST", pricing: flatPrice("$0.10"), description: "Batch compliance attestations" }));
app.post("/api/v1/attest/batch", (_request, response) => response.json({ attestations: [] }));
app.use(createPaymentMiddleware(payment, { path: "/health", pricing: flatPrice("$0.001"), description: "Paid ComplyRail health request" }));
app.get("/health", (_request, response) => response.json({ status: "ok", service: "complyrail" }));
start(app);
