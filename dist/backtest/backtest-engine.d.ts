/**
 * Backtest Engine
 * Runs the ICT Premium/Discount + MA Crossover strategy on historical data
 */
import { BacktestConfig, BacktestResult, Candle } from "./types";
export declare class BacktestEngine {
    private config;
    private indicators;
    private candles;
    private position;
    private lastSwingHigh;
    private lastSwingLow;
    private rangeHigh;
    private rangeLow;
    private balance;
    private peak;
    private trades;
    private equityCurve;
    private tradeCount;
    private totalPnl;
    constructor(config: BacktestConfig);
    /**
     * Run backtest on candle array
     */
    run(candles: Candle[]): BacktestResult;
    private updateSwingPoints;
    private updateZones;
    private getCurrentZone;
    private analyzeMarket;
    private checkEntries;
    private enterTrade;
    private calculatePositionSize;
    private checkTpSl;
    private checkExits;
    private closePosition;
    private recordEquityPoint;
    private buildResult;
    private buildErrorResult;
}
