import { Config, Candle, TradeState, PaperTradingState, PaperTrade } from "./types";
/**
 * Generic data client interface for fetching candles
 */
export interface DataClient {
    getCandles(symbol: string, timeframe: string, limit: number): Promise<Candle[]>;
}
/**
 * Generic exchange client interface for trading operations
 */
export interface ExchangeClient {
    getAccountInfo(): Promise<any>;
    getPositions(symbol?: string): Promise<any[]>;
    setLeverage(symbol: string, leverage: number, positionType?: number, openType?: number): Promise<any>;
    placeMarketOrder(symbol: string, side: "long" | "short", vol: number, leverage: number, stopLossPrice?: number, takeProfitPrice?: number): Promise<any>;
    closePosition(symbol: string, side: "long" | "short", vol: number): Promise<any>;
    cancelAllOrders(symbol: string): Promise<any>;
}
export declare class TrendStrategyBot {
    private dataClient;
    private exchangeClient;
    private indicators;
    private config;
    private state;
    private candles;
    private pollingInterval;
    private tag;
    private paperState;
    private tradeIdCounter;
    private sessionId;
    private currentDbTradeId;
    constructor(config: Config, sessionId?: string | null);
    initialize(): Promise<void>;
    /**
     * Restore paper trading state from database after restart
     */
    private restoreFromDatabase;
    private loadHistoricalCandles;
    private syncPosition;
    start(): Promise<void>;
    stop(): void;
    private getPollingInterval;
    private checkMarket;
    onNewCandle(candle: Candle): Promise<void>;
    /**
     * Check if TP or SL was hit during the candle (paper trading)
     */
    private checkPaperTpSl;
    private updateSwingPoints;
    private updateZones;
    private getCurrentZone;
    private analyzeMarket;
    private checkEntries;
    private calculatePositionSize;
    private enterTrade;
    private checkExits;
    private closePosition;
    /**
     * Close paper trading position
     */
    private closePaperPosition;
    /**
     * Calculate P&L for a trade
     */
    private calculatePnl;
    /**
     * Print paper trading status
     */
    private printPaperStatus;
    getState(): TradeState;
    getPaperStats(): PaperTradingState;
    getTrades(): PaperTrade[];
    isLiveTrading(): boolean;
    /**
     * Get real exchange account balance (for live trading)
     */
    getRealBalance(): Promise<number>;
}
