import "dotenv/config";
import { wrapFetchWithPayment } from "x402-fetch";
import { privateKeyToAccount } from "viem/accounts";

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:8080";
const privateKey = process.env.AGENT_WALLET_PRIVATE_KEY as `0x${string}` | undefined;

const unpaid = [
  ["alpharoute", "/api/v1/quote?tokenIn=0x0000000000000000000000000000000000000001&tokenOut=0x0000000000000000000000000000000000000002&amountIn=1000&chainId=8453"],
  ["sentinelfeed", "/api/v1/events?topic=token_launch"],
  ["complyrail", "/api/v1/screen/transaction?from=0x0000000000000000000000000000000000000001&to=0x0000000000000000000000000000000000000002&amount=1&asset=USDC"],
  ["distillforge", "/api/v1/models"],
  ["proofmesh", "/api/v1/verify/status/stub-proof"]
] as const;

async function main(): Promise<void> {
  for (const [service, path] of unpaid) {
    const response = await fetch(`${baseUrl}/${service}${path}`);
    console.log(`${service}: unpaid request -> ${response.status} (expected 402)`);
  }

  if (!privateKey) {
    console.log("Set AGENT_WALLET_PRIVATE_KEY to run signed payment retries.");
    return;
  }

  const paidFetch = wrapFetchWithPayment(fetch, privateKeyToAccount(privateKey));
  for (const [service, path] of unpaid) {
    const response = await paidFetch(`${baseUrl}/${service}${path}`);
    console.log(`${service}: signed retry -> ${response.status} (expected 200 or 202)`);
  }
}

void main();
