/**
 * MEXC Futures API Client
 * Docs: https://mexcdevelop.github.io/apidocs/contract_v1_en/
 */
export declare class MexcClient {
    private apiKey;
    private apiSecret;
    private baseUrl;
    constructor(apiKey: string, apiSecret: string);
    private sign;
    private request;
    /**
     * Get candle/kline data
     * Endpoint: GET /api/v1/contract/kline/{symbol}
     * No authentication required - this is public data
     */
    getCandles(symbol: string, interval: string, limit?: number): Promise<any[]>;
    /**
     * Get current ticker/price
     * Endpoint: GET /api/v1/contract/ticker
     */
    getTicker(symbol: string): Promise<any>;
    /**
     * Get contract details (for min order size, etc.)
     * Endpoint: GET /api/v1/contract/detail
     */
    getContractDetail(symbol: string): Promise<any>;
    /**
     * Get account info
     */
    getAccountInfo(): Promise<any>;
    /**
     * Get open positions
     */
    getPositions(symbol?: string): Promise<any[]>;
    /**
     * Set leverage
     */
    setLeverage(symbol: string, leverage: number, openType?: number): Promise<any>;
    /**
     * Place order
     *
     * side: 1 = open long, 2 = close short, 3 = open short, 4 = close long
     * type: 1 = limit, 2 = post-only, 3 = IOC, 4 = FOK, 5 = market, 6 = trigger (stop)
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
     * Cancel order
     */
    cancelOrder(symbol: string, orderId: string): Promise<any>;
    /**
     * Cancel all orders for symbol
     */
    cancelAllOrders(symbol: string): Promise<any>;
    /**
     * Get open orders
     */
    getOpenOrders(symbol: string): Promise<any[]>;
    /**
     * Set TP/SL for position
     */
    setPositionTpSl(symbol: string, positionId: string, stopLossPrice?: number, takeProfitPrice?: number): Promise<any>;
}
