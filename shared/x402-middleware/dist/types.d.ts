import type { Request } from "express";
import type { Network, RouteConfig } from "x402-express";
export type PricingResolver = (request: Request) => string | Promise<string>;
export type PaymentRouteOptions = {
    path: string;
    method?: string;
    pricing: PricingResolver;
    description: string;
    network?: Network;
};
export type MiddlewareOptions = {
    payTo: `0x${string}`;
    network?: Network;
    facilitatorUrl: `${string}://${string}`;
    createAuthHeaders?: () => Promise<{
        verify: Record<string, string>;
        settle: Record<string, string>;
        supported: Record<string, string>;
        list?: Record<string, string>;
    }>;
};
export type ResolvedRouteConfig = RouteConfig & {
    config: {
        description: string;
    };
};
