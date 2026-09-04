"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_crypto_1 = require("node:crypto");
const bazaar_1 = require("@x402/extensions/bazaar");
const x402_middleware_1 = require("@x402/x402-middleware");
const service_runtime_1 = require("@x402/service-runtime");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const payment = (0, service_runtime_1.paymentOptions)();
const alphaQuoteDiscovery = (0, bazaar_1.declareDiscoveryExtension)({
    input: {
        queryParams: {
            tokenIn: "0x0000000000000000000000000000000000000001",
            tokenOut: "0x0000000000000000000000000000000000000002",
            amountIn: "1000",
            maxSlippageBps: 50,
            chainId: 8453
        }
    },
    inputSchema: {
        properties: {
            queryParams: {
                type: "object",
                properties: {
                    tokenIn: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
                    tokenOut: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
                    amountIn: { type: "string", pattern: "^[0-9]+$" },
                    maxSlippageBps: { type: "integer", minimum: 0, maximum: 10000 },
                    chainId: { type: "integer", enum: [8453] }
                },
                required: ["tokenIn", "tokenOut", "amountIn", "chainId"]
            }
        }
    },
    output: {
        example: {
            routeId: "ar_8f2c4d9a12ab34cd56ef7890",
            chainId: 8453,
            tokenIn: "0x0000000000000000000000000000000000000001",
            tokenOut: "0x0000000000000000000000000000000000000002",
            amountIn: "1000",
            expectedOut: "980",
            priceImpactBps: 47,
            maxSlippageBps: 50,
            selectedVenues: ["uniswap-v4", "aerodrome"],
            routeType: "single-hop",
            calldata: "0x1234...",
            quoteFingerprint: "0xabcd...",
            expiresAt: "2099-01-01T00:00:00.000Z"
        },
        schema: {
            type: "object",
            required: ["routeId", "chainId", "tokenIn", "tokenOut", "amountIn", "expectedOut", "priceImpactBps", "maxSlippageBps", "selectedVenues", "routeType", "calldata", "quoteFingerprint", "expiresAt"],
            properties: {
                routeId: { type: "string" }, chainId: { type: "integer" }, tokenIn: { type: "string" }, tokenOut: { type: "string" }, amountIn: { type: "string" }, expectedOut: { type: "string" }, priceImpactBps: { type: "integer" }, maxSlippageBps: { type: "integer" }, selectedVenues: { type: "array", items: { type: "string" } }, routeType: { type: "string" }, calldata: { type: "string" }, quoteFingerprint: { type: "string" }, expiresAt: { type: "string", format: "date-time" }
            }
        }
    }
});
app.use((0, x402_middleware_1.createPaymentMiddleware)(payment, {
    path: "/api/v1/quote", pricing: (0, x402_middleware_1.tieredPrice)((request) => Number(request.query.amountIn || 0) > 10_000 ? "large" : "standard", { standard: "$0.015", large: "$0.12" }, "$0.015"), description: "AlphaRoute gives autonomous trading agents a deterministic, machine-readable route quote for Base transactions.", extensions: alphaQuoteDiscovery
}));
app.get("/api/v1/quote", (request, response) => {
    const tokenIn = String(request.query.tokenIn || "");
    const tokenOut = String(request.query.tokenOut || "");
    const amountIn = String(request.query.amountIn || "");
    const chainId = Number(request.query.chainId);
    const maxSlippageBps = Number(request.query.maxSlippageBps || 50);
    if (!/^0x[a-fA-F0-9]{40}$/.test(tokenIn) || !/^0x[a-fA-F0-9]{40}$/.test(tokenOut)) {
        return response.status(400).json({ error: "tokenIn and tokenOut must be EVM addresses" });
    }
    if (!/^\d+$/.test(amountIn) || BigInt(amountIn) <= 0n || chainId !== 8453) {
        return response.status(400).json({ error: "amountIn must be positive base units and chainId must be 8453" });
    }
    if (!Number.isInteger(maxSlippageBps) || maxSlippageBps < 0 || maxSlippageBps > 10_000) {
        return response.status(400).json({ error: "maxSlippageBps must be an integer from 0 to 10000" });
    }
    const digest = (0, node_crypto_1.createHash)("sha256").update(`${tokenIn.toLowerCase()}:${tokenOut.toLowerCase()}:${amountIn}:${maxSlippageBps}`).digest("hex");
    const routeId = `ar_${digest.slice(0, 24)}`;
    const inputValue = BigInt(amountIn);
    const expectedOut = (inputValue * BigInt(9_850 - Math.min(maxSlippageBps, 150)) / 10000n).toString();
    const priceImpactBps = 20 + (Number.parseInt(digest.slice(0, 4), 16) % 81);
    return response.json({
        routeId,
        chainId,
        tokenIn,
        tokenOut,
        amountIn,
        expectedOut,
        priceImpactBps,
        maxSlippageBps,
        selectedVenues: ["uniswap-v4", "aerodrome"],
        routeType: BigInt(amountIn) > 10000n ? "multi-hop-split" : "single-hop",
        calldata: `0x${digest}`,
        quoteFingerprint: `0x${digest}`,
        expiresAt: "2099-01-01T00:00:00.000Z"
    });
});
app.use((0, x402_middleware_1.createPaymentMiddleware)(payment, { path: "/api/v1/execute", method: "POST", pricing: (0, x402_middleware_1.notionalPrice)({ base: 0.50, basisPoints: 3, minimum: 0.50, readNotional: (request) => Number(request.body?.notionalUsd || 0) }), description: "MEV-protected route execution" }));
app.post("/api/v1/execute", (request, response) => response.json({ routeId: request.body?.routeId || "stub-route", status: "accepted", settlementTxHash: null }));
for (const path of ["/api/v1/route-status/*", "/health"]) {
    app.use((0, x402_middleware_1.createPaymentMiddleware)(payment, { path, pricing: (0, x402_middleware_1.flatPrice)("$0.001"), description: "Paid AlphaRoute status request" }));
}
app.get("/api/v1/route-status/:routeId", (request, response) => response.json({ routeId: request.params.routeId, status: "pending" }));
app.get("/health", (_request, response) => response.json({ status: "ok", service: "alpharoute" }));
exports.default = app;
