declare module "x402-fetch" {
  import type { Account } from "viem";

  export function wrapFetchWithPayment(
    fetchFunction: typeof fetch,
    account: Account
  ): typeof fetch;
}