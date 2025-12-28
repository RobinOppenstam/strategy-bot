export declare class HyperliquidClient {
    private sdk;
    private walletAddress;
    private isConnected;
    constructor(privateKey: string, walletAddress?: string);
    /**
     * Connect to Hyperliquid (required before using WebSocket features)
     */
    connect(): Promise<void>;
    /**
     * Disconnect from Hyperliquid
     */
    disconnect(): Promise<void>;
    /**
     * Get candle/kline data
     * @param symbol - e.g., "BTC" (will be converted to "BTC-PERP" internally)
     * @param interval - e.g., "5m", "15m", "1h"
     * @param limit - number of candles to fetch
     */
    getCandles(symbol: string, interval: string, limit?: number): Promise<any[]>;
    /**
     * Get current ticker/price
     */
    getTicker(symbol: string): Promise<any>;
    /**
     * Get asset metadata (for min order size, etc.)
     */
    getAssetMeta(symbol: string): Promise<any>;
    /**
     * Get account info / balances
     */
    getAccountInfo(): Promise<any>;
    /**
     * Get open positions
     */
    getPositions(symbol?: string): Promise<any[]>;
    /**
     * Set leverage for a symbol
     * Note: Hyperliquid uses cross margin by default
     */
    setLeverage(symbol: string, leverage: number, _positionType?: number, _openType?: number): Promise<any>;
    /**
     * Place order
     */
    placeOrder(params: {
        symbol: string;
        side: 1 | 2 | 3 | 4;
        type: 1 | 2 | 3 | 4 | 5 | 6;
        vol: number;
        price?: number;
        stopLossPrice?: number;
        takeProfitPrice?: number;
        openType?: 1 | 2;
        leverage?: number;
    }): Promise<any>;
    /**
     * Place market order with TP/SL
     */
    placeMarketOrder(symbol: string, side: "long" | "short", vol: number, leverage: number, stopLossPrice?: number, takeProfitPrice?: number): Promise<any>;
    /**
     * Close position with market order
     */
    closePosition(symbol: string, side: "long" | "short", vol: number): Promise<any>;
    /**
     * Cancel all orders for symbol
     */
    cancelAllOrders(symbol: string): Promise<any>;
    /**
     * Get open orders
     */
    getOpenOrders(symbol: string): Promise<any[]>;
    /**
     * Place TP/SL orders after main order
     */
    private placeTpSlOrders;
    /**
     * Convert MEXC-style symbol to Hyperliquid format
     * "BTC_USDT" -> "BTC"
     */
    private normalizeSymbol;
    /**
     * Convert interval format
     * "Min5" -> "5m", "Min15" -> "15m", "Hour4" -> "4h"
     */
    private convertInterval;
    /**
     * Get interval duration in milliseconds
     */
    private getIntervalMs;
    /**
     * Round price to appropriate decimal places for Hyperliquid
     */
    private roundPrice;
}
