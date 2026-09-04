import type { Request } from "express";
import type { Network } from "@x402/core/types";
export type PricingResolver = (request: Request) => string | Promise<string>;
export type PaymentRouteOptions = {
    path: string;
    method?: string;
    pricing: PricingResolver;
    description: string;
    network?: Network;
    extensions?: Record<string, unknown>;
    mimeType?: string;
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
