import { Candle } from "./types";
/**
 * Twelve Data API Client for Gold/Forex data
 * Docs: https://twelvedata.com/docs
 *
 * Free tier: 800 API calls/day
 */
export declare class TwelveDataClient {
    private apiKey;
    private baseUrl;
    constructor(apiKey: string);
    /**
     * Map our timeframe format to Twelve Data interval format
     */
    private mapTimeframe;
    /**
     * Get candle/OHLCV data from Twelve Data
     * @param symbol - e.g., "XAU/USD" for gold
     * @param timeframe - Our internal format: "Min1", "Min5", etc.
     * @param limit - Number of candles to fetch (max 5000)
     */
    getCandles(symbol: string, timeframe: string, limit?: number): Promise<Candle[]>;
    /**
     * Get current price
     */
    getPrice(symbol: string): Promise<number>;
    /**
     * Get quote with additional info
     */
    getQuote(symbol: string): Promise<{
        symbol: string;
        name: string;
        price: number;
        open: number;
        high: number;
        low: number;
        previousClose: number;
        change: number;
        percentChange: number;
    }>;
}
