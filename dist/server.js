"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const x402_express_1 = require("x402-express");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const PORT = process.env.PORT || 4021;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
const NETWORK = (process.env.NETWORK || "base");
const FACILITATOR_URL = (process.env.FACILITATOR_URL || "https://api.cdp.coinbase.com/platform/x402");
const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID || "";
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET || "";
if (!WALLET_ADDRESS || !WALLET_ADDRESS.startsWith("0x") || WALLET_ADDRESS.length !== 42) {
    console.error("FATAL: WALLET_ADDRESS is missing or malformed in .env");
    process.exit(1);
}
if (!CDP_API_KEY_ID || !CDP_API_KEY_SECRET) {
    console.error("FATAL: CDP_API_KEY_ID and CDP_API_KEY_SECRET are required for mainnet payments");
    process.exit(1);
}
// Free, always-open health check — never gated by payment
app.get("/health", (req, res) => {
    res.json({ status: "ok", network: NETWORK, wallet: WALLET_ADDRESS });
});
// Payment gate — mainnet USDC on Base, routed through the CDP facilitator
app.use((0, x402_express_1.paymentMiddleware)(WALLET_ADDRESS, {
    "GET /api/scraped-data": {
        price: "$0.01",
        network: NETWORK,
        config: {
            description: "Returns fresh scraped JSON data for a given target URL",
        },
    },
}, {
    url: FACILITATOR_URL,
    createAuthHeaders: async () => {
        const basicAuth = Buffer.from(`${CDP_API_KEY_ID}:${CDP_API_KEY_SECRET}`).toString("base64");
        return {
            verify: { Authorization: `Basic ${basicAuth}` },
            settle: { Authorization: `Basic ${basicAuth}` },
            supported: { Authorization: `Basic ${basicAuth}` },
        };
    },
}));
// Mock scraper logic — swap this out for your real data/scraping code
async function scrapeData(target) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
        target,
        scrapedAt: new Date().toISOString(),
        title: `Sample title for ${target}`,
        price: 129.99,
        inStock: true,
        metadata: {
            source: "mock-scraper-v1",
            confidence: 0.97,
        },
    };
}
// Protected route — the middleware above only lets traffic through after payment settles
app.get("/api/scraped-data", async (req, res) => {
    try {
        const target = req.query.target || "https://example.com";
        const data = await scrapeData(target);
        console.log(`[${new Date().toISOString()}] Served PAID request for target=${target}`);
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (err) {
        console.error("Scrape error:", err);
        res.status(500).json({
            success: false,
            error: "Internal scraping error",
        });
    }
});
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err.stack);
    res.status(500).json({ success: false, error: "Internal server error" });
});
app.listen(PORT, () => {
    console.log(`x402 API server running on port ${PORT}`);
    console.log(`Network: ${NETWORK} (MAINNET — real USDC)`);
    console.log(`Payments route to: ${WALLET_ADDRESS}`);
    console.log(`Protected route: GET /api/scraped-data — price $0.01 USDC`);
});
