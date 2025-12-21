import crypto from "crypto";

// MEXC API Response types
interface MexcPrivateResponse {
  code: number;
  data: any;
  msg?: string;
}

interface MexcPublicResponse {
  success: boolean;
  code?: number;
  msg?: string;
  data: any;
}

/**
 * MEXC Futures API Client
 * Docs: https://mexcdevelop.github.io/apidocs/contract_v1_en/
 */
export class MexcClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl = "https://contract.mexc.com";

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  // ============================================================================
  // SIGNATURE
  // ============================================================================

  private sign(timestamp: string, params: Record<string, any> = {}): string {
    // MEXC signature: HMAC SHA256 of query string
    const queryString = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");

    const signString = this.apiKey + timestamp + queryString;
    return crypto
      .createHmac("sha256", this.apiSecret)
      .update(signString)
      .digest("hex");
  }

  private async request(
    method: "GET" | "POST" | "DELETE",
    endpoint: string,
    params: Record<string, any> = {},
    signed = false
  ): Promise<any> {
    const timestamp = Date.now().toString();
    const url = new URL(endpoint, this.baseUrl);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (signed) {
      headers["ApiKey"] = this.apiKey;
      headers["Request-Time"] = timestamp;
      headers["Signature"] = this.sign(timestamp, params);
    }

    let body: string | undefined;
    if (method === "GET") {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    } else {
      body = JSON.stringify(params);
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body,
    });

    const data = (await response.json()) as MexcPrivateResponse;

    if (data.code !== 0) {
      throw new Error(`MEXC API Error: ${data.code} - ${data.msg}`);
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
  async getCandles(
    symbol: string,
    interval: string,
    limit = 500
  ): Promise<any[]> {
    // Public endpoint - no signature needed
    const url = `${this.baseUrl}/api/v1/contract/kline/${symbol}`;
    
    const params = new URLSearchParams({
      interval,
      // start and end are optional, omit to get latest candles
    });

    const response = await fetch(`${url}?${params}`);
    const data = (await response.json()) as MexcPublicResponse;

    if (!data.success) {
      throw new Error(`MEXC API Error: ${data.code} - ${data.msg}`);
    }

    // data.data could be an object with nested arrays or directly an array
    const candles = Array.isArray(data.data) ? data.data : data.data?.time ?
      // If it's an object with time/open/close/etc arrays, restructure it
      data.data.time.map((t: number, i: number) => ({
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
  async getTicker(symbol: string): Promise<any> {
    const url = `${this.baseUrl}/api/v1/contract/ticker?symbol=${symbol}`;
    const response = await fetch(url);
    const data = (await response.json()) as MexcPublicResponse;

    if (!data.success) {
      throw new Error(`MEXC API Error: ${data.code} - ${data.msg}`);
    }

    return data.data;
  }

  /**
   * Get contract details (for min order size, etc.)
   * Endpoint: GET /api/v1/contract/detail
   */
  async getContractDetail(symbol: string): Promise<any> {
    const url = `${this.baseUrl}/api/v1/contract/detail?symbol=${symbol}`;
    const response = await fetch(url);
    const data = (await response.json()) as MexcPublicResponse;

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
  async getAccountInfo(): Promise<any> {
    return this.request("GET", "/api/v1/private/account/assets", {}, true);
  }

  /**
   * Get open positions
   */
  async getPositions(symbol?: string): Promise<any[]> {
    const params: Record<string, any> = {};
    if (symbol) params.symbol = symbol;
    return this.request("GET", "/api/v1/private/position/open_positions", params, true);
  }

  /**
   * Set leverage
   */
  async setLeverage(symbol: string, leverage: number, openType: number = 1): Promise<any> {
    return this.request("POST", "/api/v1/private/position/change_leverage", {
      symbol,
      leverage,
      openType, // 1 = isolated, 2 = cross
    }, true);
  }

  /**
   * Place order
   * 
   * side: 1 = open long, 2 = close short, 3 = open short, 4 = close long
   * type: 1 = limit, 2 = post-only, 3 = IOC, 4 = FOK, 5 = market, 6 = trigger (stop)
   */
  async placeOrder(params: {
    symbol: string;
    side: 1 | 2 | 3 | 4;
    type: 1 | 2 | 3 | 4 | 5 | 6;
    vol: number;
    price?: number;
    stopLossPrice?: number;
    takeProfitPrice?: number;
    openType?: 1 | 2; // 1 = isolated, 2 = cross
    leverage?: number;
  }): Promise<any> {
    const orderParams: Record<string, any> = {
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      vol: params.vol,
      openType: params.openType || 2, // Cross margin default
    };

    if (params.price) orderParams.price = params.price;
    if (params.leverage) orderParams.leverage = params.leverage;
    if (params.stopLossPrice) orderParams.stopLossPrice = params.stopLossPrice;
    if (params.takeProfitPrice) orderParams.takeProfitPrice = params.takeProfitPrice;

    return this.request("POST", "/api/v1/private/order/submit", orderParams, true);
  }

  /**
   * Place market order with TP/SL
   */
  async placeMarketOrder(
    symbol: string,
    side: "long" | "short",
    vol: number,
    leverage: number,
    stopLossPrice?: number,
    takeProfitPrice?: number
  ): Promise<any> {
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
  async closePosition(symbol: string, side: "long" | "short", vol: number): Promise<any> {
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
  async cancelOrder(symbol: string, orderId: string): Promise<any> {
    return this.request("POST", "/api/v1/private/order/cancel", {
      symbol,
      orderId,
    }, true);
  }

  /**
   * Cancel all orders for symbol
   */
  async cancelAllOrders(symbol: string): Promise<any> {
    return this.request("POST", "/api/v1/private/order/cancel_all", {
      symbol,
    }, true);
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol: string): Promise<any[]> {
    return this.request("GET", "/api/v1/private/order/open_orders/" + symbol, {}, true);
  }

  /**
   * Set TP/SL for position
   */
  async setPositionTpSl(
    symbol: string,
    positionId: string,
    stopLossPrice?: number,
    takeProfitPrice?: number
  ): Promise<any> {
    const params: Record<string, any> = { symbol, positionId };
    if (stopLossPrice) params.stopLossPrice = stopLossPrice;
    if (takeProfitPrice) params.takeProfitPrice = takeProfitPrice;

    return this.request("POST", "/api/v1/private/position/change_margin", params, true);
  }
}
