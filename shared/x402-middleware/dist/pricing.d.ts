import type { Request } from "express";
import type { PricingResolver } from "./types";
export declare const flatPrice: (price: string) => PricingResolver;
export declare const tieredPrice: (selector: (request: Request) => string, prices: Record<string, string>, fallback: string) => PricingResolver;
export declare const notionalPrice: (options: {
    base: number;
    basisPoints: number;
    minimum?: number;
    readNotional: (request: Request) => number;
}) => PricingResolver;
export declare const tokenUsagePrice: (options: {
    pricePerThousandTokens: number;
    minimum?: number;
    readTokens: (request: Request) => number;
}) => PricingResolver;
export declare const prepaidPrice: (price: string) => PricingResolver;
