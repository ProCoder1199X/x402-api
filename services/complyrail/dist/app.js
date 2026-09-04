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
app.use((0, x402_middleware_1.createPaymentMiddleware)(payment, { path: "/api/v1/screen/wallet/*", pricing: (0, x402_middleware_1.flatPrice)("$0.01"), description: "Wallet sanctions screening" }));
app.get("/api/v1/screen/wallet/:address", (request, response) => response.json({ address: request.params.address, sanctioned: false, riskScore: 0 }));
app.use((0, x402_middleware_1.createPaymentMiddleware)(payment, { path: "/api/v1/screen/transaction", pricing: (0, x402_middleware_1.notionalPrice)({ base: 0.35, basisPoints: 0, minimum: 0.35, readNotional: () => 0 }), description: "Signed transaction compliance attestation" }));
app.get("/api/v1/screen/transaction", (request, response) => {
    const from = String(request.query.from || "");
    const to = String(request.query.to || "");
    const amount = String(request.query.amount || "");
    const asset = String(request.query.asset || "").toUpperCase();
    if (!/^0x[a-fA-F0-9]{40}$/.test(from) || !/^0x[a-fA-F0-9]{40}$/.test(to))
        return response.status(400).json({ error: "from and to must be EVM addresses" });
    if (!/^\d+(\.\d+)?$/.test(amount) || Number(amount) <= 0)
        return response.status(400).json({ error: "amount must be a positive decimal" });
    if (!asset || asset.length > 20)
        return response.status(400).json({ error: "asset is required" });
    const digest = (0, node_crypto_1.createHash)("sha256").update(`${from.toLowerCase()}:${to.toLowerCase()}:${amount}:${asset}`).digest("hex");
    const riskScore = Number((Number.parseInt(digest.slice(0, 4), 16) / 65535).toFixed(4));
    const sanctioned = riskScore >= 0.98;
    const payload = JSON.stringify({ from: from.toLowerCase(), to: to.toLowerCase(), amount, asset, riskScore, sanctioned, issuedAt: "2099-01-01T00:00:00.000Z", nonce: digest.slice(0, 32) });
    return response.json({ from, to, amount, asset, riskScore, sanctioned, decision: sanctioned ? "block" : riskScore >= 0.75 ? "review" : "allow", attestation: { payload, signature: `0x${digest}${digest}`, signerAddress: "0x0000000000000000000000000000000000000000", issuedAt: "2099-01-01T00:00:00.000Z", policyVersion: "complyrail-stub-1" }, settlementTxHash: null });
});
app.use((0, x402_middleware_1.createPaymentMiddleware)(payment, { path: "/api/v1/attest/batch", method: "POST", pricing: (0, x402_middleware_1.flatPrice)("$0.10"), description: "Batch compliance attestations" }));
app.post("/api/v1/attest/batch", (_request, response) => response.json({ attestations: [] }));
app.use((0, x402_middleware_1.createPaymentMiddleware)(payment, { path: "/health", pricing: (0, x402_middleware_1.flatPrice)("$0.001"), description: "Paid ComplyRail health request" }));
app.get("/health", (_request, response) => response.json({ status: "ok", service: "complyrail" }));
exports.default = app;
