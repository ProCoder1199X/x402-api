declare module "x402-express" {
  import { RequestHandler } from "express";

  export type Network = "base" | "base-sepolia";

  export interface RouteConfig {
    price: string;
    network: Network;
    config?: {
      description?: string;
    };
  }

  export interface FacilitatorConfig {
    url: `${string}://${string}`;
    createAuthHeaders?: () => Promise<{
      verify: Record<string, string>;
      settle: Record<string, string>;
      supported: Record<string, string>;
      list?: Record<string, string>;
    }>;
  }

  export function paymentMiddleware(
    payTo: string,
    routes: Record<string, RouteConfig>,
    facilitator: FacilitatorConfig
  ): RequestHandler;
}
