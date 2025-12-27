"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MexcClient = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * MEXC Futures API Client
 * Docs: https://mexcdevelop.github.io/apidocs/contract_v1_en/
 */
class MexcClient {
    constructor(apiKey, apiSecret) {
        this.baseUrl = "https://contract.mexc.com";
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
    }
    // ============================================================================
    // SIGNATURE
    // ============================================================================
    sign(timestamp, params = {}, isPost = false) {
        // MEXC signature differs for GET vs POST
        // GET: apiKey + timestamp + sorted query string (key=value&key=value)
        // POST: apiKey + timestamp + JSON string (no sorting needed)
        let paramString;
        if (isPost) {
            // For POST: use JSON string directly
            paramString = Object.keys(params).length > 0 ? JSON.stringify(params) : "";
        }
        else {
            // For GET: sorted key=value pairs
            paramString = Object.keys(params)
                .sort()
                .map((key) => `${key}=${params[key]}`)
                .join("&");
        }
        const signString = this.apiKey + timestamp + paramString;
        return crypto_1.default
            .createHmac("sha256", this.apiSecret)
            .update(signString)
            .digest("hex");
    }
    async request(method, endpoint, params = {}, signed = false) {
        const timestamp = Date.now().toString();
        const url = new URL(endpoint, this.baseUrl);
        const headers = {
            "Content-Type": "application/json",
        };
        // For POST requests, add params to query string for signature
        let signParams = params;
        let body;
        if (method === "GET") {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, String(value));
            });
        }
        else {
            // POST: MEXC requires params as JSON body but signature uses query string format
            body = JSON.stringify(params);
        }
        if (signed) {
            const isPost = method === "POST";
            headers["ApiKey"] = this.apiKey;
            headers["Request-Time"] = timestamp;
            headers["Signature"] = this.sign(timestamp, signParams, isPost);
        }
        const response = await fetch(url.toString(), {
            method,
            headers,
            body,
        });
        const data = (await response.json());
        if (data.code !== 0) {
            throw new Error(`MEXC API Error: ${data.code} - ${data.msg || data.message || 'unknown error'}`);
        }
        return data.data;
    }
    // ============================================================================
    // PUBLIC ENDPOINTS (No API key required!)
    // ============================================================================
    /**
     * Get candle/kline data
     * Endpoint: GET /api/v1/contract/kline/{symbol}
     * No authentication required - this is public data
     */
    async getCandles(symbol, interval, limit = 500) {
        // Public endpoint - no signature needed
        const url = `${this.baseUrl}/api/v1/contract/kline/${symbol}`;
        const params = new URLSearchParams({
            interval,
            // start and end are optional, omit to get latest candles
        });
        const response = await fetch(`${url}?${params}`);
        const data = (await response.json());
        if (!data.success) {
            throw new Error(`MEXC API Error: ${data.code} - ${data.msg}`);
        }
        // data.data could be an object with nested arrays or directly an array
        const candles = Array.isArray(data.data) ? data.data : data.data?.time ?
            // If it's an object with time/open/close/etc arrays, restructure it
            data.data.time.map((t, i) => ({
                time: t,
                open: data.data.open[i],
                high: data.data.high[i],
                low: data.data.low[i],
                close: data.data.close[i],
                vol: data.data.vol[i],
            })) : [];
        // Return last N candles
        return candles.slice(-limit);
    }
    /**
     * Get current ticker/price
     * Endpoint: GET /api/v1/contract/ticker
     */
    async getTicker(symbol) {
        const url = `${this.baseUrl}/api/v1/contract/ticker?symbol=${symbol}`;
        const response = await fetch(url);
        const data = (await response.json());
        if (!data.success) {
            throw new Error(`MEXC API Error: ${data.code} - ${data.msg}`);
        }
        return data.data;
    }
    /**
     * Get contract details (for min order size, etc.)
     * Endpoint: GET /api/v1/contract/detail
     */
    async getContractDetail(symbol) {
        const url = `${this.baseUrl}/api/v1/contract/detail?symbol=${symbol}`;
        const response = await fetch(url);
        const data = (await response.json());
        if (!data.success) {
            throw new Error(`MEXC API Error: ${data.code} - ${data.msg}`);
        }
        return data.data;
    }
    // ============================================================================
    // PRIVATE ENDPOINTS
    // ============================================================================
    /**
     * Get account info
     */
    async getAccountInfo() {
        return this.request("GET", "/api/v1/private/account/assets", {}, true);
    }
    /**
     * Get open positions
     */
    async getPositions(symbol) {
        const params = {};
        if (symbol)
            params.symbol = symbol;
        return this.request("GET", "/api/v1/private/position/open_positions", params, true);
    }
    /**
     * Set leverage
     * positionType: 1 = long, 2 = short
     * openType: 1 = isolated, 2 = cross
     */
    async setLeverage(symbol, leverage, positionType = 1, openType = 1) {
        return this.request("POST", "/api/v1/private/position/change_leverage", {
            symbol,
            leverage,
            positionType,
            openType,
        }, true);
    }
    /**
     * Place order
     *
     * side: 1 = open long, 2 = close short, 3 = open short, 4 = close long
     * type: 1 = limit, 2 = post-only, 3 = IOC, 4 = FOK, 5 = market, 6 = trigger (stop)
     */
    async placeOrder(params) {
        const orderParams = {
            symbol: params.symbol,
            side: params.side,
            type: params.type,
            vol: params.vol,
            openType: params.openType || 2, // Cross margin default
        };
        if (params.price)
            orderParams.price = params.price;
        if (params.leverage)
            orderParams.leverage = params.leverage;
        if (params.stopLossPrice)
            orderParams.stopLossPrice = params.stopLossPrice;
        if (params.takeProfitPrice)
            orderParams.takeProfitPrice = params.takeProfitPrice;
        return this.request("POST", "/api/v1/private/order/submit", orderParams, true);
    }
    /**
     * Place market order with TP/SL
     */
    async placeMarketOrder(symbol, side, vol, leverage, stopLossPrice, takeProfitPrice) {
        return this.placeOrder({
            symbol,
            side: side === "long" ? 1 : 3, // 1 = open long, 3 = open short
            type: 5, // Market order
            vol,
            leverage,
            openType: 2, // Cross margin
            stopLossPrice,
            takeProfitPrice,
        });
    }
    /**
     * Close position with market order
     */
    async closePosition(symbol, side, vol) {
        return this.placeOrder({
            symbol,
            side: side === "long" ? 4 : 2, // 4 = close long, 2 = close short
            type: 5, // Market order
            vol,
        });
    }
    /**
     * Cancel order
     */
    async cancelOrder(symbol, orderId) {
        return this.request("POST", "/api/v1/private/order/cancel", {
            symbol,
            orderId,
        }, true);
    }
    /**
     * Cancel all orders for symbol
     */
    async cancelAllOrders(symbol) {
        return this.request("POST", "/api/v1/private/order/cancel_all", {
            symbol,
        }, true);
    }
    /**
     * Get open orders
     */
    async getOpenOrders(symbol) {
        return this.request("GET", "/api/v1/private/order/open_orders/" + symbol, {}, true);
    }
    /**
     * Set TP/SL for position
     */
    async setPositionTpSl(symbol, positionId, stopLossPrice, takeProfitPrice) {
        const params = { symbol, positionId };
        if (stopLossPrice)
            params.stopLossPrice = stopLossPrice;
        if (takeProfitPrice)
            params.takeProfitPrice = takeProfitPrice;
        return this.request("POST", "/api/v1/private/position/change_margin", params, true);
    }
}
exports.MexcClient = MexcClient;
//# sourceMappingURL=mexc-client.js.map