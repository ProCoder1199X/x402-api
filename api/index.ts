import express, { Request, Response, NextFunction } from "express";
import { paymentMiddleware, Network } from "x402-express";
import { declareDiscoveryExtension, bazaarResourceServerExtension } from "@x402/extensions/bazaar";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const WALLET_ADDRESS = process.env.WALLET_ADDRESS as `0x${string}`;
const NETWORK = (process.env.NETWORK || "base") as Network;
const FACILITATOR_URL = (process.env.FACILITATOR_URL || "https://api.cdp.coinbase.com/platform/x402") as `${string}://${string}`;
const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID || "";
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET || "";

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", network: NETWORK, wallet: WALLET_ADDRESS });
});

try {
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
          extensions: {
            ...declareDiscoveryExtension({
              input: { target: "https://example.com" },
              inputSchema: {
                properties: {
                  target: { type: "string", description: "URL to scrape data for" },
                },
                required: ["target"],
              },
              output: {
                example: {
                  success: true,
                  data: {
                    target: "https://example.com",
                    scrapedAt: "2026-08-17T12:00:00.000Z",
                    title: "Sample title for https://example.com",
                    price: 129.99,
                    inStock: true,
                  },
                },
              },
            }),
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
} catch (err) {
  console.error("Failed to initialize payment middleware:", err);
}

async function scrapeData(target: string): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Extract clean text from HTML
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove scripts
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "") // Remove styles
      .replace(/<[^>]+>/g, " ") // Remove HTML tags
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ") // Collapse whitespace
      .trim();
    
    // Extract title from HTML if available
    const titleMatch = html.match(/<title\b[^<]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "No title found";
    
    return {
      target,
      scrapedAt: new Date().toISOString(),
      title,
      text: text.substring(0, 1000), // First 1000 chars of clean text
      textLength: text.length,
      source: "real-scraper",
      success: true
    };
  } catch (err) {
    throw new Error(`Failed to scrape ${target}: ${(err as Error).message}`);
  }
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

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

export default app;