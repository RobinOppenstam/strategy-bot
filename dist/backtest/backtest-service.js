"use strict";
/**
 * Backtest Service
 * Handles database operations for backtests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.backtestService = exports.BacktestService = void 0;
const prisma_1 = require("../db/prisma");
const client_1 = require("@prisma/client");
const backtest_engine_1 = require("./backtest-engine");
// Map string timeframe to Prisma enum
const TIMEFRAME_MAP = {
    Min1: "Min1",
    Min5: "Min5",
    Min15: "Min15",
    Min30: "Min30",
    Min60: "Min60",
    Hour4: "Hour4",
    Day1: "Day1",
};
// Map zone strings to Prisma enum
function mapZone(zone) {
    if (!zone)
        return null;
    const map = {
        premium: "PREMIUM",
        discount: "DISCOUNT",
        equilibrium: "EQUILIBRIUM",
    };
    return map[zone] || null;
}
class BacktestService {
    /**
     * Get data availability for all symbols
     */
    async getDataAvailability() {
        // Get candle counts and date ranges by symbol/timeframe from BacktestCandle table
        const result = await prisma_1.prisma.$queryRaw `
      SELECT
        symbol,
        timeframe,
        COUNT(*) as count,
        MIN(timestamp) as earliest,
        MAX(timestamp) as latest
      FROM "BacktestCandle"
      GROUP BY symbol, timeframe
      ORDER BY symbol, timeframe
    `;
        return result.map((r) => ({
            symbol: r.symbol,
            timeframe: r.timeframe,
            candleCount: Number(r.count),
            earliestCandle: r.earliest,
            latestCandle: r.latest,
        }));
    }
    /**
     * Get all backtests
     */
    async getAllBacktests() {
        return prisma_1.prisma.backtest.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                description: true,
                symbol: true,
                timeframe: true,
                startDate: true,
                endDate: true,
                status: true,
                progress: true,
                totalTrades: true,
                winRate: true,
                totalPnl: true,
                finalBalance: true,
                maxDrawdown: true,
                maxDrawdownPct: true,
                profitFactor: true,
                sharpeRatio: true,
                executionTimeMs: true,
                createdAt: true,
            },
        });
    }
    /**
     * Get single backtest with trades
     */
    async getBacktest(id) {
        const backtest = await prisma_1.prisma.backtest.findUnique({
            where: { id },
            include: {
                trades: {
                    orderBy: { tradeNumber: "asc" },
                },
            },
        });
        return backtest;
    }
    /**
     * Create and run a backtest
     */
    async runBacktest(input) {
        const tf = TIMEFRAME_MAP[input.timeframe];
        if (!tf) {
            throw new Error(`Invalid timeframe: ${input.timeframe}`);
        }
        // Create backtest record
        const backtest = await prisma_1.prisma.backtest.create({
            data: {
                name: input.name,
                description: input.description,
                symbol: input.symbol,
                timeframe: tf,
                startDate: input.startDate,
                endDate: input.endDate,
                dataSource: "CSV",
                bankrollUsd: input.bankrollUsd,
                riskPercent: input.riskPercent,
                leverage: input.leverage,
                riskRewardRatio: input.riskRewardRatio,
                swingLength: input.swingLength,
                slDistance: input.slDistance,
                fastMAPeriod: input.fastMAPeriod,
                slowMAPeriod: input.slowMAPeriod,
                allowTrendContinuation: input.allowTrendContinuation ?? false,
                exitOnZoneChange: input.exitOnZoneChange ?? true,
                contractValue: input.contractValue ?? 1,
                status: "RUNNING",
                progress: 0,
            },
        });
        // Run in background
        this.executeBacktest(backtest.id, input).catch((err) => {
            console.error("Backtest execution error:", err);
        });
        return backtest.id;
    }
    /**
     * Execute the backtest
     */
    async executeBacktest(backtestId, input) {
        try {
            const tf = TIMEFRAME_MAP[input.timeframe];
            // Fetch candles from BacktestCandle table
            const candles = await prisma_1.prisma.backtestCandle.findMany({
                where: {
                    symbol: input.symbol,
                    timeframe: tf,
                    timestamp: {
                        gte: input.startDate,
                        lte: input.endDate,
                    },
                },
                orderBy: { timestamp: "asc" },
            });
            if (candles.length === 0) {
                await prisma_1.prisma.backtest.update({
                    where: { id: backtestId },
                    data: {
                        status: "FAILED",
                        errorMessage: `No candles found for ${input.symbol} ${input.timeframe} between ${input.startDate.toISOString()} and ${input.endDate.toISOString()}`,
                    },
                });
                return;
            }
            // Convert to engine format
            const candleData = candles.map((c) => ({
                timestamp: c.timestamp.getTime(),
                open: Number(c.open),
                high: Number(c.high),
                low: Number(c.low),
                close: Number(c.close),
                volume: Number(c.volume),
            }));
            // Build config
            const config = {
                name: input.name,
                description: input.description,
                symbol: input.symbol,
                timeframe: input.timeframe,
                startDate: input.startDate,
                endDate: input.endDate,
                bankrollUsd: input.bankrollUsd,
                riskPercent: input.riskPercent,
                leverage: input.leverage,
                riskRewardRatio: input.riskRewardRatio,
                swingLength: input.swingLength,
                slDistance: input.slDistance,
                fastMAPeriod: input.fastMAPeriod,
                slowMAPeriod: input.slowMAPeriod,
                allowTrendContinuation: input.allowTrendContinuation ?? false,
                exitOnZoneChange: input.exitOnZoneChange ?? true,
                contractValue: input.contractValue ?? 1,
            };
            // Run backtest
            const engine = new backtest_engine_1.BacktestEngine(config);
            const result = engine.run(candleData);
            // Save results
            await this.saveResults(backtestId, result);
        }
        catch (error) {
            console.error("Backtest execution error:", error);
            await prisma_1.prisma.backtest.update({
                where: { id: backtestId },
                data: {
                    status: "FAILED",
                    errorMessage: String(error),
                },
            });
        }
    }
    /**
     * Save backtest results to database
     */
    async saveResults(backtestId, result) {
        // Update backtest record
        await prisma_1.prisma.backtest.update({
            where: { id: backtestId },
            data: {
                status: result.status === "completed" ? "COMPLETED" : "FAILED",
                errorMessage: result.errorMessage,
                totalTrades: result.totalTrades,
                winCount: result.winCount,
                lossCount: result.lossCount,
                winRate: result.winRate,
                totalPnl: result.totalPnl,
                finalBalance: result.finalBalance,
                maxDrawdown: result.maxDrawdown,
                maxDrawdownPct: result.maxDrawdownPercent,
                profitFactor: result.profitFactor,
                sharpeRatio: result.sharpeRatio,
                avgRMultiple: result.avgRMultiple,
                equityCurve: JSON.parse(JSON.stringify(result.equityCurve)),
                executionTimeMs: result.executionTimeMs,
                candlesProcessed: result.candlesProcessed,
                completedAt: new Date(),
                progress: 100,
            },
        });
        // Save trades in batches
        const BATCH_SIZE = 100;
        for (let i = 0; i < result.trades.length; i += BATCH_SIZE) {
            const batch = result.trades.slice(i, i + BATCH_SIZE);
            await prisma_1.prisma.backtestTrade.createMany({
                data: batch.map((t) => ({
                    backtestId,
                    tradeNumber: t.tradeNumber,
                    side: t.side === "long" ? client_1.TradeSide.LONG : client_1.TradeSide.SHORT,
                    entryPrice: t.entryPrice,
                    entryTime: t.entryTime,
                    entryZone: mapZone(t.entryZone),
                    entryReason: t.entryReason,
                    exitPrice: t.exitPrice,
                    exitTime: t.exitTime,
                    exitZone: mapZone(t.exitZone),
                    exitReason: t.exitReason,
                    size: t.size,
                    sizeUsd: t.sizeUsd,
                    stopLoss: t.stopLoss,
                    takeProfit: t.takeProfit,
                    pnlUsd: t.pnlUsd,
                    pnlPercent: t.pnlPercent,
                    rMultiple: t.rMultiple,
                    runningBalance: t.runningBalance,
                    runningPnl: t.runningPnl,
                    drawdown: t.drawdown,
                    fastMAAtEntry: t.fastMAAtEntry,
                    slowMAAtEntry: t.slowMAAtEntry,
                    atrAtEntry: t.atrAtEntry,
                })),
            });
        }
    }
    /**
     * Delete a backtest
     */
    async deleteBacktest(id) {
        await prisma_1.prisma.backtest.delete({
            where: { id },
        });
    }
    /**
     * Get backtest status
     */
    async getBacktestStatus(id) {
        return prisma_1.prisma.backtest.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                progress: true,
                errorMessage: true,
            },
        });
    }
}
exports.BacktestService = BacktestService;
exports.backtestService = new BacktestService();
//# sourceMappingURL=backtest-service.js.map