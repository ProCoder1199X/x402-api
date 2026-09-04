import type { RequestHandler } from "express";
import { paymentMiddleware, type RoutesConfig } from "x402-express";
import type { MiddlewareOptions, PaymentRouteOptions } from "./types";

export const createPaymentMiddleware = (
  options: MiddlewareOptions,
  route: PaymentRouteOptions
): RequestHandler => {
  const handlers = new Map<string, RequestHandler>();
  const method = (route.method ?? "GET").toUpperCase();

  return async (request, response, next) => {
    const price = await route.pricing(request);
    const key = `${method}:${route.path}:${price}`;
    let handler = handlers.get(key);

    if (!handler) {
      const routes: RoutesConfig = {
        [`${method} ${route.path}`]: {
          price,
          network: route.network ?? options.network ?? "base",
          config: { description: route.description }
        }
      };
      handler = paymentMiddleware(options.payTo, routes, {
        url: options.facilitatorUrl,
        createAuthHeaders: options.createAuthHeaders
      });
      handlers.set(key, handler);
    }

    await handler(request, response, next);
  };
};
