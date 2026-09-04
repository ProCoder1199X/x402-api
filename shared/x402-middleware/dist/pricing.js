"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepaidPrice = exports.tokenUsagePrice = exports.notionalPrice = exports.tieredPrice = exports.flatPrice = void 0;
const flatPrice = (price) => () => price;
exports.flatPrice = flatPrice;
const tieredPrice = (selector, prices, fallback) => (request) => prices[selector(request)] ?? fallback;
exports.tieredPrice = tieredPrice;
const notionalPrice = (options) => (request) => {
    const amount = options.base + options.readNotional(request) * options.basisPoints / 10_000;
    return `$${Math.max(options.minimum ?? 0, amount).toFixed(6)}`;
};
exports.notionalPrice = notionalPrice;
const tokenUsagePrice = (options) => (request) => {
    const amount = options.readTokens(request) / 1_000 * options.pricePerThousandTokens;
    return `$${Math.max(options.minimum ?? 0, amount).toFixed(6)}`;
};
exports.tokenUsagePrice = tokenUsagePrice;
const prepaidPrice = (price) => () => price;
exports.prepaidPrice = prepaidPrice;
