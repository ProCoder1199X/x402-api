import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { wrapFetchWithPayment } from "x402-fetch";
import { privateKeyToAccount } from "viem/accounts";
import { z } from "zod";

const AGENT_PRIVATE_KEY = process.env.AGENT_WALLET_PRIVATE_KEY as `0x${string}`;
const API_BASE_URL = process.env.API_BASE_URL || "https://x402-api-91r3.vercel.app";

if (!AGENT_PRIVATE_KEY) {
  console.error("FATAL: AGENT_WALLET_PRIVATE_KEY is required to pay for tool calls");
  process.exit(1);
}

const account = privateKeyToAccount(AGENT_PRIVATE_KEY);
const fetchWithPay = wrapFetchWithPayment(fetch, account);

const server = new McpServer({
  name: "x402-scraped-data",
  version: "1.0.0",
});

server.registerTool(
  "get_scraped_data",
  {
    description: "Fetches scraped JSON data for a target URL. Costs $0.01 USDC on Base per call, paid automatically from the configured wallet.",
    inputSchema: {
      target: z.string().url().describe("The URL to fetch scraped data for"),
    },
  },
  async ({ target }: { target: string }) => {
    const url = `${API_BASE_URL}/api/scraped-data?target=${encodeURIComponent(target)}`;
    const res = await fetchWithPay(url);

    if (!res.ok) {
      const errorText = await res.text();
      return {
        content: [
          {
            type: "text" as const,
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
          type: "text" as const,
          text: JSON.stringify(json, null, 2),
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("x402 MCP server running on stdio");
