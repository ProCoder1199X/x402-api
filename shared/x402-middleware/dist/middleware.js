"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentMiddleware = void 0;
const express_1 = require("@x402/express");
const server_1 = require("@x402/core/server");
const server_2 = require("@x402/evm/exact/server");
const bazaar_1 = require("@x402/extensions/bazaar");
const createPaymentMiddleware = (options, route) => {
    const handlers = new Map();
    const method = (route.method ?? "GET").toUpperCase();
    return async (request, response, next) => {
        const price = await route.pricing(request);
        const key = `${method}:${route.path}:${price}`;
        let handler = handlers.get(key);
        if (!handler) {
            const facilitator = new server_1.HTTPFacilitatorClient({
                url: options.facilitatorUrl,
                createAuthHeaders: options.createAuthHeaders
            });
            const server = (0, server_2.registerExactEvmScheme)(new server_1.x402ResourceServer(facilitator).registerExtension(bazaar_1.bazaarResourceServerExtension), { networks: [route.network ?? options.network ?? "eip155:8453"] });
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
            handler = (0, express_1.paymentMiddleware)(routes, server);
            handlers.set(key, handler);
        }
        await handler(request, response, next);
    };
};
exports.createPaymentMiddleware = createPaymentMiddleware;
