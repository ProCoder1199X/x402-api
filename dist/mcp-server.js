"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const fetch_1 = require("@x402/fetch");
const accounts_1 = require("viem/accounts");
const zod_1 = require("zod");
const AGENT_PRIVATE_KEY = process.env.AGENT_WALLET_PRIVATE_KEY;
const API_BASE_URL = process.env.API_BASE_URL || "https://x402-api-91r3.vercel.app";
if (!AGENT_PRIVATE_KEY) {
    console.error("FATAL: AGENT_WALLET_PRIVATE_KEY is required to pay for tool calls");
    process.exit(1);
}
const account = (0, accounts_1.privateKeyToAccount)(AGENT_PRIVATE_KEY);
const fetchWithPay = (0, fetch_1.wrapFetchWithPayment)(fetch, account);
const server = new mcp_js_1.McpServer({
    name: "x402-scraped-data",
    version: "1.0.0",
});
server.registerTool("get_scraped_data", {
    description: "Fetches scraped JSON data for a target URL. Costs $0.01 USDC on Base per call, paid automatically from the configured wallet.",
    inputSchema: {
        target: zod_1.z.string().url().describe("The URL to fetch scraped data for"),
    },
}, async ({ target }) => {
    const url = `${API_BASE_URL}/api/scraped-data?target=${encodeURIComponent(target)}`;
    const res = await fetchWithPay(url);
    if (!res.ok) {
        const errorText = await res.text();
        return {
            content: [
                {
                    type: "text",
                    text: `Request failed with status ${res.status}: ${errorText}`,
                },
            ],
            isError: true,
        };
    }
    const json = await res.json();
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(json, null, 2),
            },
        ],
    };
});
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("x402 MCP server running on stdio");
}
void main();
