import type { Request } from "express";
import type { PricingResolver } from "./types";

export const flatPrice = (price: string): PricingResolver => () => price;

export const tieredPrice = (
  selector: (request: Request) => string,
  prices: Record<string, string>,
  fallback: string
): PricingResolver => (request) => prices[selector(request)] ?? fallback;

export const notionalPrice = (options: {
  base: number;
  basisPoints: number;
  minimum?: number;
  readNotional: (request: Request) => number;
}): PricingResolver => (request) => {
  const amount = options.base + options.readNotional(request) * options.basisPoints / 10_000;
  return `$${Math.max(options.minimum ?? 0, amount).toFixed(6)}`;
};

export const tokenUsagePrice = (options: {
  pricePerThousandTokens: number;
  minimum?: number;
  readTokens: (request: Request) => number;
}): PricingResolver => (request) => {
  const amount = options.readTokens(request) / 1_000 * options.pricePerThousandTokens;
  return `$${Math.max(options.minimum ?? 0, amount).toFixed(6)}`;
};

export const prepaidPrice = (price: string): PricingResolver => () => price;
