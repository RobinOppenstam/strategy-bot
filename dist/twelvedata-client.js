"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwelveDataClient = void 0;
/**
 * Twelve Data API Client for Gold/Forex data
 * Docs: https://twelvedata.com/docs
 *
 * Free tier: 800 API calls/day
 */
class TwelveDataClient {
    constructor(apiKey) {
        this.baseUrl = "https://api.twelvedata.com";
        this.apiKey = apiKey;
    }
    /**
     * Map our timeframe format to Twelve Data interval format
     */
    mapTimeframe(timeframe) {
        const map = {
            "Min1": "1min",
            "Min5": "5min",
            "Min15": "15min",
            "Min30": "30min",
            "Min60": "1h",
            "Hour4": "4h",
            "Day1": "1day",
        };
        return map[timeframe] || "15min";
    }
    /**
     * Get candle/OHLCV data from Twelve Data
     * @param symbol - e.g., "XAU/USD" for gold
     * @param timeframe - Our internal format: "Min1", "Min5", etc.
     * @param limit - Number of candles to fetch (max 5000)
     */
    async getCandles(symbol, timeframe, limit = 500) {
        const interval = this.mapTimeframe(timeframe);
        const params = new URLSearchParams({
            symbol,
            interval,
            outputsize: String(Math.min(limit, 5000)),
            apikey: this.apiKey,
        });
        const url = `${this.baseUrl}/time_series?${params}`;
        const response = await fetch(url);
        const data = (await response.json());
        if (data.status === "error") {
            throw new Error(`Twelve Data API Error: ${data.message}`);
        }
        if (!data.values || !Array.isArray(data.values)) {
            throw new Error("Twelve Data: No data returned");
        }
        // Twelve Data returns data in reverse chronological order (newest first)
        // We need oldest first for our bot
        const candles = data.values
            .map((v) => ({
            timestamp: new Date(v.datetime).getTime(),
            open: parseFloat(v.open),
            high: parseFloat(v.high),
            low: parseFloat(v.low),
            close: parseFloat(v.close),
            volume: parseFloat(v.volume || "0"),
        }))
            .reverse();
        return candles;
    }
    /**
     * Get current price
     */
    async getPrice(symbol) {
        const params = new URLSearchParams({
            symbol,
            apikey: this.apiKey,
        });
        const url = `${this.baseUrl}/price?${params}`;
        const response = await fetch(url);
        const data = (await response.json());
        if (data.status === "error") {
            throw new Error(`Twelve Data API Error: ${data.message}`);
        }
        return parseFloat(data.price || "0");
    }
    /**
     * Get quote with additional info
     */
    async getQuote(symbol) {
        const params = new URLSearchParams({
            symbol,
            apikey: this.apiKey,
        });
        const url = `${this.baseUrl}/quote?${params}`;
        const response = await fetch(url);
        const data = (await response.json());
        if (data.status === "error") {
            throw new Error(`Twelve Data API Error: ${data.message}`);
        }
        return {
            symbol: data.symbol || symbol,
            name: data.name || symbol,
            price: parseFloat(data.close || "0"),
            open: parseFloat(data.open || "0"),
            high: parseFloat(data.high || "0"),
            low: parseFloat(data.low || "0"),
            previousClose: parseFloat(data.previous_close || "0"),
            change: parseFloat(data.change || "0"),
            percentChange: parseFloat(data.percent_change || "0"),
        };
    }
}
exports.TwelveDataClient = TwelveDataClient;
//# sourceMappingURL=twelvedata-client.js.map