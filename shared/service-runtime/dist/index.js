"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = exports.paymentOptions = void 0;
require("dotenv/config");
const paymentOptions = () => {
    const payTo = process.env.PAY_TO || process.env.WALLET_ADDRESS;
    if (!payTo || !/^0x[a-fA-F0-9]{40}$/.test(payTo)) {
        throw new Error("PAY_TO must be a valid EVM address");
    }
    const facilitatorUrl = process.env.FACILITATOR_URL || "https://api.cdp.coinbase.com/platform/x402";
    const keyId = process.env.CDP_API_KEY_ID || "";
    const keySecret = process.env.CDP_API_KEY_SECRET || "";
    const basic = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    return {
        payTo: payTo,
        network: (process.env.NETWORK || "base"),
        facilitatorUrl: facilitatorUrl,
        createAuthHeaders: async () => ({
            verify: { Authorization: `Basic ${basic}` },
            settle: { Authorization: `Basic ${basic}` },
            supported: { Authorization: `Basic ${basic}` }
        })
    };
};
exports.paymentOptions = paymentOptions;
const start = (app) => {
    const port = Number(process.env.PORT || 3000);
    app.listen(port, "0.0.0.0", () => {
        console.log(`${process.env.SERVICE_NAME || "x402-service"} listening on ${port}`);
    });
};
exports.start = start;
