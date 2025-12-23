/**
 * Technical Indicators
 * Implements the indicators used in the Pine Script strategy
 */
export declare class Indicators {
    /**
     * Simple Moving Average
     */
    sma(data: number[], period: number): number[];
    /**
     * Exponential Moving Average
     */
    ema(data: number[], period: number): number[];
    /**
     * True Range
     */
    private trueRange;
    /**
     * Average True Range
     */
    atr(highs: number[], lows: number[], closes: number[], period: number): number[];
    /**
     * Standard Deviation (used for SD levels in your script)
     */
    stdev(data: number[], period: number): number[];
    /**
     * Pivot High - Swing High Detection
     * Returns the high if it's a pivot, otherwise NaN
     */
    pivotHigh(highs: number[], leftBars: number, rightBars: number): number[];
    /**
     * Pivot Low - Swing Low Detection
     * Returns the low if it's a pivot, otherwise NaN
     */
    pivotLow(lows: number[], leftBars: number, rightBars: number): number[];
    /**
     * VWAP (Volume Weighted Average Price)
     * Note: Resets daily - for simplicity, this is a rolling calculation
     */
    vwap(highs: number[], lows: number[], closes: number[], volumes: number[]): number[];
    /**
     * RSI (Relative Strength Index) - useful for additional confirmation
     */
    rsi(closes: number[], period: number): number[];
    /**
     * ADX (Average Directional Index) - Trend strength
     */
    adx(highs: number[], lows: number[], closes: number[], period: number): {
        adx: number[];
        plusDI: number[];
        minusDI: number[];
    };
}
