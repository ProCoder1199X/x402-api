import type { RequestHandler } from "express";
import type { MiddlewareOptions, PaymentRouteOptions } from "./types";
export declare const createPaymentMiddleware: (options: MiddlewareOptions, route: PaymentRouteOptions) => RequestHandler;
