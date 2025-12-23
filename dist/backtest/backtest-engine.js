"use strict";
/**
 * Backtest Engine
 * Runs the ICT Premium/Discount + MA Crossover strategy on historical data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BacktestEngine = void 0;
const indicators_1 = require("../indicators");
class BacktestEngine {
    constructor(config) {
        // State
        this.candles = [];
        this.position = null;
        this.lastSwingHigh = null;
        this.lastSwingLow = null;
        this.rangeHigh = null;
        this.rangeLow = null;
        this.trades = [];
        this.equityCurve = [];
        this.tradeCount = 0;
        this.totalPnl = 0;
        this.config = config;
        this.indicators = new indicators_1.Indicators();
        this.balance = config.bankrollUsd;
        this.peak = config.bankrollUsd;
    }
    /**
     * Run backtest on candle array
     */
    run(candles) {
        const startTime = Date.now();
        this.candles = [];
        // Calculate warmup period needed for indicators
        const warmupPeriod = Math.max(this.config.swingLength * 2 + 1, this.config.slowMAPeriod + 1);
        if (candles.length < warmupPeriod) {
            return this.buildErrorResult(`Insufficient candles: ${candles.length} < ${warmupPeriod}`, startTime);
        }
        // Process each candle
        for (let i = 0; i < candles.length; i++) {
            this.candles.push(candles[i]);
            // Skip until we have enough data for indicators
            if (this.candles.length < warmupPeriod) {
                continue;
            }
            const currentCandle = candles[i];
            // Check TP/SL first (if position open)
            if (this.position) {
                const tpSlHit = this.checkTpSl(currentCandle);
                if (tpSlHit)
                    continue;
            }
            // Update swing points and zones
            this.updateSwingPoints();
            this.updateZones();
            // Analyze market
            const analysis = this.analyzeMarket();
            // Check exits then entries
            if (this.position) {
                this.checkExits(analysis, currentCandle);
            }
            if (!this.position) {
                this.checkEntries(analysis, currentCandle);
            }
            // Record equity point periodically (every 100 candles or on trade)
            if (i % 100 === 0 || this.trades.length !== this.tradeCount) {
                this.recordEquityPoint(currentCandle.timestamp);
            }
        }
        // Close any remaining position at last price
        if (this.position) {
            const lastCandle = candles[candles.length - 1];
            this.closePosition(lastCandle.close, new Date(lastCandle.timestamp), "end_of_data");
        }
        return this.buildResult(startTime, candles.length);
    }
    // ===========================================================================
    // SWING POINT DETECTION
    // ===========================================================================
    updateSwingPoints() {
        const len = this.config.swingLength;
        if (this.candles.length < len * 2 + 1)
            return;
        const pivotIndex = this.candles.length - 1 - len;
        const pivotCandle = this.candles[pivotIndex];
        let isSwingHigh = true;
        let isSwingLow = true;
        for (let i = pivotIndex - len; i <= pivotIndex + len; i++) {
            if (i === pivotIndex || i < 0 || i >= this.candles.length)
                continue;
            if (this.candles[i].high >= pivotCandle.high)
                isSwingHigh = false;
            if (this.candles[i].low <= pivotCandle.low)
                isSwingLow = false;
        }
        if (isSwingHigh) {
            this.lastSwingHigh = {
                price: pivotCandle.high,
                timestamp: pivotCandle.timestamp,
                index: pivotIndex,
            };
        }
        if (isSwingLow) {
            this.lastSwingLow = {
                price: pivotCandle.low,
                timestamp: pivotCandle.timestamp,
                index: pivotIndex,
            };
        }
    }
    // ===========================================================================
    // ZONES
    // ===========================================================================
    updateZones() {
        if (!this.lastSwingHigh || !this.lastSwingLow)
            return;
        this.rangeHigh = this.lastSwingHigh.price;
        this.rangeLow = this.lastSwingLow.price;
    }
    getCurrentZone() {
        if (!this.rangeHigh || !this.rangeLow)
            return "equilibrium";
        const currentPrice = this.candles[this.candles.length - 1].close;
        const range = this.rangeHigh - this.rangeLow;
        const equilibrium = this.rangeLow + range * 0.5;
        if (currentPrice > equilibrium)
            return "premium";
        if (currentPrice < equilibrium)
            return "discount";
        return "equilibrium";
    }
    // ===========================================================================
    // MARKET ANALYSIS
    // ===========================================================================
    analyzeMarket() {
        const closes = this.candles.map((c) => c.close);
        const highs = this.candles.map((c) => c.high);
        const lows = this.candles.map((c) => c.low);
        const fastMA = this.indicators.sma(closes, this.config.fastMAPeriod);
        const slowMA = this.indicators.sma(closes, this.config.slowMAPeriod);
        const currentFastMA = fastMA[fastMA.length - 1];
        const currentSlowMA = slowMA[slowMA.length - 1];
        const prevFastMA = fastMA[fastMA.length - 2];
        const prevSlowMA = slowMA[slowMA.length - 2];
        const atr = this.indicators.atr(highs, lows, closes, 14);
        const currentATR = atr[atr.length - 1];
        const zone = this.getCurrentZone();
        const bullishCrossover = prevFastMA <= prevSlowMA && currentFastMA > currentSlowMA;
        const bearishCrossover = prevFastMA >= prevSlowMA && currentFastMA < currentSlowMA;
        const isBullish = currentFastMA > currentSlowMA;
        const isBearish = currentFastMA < currentSlowMA;
        return {
            currentPrice: closes[closes.length - 1],
            fastMA: currentFastMA,
            slowMA: currentSlowMA,
            atr: currentATR,
            zone,
            isBullish,
            isBearish,
            bullishCrossover,
            bearishCrossover,
        };
    }
    // ===========================================================================
    // ENTRY LOGIC
    // ===========================================================================
    checkEntries(analysis, candle) {
        const { zone, isBullish, isBearish, bullishCrossover, bearishCrossover, atr, currentPrice } = analysis;
        const longCondition = zone === "discount" &&
            (bullishCrossover || (isBullish && this.config.allowTrendContinuation));
        const shortCondition = zone === "premium" &&
            (bearishCrossover || (isBearish && this.config.allowTrendContinuation));
        if (longCondition) {
            this.enterTrade("long", currentPrice, atr, analysis, candle);
        }
        else if (shortCondition) {
            this.enterTrade("short", currentPrice, atr, analysis, candle);
        }
    }
    enterTrade(side, entryPrice, atr, analysis, candle) {
        // Calculate stop loss
        let stopLoss;
        if (side === "long") {
            stopLoss = this.lastSwingLow
                ? this.lastSwingLow.price - this.config.slDistance
                : entryPrice - atr * 1.5;
        }
        else {
            stopLoss = this.lastSwingHigh
                ? this.lastSwingHigh.price + this.config.slDistance
                : entryPrice + atr * 1.5;
        }
        // Calculate position size
        const size = this.calculatePositionSize(entryPrice, stopLoss);
        if (size <= 0)
            return;
        // Calculate take profit
        const riskAmount = Math.abs(entryPrice - stopLoss);
        const takeProfit = side === "long"
            ? entryPrice + riskAmount * this.config.riskRewardRatio
            : entryPrice - riskAmount * this.config.riskRewardRatio;
        const sizeUsd = size * this.config.contractValue * entryPrice;
        const entryReason = analysis.bullishCrossover || analysis.bearishCrossover
            ? "crossover"
            : "continuation";
        this.position = {
            side,
            size,
            sizeUsd,
            entryPrice,
            entryTime: new Date(candle.timestamp),
            stopLoss,
            takeProfit,
            entryZone: analysis.zone,
            entryReason,
            fastMAAtEntry: analysis.fastMA,
            slowMAAtEntry: analysis.slowMA,
            atrAtEntry: atr,
        };
    }
    calculatePositionSize(entryPrice, stopLoss) {
        const riskAmount = this.balance * this.config.riskPercent;
        const slDistancePercent = Math.abs(entryPrice - stopLoss) / entryPrice;
        if (slDistancePercent === 0)
            return 0;
        const positionSizeUsd = riskAmount / slDistancePercent;
        const maxPositionUsd = this.balance * this.config.leverage;
        const cappedPositionUsd = Math.min(positionSizeUsd, maxPositionUsd);
        // Convert to contracts
        const assetPrice = entryPrice * this.config.contractValue;
        const contracts = Math.floor(cappedPositionUsd / assetPrice);
        return contracts;
    }
    // ===========================================================================
    // EXIT LOGIC
    // ===========================================================================
    checkTpSl(candle) {
        if (!this.position)
            return false;
        const { side, stopLoss, takeProfit, entryPrice } = this.position;
        // Check stop loss
        if (side === "long" && candle.low <= stopLoss) {
            this.closePosition(stopLoss, new Date(candle.timestamp), "sl");
            return true;
        }
        if (side === "short" && candle.high >= stopLoss) {
            this.closePosition(stopLoss, new Date(candle.timestamp), "sl");
            return true;
        }
        // Check take profit
        if (side === "long" && candle.high >= takeProfit) {
            this.closePosition(takeProfit, new Date(candle.timestamp), "tp");
            return true;
        }
        if (side === "short" && candle.low <= takeProfit) {
            this.closePosition(takeProfit, new Date(candle.timestamp), "tp");
            return true;
        }
        return false;
    }
    checkExits(analysis, candle) {
        if (!this.position)
            return;
        const { zone, isBullish, isBearish } = analysis;
        const { side } = this.position;
        let shouldExit = false;
        let reason = "";
        if (side === "long" && isBearish) {
            shouldExit = true;
            reason = "trend_reversal";
        }
        else if (side === "short" && isBullish) {
            shouldExit = true;
            reason = "trend_reversal";
        }
        if (this.config.exitOnZoneChange) {
            if (side === "long" && zone === "premium") {
                shouldExit = true;
                reason = "zone_change";
            }
            else if (side === "short" && zone === "discount") {
                shouldExit = true;
                reason = "zone_change";
            }
        }
        if (shouldExit) {
            this.closePosition(candle.close, new Date(candle.timestamp), reason);
        }
    }
    closePosition(exitPrice, exitTime, exitReason) {
        if (!this.position)
            return;
        const { side, size, entryPrice, sizeUsd, stopLoss, takeProfit } = this.position;
        // Calculate P&L
        const assetSize = size * this.config.contractValue;
        let pnlUsd;
        if (side === "long") {
            pnlUsd = (exitPrice - entryPrice) * assetSize;
        }
        else {
            pnlUsd = (entryPrice - exitPrice) * assetSize;
        }
        const pnlPercent = sizeUsd > 0 ? (pnlUsd / sizeUsd) * 100 : 0;
        const riskAmount = Math.abs(entryPrice - stopLoss) * assetSize;
        const rMultiple = riskAmount > 0 ? pnlUsd / riskAmount : 0;
        // Update balance
        this.balance += pnlUsd;
        this.totalPnl += pnlUsd;
        // Track peak and drawdown
        if (this.balance > this.peak) {
            this.peak = this.balance;
        }
        const drawdown = this.peak - this.balance;
        // Record trade
        this.tradeCount++;
        const trade = {
            tradeNumber: this.tradeCount,
            side,
            entryPrice,
            entryTime: this.position.entryTime,
            entryZone: this.position.entryZone,
            entryReason: this.position.entryReason,
            exitPrice,
            exitTime,
            exitZone: this.getCurrentZone(),
            exitReason,
            size,
            sizeUsd,
            stopLoss,
            takeProfit,
            pnlUsd,
            pnlPercent,
            rMultiple,
            runningBalance: this.balance,
            runningPnl: this.totalPnl,
            drawdown,
            fastMAAtEntry: this.position.fastMAAtEntry,
            slowMAAtEntry: this.position.slowMAAtEntry,
            atrAtEntry: this.position.atrAtEntry,
        };
        this.trades.push(trade);
        // Clear position
        this.position = null;
    }
    // ===========================================================================
    // TRACKING
    // ===========================================================================
    recordEquityPoint(timestamp) {
        const drawdown = this.peak - this.balance;
        const drawdownPercent = this.peak > 0 ? (drawdown / this.peak) * 100 : 0;
        this.equityCurve.push({
            timestamp,
            balance: this.balance,
            drawdown,
            drawdownPercent,
        });
    }
    // ===========================================================================
    // RESULTS
    // ===========================================================================
    buildResult(startTime, candleCount) {
        const wins = this.trades.filter((t) => t.pnlUsd > 0);
        const losses = this.trades.filter((t) => t.pnlUsd <= 0);
        const winCount = wins.length;
        const lossCount = losses.length;
        const winRate = this.trades.length > 0 ? winCount / this.trades.length : 0;
        const grossProfit = wins.reduce((sum, t) => sum + t.pnlUsd, 0);
        const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnlUsd, 0));
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
        const maxDrawdown = Math.max(...this.trades.map((t) => t.drawdown), 0);
        const maxDrawdownPercent = this.peak > 0 ? (maxDrawdown / this.peak) * 100 : 0;
        const avgRMultiple = this.trades.length > 0
            ? this.trades.reduce((sum, t) => sum + t.rMultiple, 0) / this.trades.length
            : 0;
        // Sharpe ratio (simplified - using daily returns if available)
        const returns = this.trades.map((t) => t.pnlPercent);
        const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
        const stdDev = returns.length > 1
            ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1))
            : 0;
        const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
        return {
            config: this.config,
            status: "completed",
            totalTrades: this.trades.length,
            winCount,
            lossCount,
            winRate,
            totalPnl: this.totalPnl,
            finalBalance: this.balance,
            maxDrawdown,
            maxDrawdownPercent,
            profitFactor,
            sharpeRatio,
            avgRMultiple,
            trades: this.trades,
            equityCurve: this.equityCurve,
            executionTimeMs: Date.now() - startTime,
            candlesProcessed: candleCount,
        };
    }
    buildErrorResult(error, startTime) {
        return {
            config: this.config,
            status: "failed",
            errorMessage: error,
            totalTrades: 0,
            winCount: 0,
            lossCount: 0,
            winRate: 0,
            totalPnl: 0,
            finalBalance: this.config.bankrollUsd,
            maxDrawdown: 0,
            maxDrawdownPercent: 0,
            profitFactor: 0,
            sharpeRatio: 0,
            avgRMultiple: 0,
            trades: [],
            equityCurve: [],
            executionTimeMs: Date.now() - startTime,
            candlesProcessed: 0,
        };
    }
}
exports.BacktestEngine = BacktestEngine;
//# sourceMappingURL=backtest-engine.js.map