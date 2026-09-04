import "dotenv/config";
import type { Express } from "express";
import type { MiddlewareOptions } from "@x402/x402-middleware";
export declare const paymentOptions: () => MiddlewareOptions;
export declare const start: (app: Express) => void;
