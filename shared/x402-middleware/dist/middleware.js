"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentMiddleware = void 0;
const x402_express_1 = require("x402-express");
const createPaymentMiddleware = (options, route) => {
    const handlers = new Map();
    const method = (route.method ?? "GET").toUpperCase();
    return async (request, response, next) => {
        const price = await route.pricing(request);
        const key = `${method}:${route.path}:${price}`;
        let handler = handlers.get(key);
        if (!handler) {
            const routes = {
                [`${method} ${route.path}`]: {
                    price,
                    network: route.network ?? options.network ?? "base",
                    config: { description: route.description }
                }
            };
            handler = (0, x402_express_1.paymentMiddleware)(options.payTo, routes, {
                url: options.facilitatorUrl,
                createAuthHeaders: options.createAuthHeaders
            });
            handlers.set(key, handler);
        }
        await handler(request, response, next);
    };
};
exports.createPaymentMiddleware = createPaymentMiddleware;
