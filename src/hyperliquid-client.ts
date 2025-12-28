import { Hyperliquid } from "hyperliquid";

/**
 * Hyperliquid API Client
 * Wrapper around the hyperliquid SDK to match the interface expected by the bot
 * Docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
 */

interface HyperliquidCandle {
  t: number; // timestamp
  o: string; // open
  h: string; // high
  l: string; // low
  c: string; // close
  v: string; // volume
}

interface HyperliquidMeta {
  universe?: Array<{ name: string; assetId?: number; szDecimals?: number }>;
}

interface HyperliquidClearinghouse {
  marginSummary?: { accountValue?: string; totalMarginUsed?: string };
  assetPositions?: Array<{
    position?: {
      coin?: string;
      szi?: string;
      entryPx?: string;
      unrealizedPnl?: string;
      leverage?: { value?: number };
    };
  }>;
}

interface HyperliquidOrder {
  coin: string;
  oid: number;
}

export class HyperliquidClient {
  private sdk: Hyperliquid;
  private walletAddress: string;
  private isConnected: boolean = false;

  constructor(privateKey: string, walletAddress?: string) {
    this.sdk = new Hyperliquid({
      privateKey,
      testnet: false,
      walletAddress: walletAddress,
    });
    this.walletAddress = walletAddress || "";
  }

  /**
   * Connect to Hyperliquid (required before using WebSocket features)
   */
  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.sdk.connect();
      this.isConnected = true;
    }
  }

  /**
   * Disconnect from Hyperliquid
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.sdk.disconnect();
      this.isConnected = false;
    }
  }

  // ============================================================================
  // PUBLIC ENDPOINTS (Market Data)
  // ============================================================================

  /**
   * Get candle/kline data
   * @param symbol - e.g., "BTC" (will be converted to "BTC-PERP" internally)
   * @param interval - e.g., "5m", "15m", "1h"
   * @param limit - number of candles to fetch
   */
  async getCandles(symbol: string, interval: string, limit = 500): Promise<any[]> {
    // Convert MEXC-style symbol to Hyperliquid format
    // MEXC: "BTC_USDT" -> Hyperliquid: "BTC"
    const coin = this.normalizeSymbol(symbol);

    // Convert interval format
    // Bot uses: "Min5", "Min15", etc.
    // Hyperliquid uses: "5m", "15m", etc.
    const hlInterval = this.convertInterval(interval);

    // Calculate start time (limit * interval in ms)
    const intervalMs = this.getIntervalMs(hlInterval);
    const endTime = Date.now();
    const startTime = endTime - limit * intervalMs;

    try {
      // Use the REST API for candles
      const response = await fetch("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "candleSnapshot",
          req: {
            coin,
            interval: hlInterval,
            startTime,
            endTime,
          },
        }),
      });

      const data = await response.json();

      if (!Array.isArray(data)) {
        console.error("Unexpected candle response:", data);
        return [];
      }

      // Convert to our Candle format
      return data.map((c: HyperliquidCandle) => ({
        time: c.t / 1000, // Convert to seconds for compatibility
        open: c.o,
        high: c.h,
        low: c.l,
        close: c.c,
        vol: c.v,
      }));
    } catch (error) {
      console.error("Failed to fetch candles:", error);
      throw error;
    }
  }

  /**
   * Get current ticker/price
   */
  async getTicker(symbol: string): Promise<any> {
    const coin = this.normalizeSymbol(symbol);

    try {
      const response = await fetch("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "allMids",
        }),
      });

      const mids = (await response.json()) as Record<string, string>;
      const price = mids[coin];

      return {
        symbol: coin,
        lastPrice: price,
        last: price,
      };
    } catch (error) {
      console.error("Failed to fetch ticker:", error);
      throw error;
    }
  }

  /**
   * Get asset metadata (for min order size, etc.)
   */
  async getAssetMeta(symbol: string): Promise<any> {
    const coin = this.normalizeSymbol(symbol);

    try {
      const response = await fetch("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "meta",
        }),
      });

      const meta = (await response.json()) as HyperliquidMeta;
      const assetMeta = meta.universe?.find((a) => a.name === coin);

      return assetMeta || null;
    } catch (error) {
      console.error("Failed to fetch asset meta:", error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE ENDPOINTS (Authenticated)
  // ============================================================================

  /**
   * Get account info / balances
   */
  async getAccountInfo(): Promise<any> {
    try {
      const response = await fetch("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "clearinghouseState",
          user: this.walletAddress,
        }),
      });

      const data = (await response.json()) as HyperliquidClearinghouse;

      // Convert to array format similar to MEXC for compatibility
      return [
        {
          currency: "USDC",
          availableBalance: data.marginSummary?.accountValue || "0",
          equity: data.marginSummary?.accountValue || "0",
          positionMargin: data.marginSummary?.totalMarginUsed || "0",
        },
      ];
    } catch (error) {
      console.error("Failed to fetch account info:", error);
      throw error;
    }
  }

  /**
   * Get open positions
   */
  async getPositions(symbol?: string): Promise<any[]> {
    try {
      const response = await fetch("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "clearinghouseState",
          user: this.walletAddress,
        }),
      });

      const data = (await response.json()) as HyperliquidClearinghouse;
      let positions = data.assetPositions || [];

      // Filter by symbol if provided
      if (symbol) {
        const coin = this.normalizeSymbol(symbol);
        positions = positions.filter((p) => p.position?.coin === coin);
      }

      // Convert to MEXC-compatible format
      return positions
        .filter((p) => parseFloat(p.position?.szi || "0") !== 0)
        .map((p) => ({
          symbol: (p.position?.coin || "") + "_USDC",
          positionType: parseFloat(p.position?.szi || "0") > 0 ? 1 : 2, // 1 = long, 2 = short
          holdVol: Math.abs(parseFloat(p.position?.szi || "0")).toString(),
          openAvgPrice: p.position?.entryPx || "0",
          unrealizedPnl: p.position?.unrealizedPnl || "0",
          leverage: p.position?.leverage?.value || 1,
        }));
    } catch (error) {
      console.error("Failed to fetch positions:", error);
      throw error;
    }
  }

  /**
   * Set leverage for a symbol
   * Note: Hyperliquid uses cross margin by default
   */
  async setLeverage(
    symbol: string,
    leverage: number,
    _positionType: number = 1,
    _openType: number = 1
  ): Promise<any> {
    const coin = this.normalizeSymbol(symbol);

    try {
      // Get asset index
      const meta = await this.getAssetMeta(symbol);
      if (!meta) {
        throw new Error(`Asset ${coin} not found`);
      }

      // Use the SDK's updateLeverage method
      // Signature: updateLeverage(symbol: string, leverageMode: string, leverage: number)
      const result = await this.sdk.exchange.updateLeverage(
        coin,
        "cross", // Hyperliquid primarily uses cross margin
        leverage
      );

      return result;
    } catch (error: any) {
      // Leverage might already be set
      console.log(`Leverage setting note: ${error.message || error}`);
      return { success: true, message: "Leverage may already be set" };
    }
  }

  /**
   * Place order
   */
  async placeOrder(params: {
    symbol: string;
    side: 1 | 2 | 3 | 4; // 1=open long, 2=close short, 3=open short, 4=close long
    type: 1 | 2 | 3 | 4 | 5 | 6; // 5=market
    vol: number;
    price?: number;
    stopLossPrice?: number;
    takeProfitPrice?: number;
    openType?: 1 | 2;
    leverage?: number;
  }): Promise<any> {
    const coin = this.normalizeSymbol(params.symbol);
    const isBuy = params.side === 1 || params.side === 2; // 1=open long, 2=close short
    const isReduceOnly = params.side === 2 || params.side === 4; // closing positions

    // For market orders, we need to get current price and add slippage
    let limitPx = params.price;
    if (!limitPx || params.type === 5) {
      const ticker = await this.getTicker(params.symbol);
      const currentPrice = parseFloat(ticker.lastPrice);
      // Add 0.5% slippage for market orders
      limitPx = isBuy ? currentPrice * 1.005 : currentPrice * 0.995;
    }

    // Round price to appropriate decimals (5 significant figures)
    limitPx = this.roundPrice(limitPx, 5);

    // Use SDK's placeOrder with proper typing
    const tif = params.type === 5 ? "Ioc" : "Gtc";

    try {
      const result = await this.sdk.exchange.placeOrder({
        coin,
        is_buy: isBuy,
        sz: params.vol,
        limit_px: limitPx,
        order_type: { limit: { tif: tif as "Gtc" | "Ioc" } },
        reduce_only: isReduceOnly,
      });

      // If TP/SL prices provided, place those orders too
      if (params.stopLossPrice || params.takeProfitPrice) {
        await this.placeTpSlOrders(
          coin,
          isBuy,
          params.vol,
          params.stopLossPrice,
          params.takeProfitPrice
        );
      }

      return result;
    } catch (error) {
      console.error("Failed to place order:", error);
      throw error;
    }
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
    // Set leverage first
    await this.setLeverage(symbol, leverage);

    return this.placeOrder({
      symbol,
      side: side === "long" ? 1 : 3,
      type: 5, // Market order
      vol,
      leverage,
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
      side: side === "long" ? 4 : 2, // 4=close long, 2=close short
      type: 5, // Market order
      vol,
    });
  }

  /**
   * Cancel all orders for symbol
   */
  async cancelAllOrders(symbol: string): Promise<any> {
    const coin = this.normalizeSymbol(symbol);

    try {
      // Get open orders first
      const response = await fetch("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "openOrders",
          user: this.walletAddress,
        }),
      });

      const orders = (await response.json()) as HyperliquidOrder[];
      const symbolOrders = orders.filter((o) => o.coin === coin);

      // Cancel each order
      const cancelPromises = symbolOrders.map((order) =>
        this.sdk.exchange.cancelOrder({
          coin,
          o: order.oid,
        })
      );

      return Promise.all(cancelPromises);
    } catch (error) {
      console.error("Failed to cancel orders:", error);
      throw error;
    }
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol: string): Promise<any[]> {
    const coin = this.normalizeSymbol(symbol);

    try {
      const response = await fetch("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "openOrders",
          user: this.walletAddress,
        }),
      });

      const orders = (await response.json()) as HyperliquidOrder[];
      return orders.filter((o) => o.coin === coin);
    } catch (error) {
      console.error("Failed to fetch open orders:", error);
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Place TP/SL orders after main order
   */
  private async placeTpSlOrders(
    coin: string,
    isLong: boolean,
    size: number,
    stopLossPrice?: number,
    takeProfitPrice?: number
  ): Promise<void> {
    const orders: any[] = [];

    if (stopLossPrice) {
      orders.push({
        coin,
        is_buy: !isLong, // Opposite direction to close
        sz: size,
        limit_px: this.roundPrice(stopLossPrice),
        order_type: {
          trigger: {
            triggerPx: this.roundPrice(stopLossPrice),
            isMarket: true,
            tpsl: "sl",
          },
        },
        reduce_only: true,
      });
    }

    if (takeProfitPrice) {
      orders.push({
        coin,
        is_buy: !isLong,
        sz: size,
        limit_px: this.roundPrice(takeProfitPrice),
        order_type: {
          trigger: {
            triggerPx: this.roundPrice(takeProfitPrice),
            isMarket: true,
            tpsl: "tp",
          },
        },
        reduce_only: true,
      });
    }

    for (const order of orders) {
      try {
        await this.sdk.exchange.placeOrder(order);
      } catch (error) {
        console.error("Failed to place TP/SL order:", error);
      }
    }
  }

  /**
   * Convert MEXC-style symbol to Hyperliquid format
   * "BTC_USDT" -> "BTC"
   */
  private normalizeSymbol(symbol: string): string {
    // Remove _USDT, _USDC, -PERP suffixes
    return symbol
      .replace(/_USDT$/, "")
      .replace(/_USDC$/, "")
      .replace(/-PERP$/, "")
      .replace(/-SPOT$/, "");
  }

  /**
   * Convert interval format
   * "Min5" -> "5m", "Min15" -> "15m", "Hour4" -> "4h"
   */
  private convertInterval(interval: string): string {
    const map: Record<string, string> = {
      Min1: "1m",
      Min5: "5m",
      Min15: "15m",
      Min30: "30m",
      Min60: "1h",
      Hour1: "1h",
      Hour4: "4h",
      Day1: "1d",
    };
    return map[interval] || interval;
  }

  /**
   * Get interval duration in milliseconds
   */
  private getIntervalMs(interval: string): number {
    const map: Record<string, number> = {
      "1m": 60 * 1000,
      "5m": 5 * 60 * 1000,
      "15m": 15 * 60 * 1000,
      "30m": 30 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "4h": 4 * 60 * 60 * 1000,
      "1d": 24 * 60 * 60 * 1000,
    };
    return map[interval] || 5 * 60 * 1000;
  }

  /**
   * Round price to appropriate decimal places for Hyperliquid
   */
  private roundPrice(price: number, significantFigures: number = 5): number {
    // Use significant figures for rounding
    if (price === 0) return 0;
    const magnitude = Math.floor(Math.log10(Math.abs(price)));
    const scale = Math.pow(10, significantFigures - magnitude - 1);
    return Math.round(price * scale) / scale;
  }
}
