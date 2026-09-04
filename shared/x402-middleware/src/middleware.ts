import type { RequestHandler } from "express";
import { paymentMiddleware } from "@x402/express";
import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { bazaarResourceServerExtension } from "@x402/extensions/bazaar";
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
      const facilitator = new HTTPFacilitatorClient({
        url: options.facilitatorUrl,
        createAuthHeaders: options.createAuthHeaders
      });
      const server = registerExactEvmScheme(
        new x402ResourceServer(facilitator).registerExtension(bazaarResourceServerExtension),
        { networks: [route.network ?? options.network ?? "eip155:8453"] }
      );
      const routes = {
        [`${method} ${route.path}`]: {
          accepts: {
            scheme: "exact",
            price,
            network: route.network ?? options.network ?? "eip155:8453",
            payTo: options.payTo,
            maxTimeoutSeconds: 300
          },
          description: route.description,
          mimeType: route.mimeType ?? "application/json",
          extensions: route.extensions
        }
      };
      handler = paymentMiddleware(routes, server);
      handlers.set(key, handler);
    }

    await handler(request, response, next);
  };
};
