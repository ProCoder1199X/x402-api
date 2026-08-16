import express, { Request, Response, NextFunction } from "express";
import { paymentMiddleware, Network } from "x402-express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const WALLET_ADDRESS = process.env.WALLET_ADDRESS as `0x${string}`;
const NETWORK = (process.env.NETWORK || "base") as Network;
const FACILITATOR_URL = (process.env.FACILITATOR_URL || "https://api.cdp.coinbase.com/platform/x402") as `${string}://${string}`;
const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID || "";
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET || "";

app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "x402 Payment API",
    version: "1.0.0",
    description: "Express server with x402 payment middleware for micropayments",
    endpoints: {
      health: { path: "/health", description: "Health check - no payment required" },
      scraper: { path: "/api/scraped-data", description: "Protected endpoint - requires payment in USDC" }
    }
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", network: NETWORK, wallet: WALLET_ADDRESS });
});

app.use(
  paymentMiddleware(
    WALLET_ADDRESS,
    {
      "GET /api/scraped-data": {
        price: "$0.01",
        network: NETWORK,
        config: {
          description: "Returns fresh scraped JSON data for a given target URL",
        },
      },
    },
    {
      url: FACILITATOR_URL,
      createAuthHeaders: async () => {
        const basicAuth = Buffer.from(`${CDP_API_KEY_ID}:${CDP_API_KEY_SECRET}`).toString("base64");
        return {
          verify: { Authorization: `Basic ${basicAuth}` },
          settle: { Authorization: `Basic ${basicAuth}` },
          supported: { Authorization: `Basic ${basicAuth}` },
        };
      },
    }
  )
);

async function scrapeData(target: string): Promise<Record<string, unknown>> {
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

app.get("/api/scraped-data", async (req: Request, res: Response) => {
  try {
    const target = (req.query.target as string) || "https://example.com";
    const data = await scrapeData(target);
    console.log(`[${new Date().toISOString()}] Served PAID request for target=${target}`);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Scrape error:", err);
    res.status(500).json({ success: false, error: "Internal scraping error" });
  }
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err.message, err.stack);
  res.status(500).json({ success: false, error: "Internal server error", details: err.message });
});

export default app;