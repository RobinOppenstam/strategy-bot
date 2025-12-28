/**
 * Backtest Service
 * Handles database operations for backtests
 */
export interface CreateBacktestInput {
    name: string;
    description?: string;
    symbol: string;
    timeframe: string;
    startDate: Date;
    endDate: Date;
    bankrollUsd: number;
    riskPercent: number;
    leverage: number;
    riskRewardRatio: number;
    swingLength: number;
    slDistance: number;
    fastMAPeriod: number;
    slowMAPeriod: number;
    allowTrendContinuation?: boolean;
    exitOnZoneChange?: boolean;
    contractValue?: number;
}
export declare class BacktestService {
    /**
     * Get data availability for all symbols
     */
    getDataAvailability(): Promise<{
        symbol: string;
        timeframe: string;
        candleCount: number;
        earliestCandle: Date;
        latestCandle: Date;
    }[]>;
    /**
     * Get all backtests
     */
    getAllBacktests(): Promise<{
        symbol: string;
        name: string;
        id: string;
        description: string | null;
        status: import("@prisma/client").$Enums.BacktestStatus;
        timeframe: import("@prisma/client").$Enums.Timeframe;
        createdAt: Date;
        maxDrawdown: import("@prisma/client/runtime/client").Decimal | null;
        totalPnl: import("@prisma/client/runtime/client").Decimal | null;
        totalTrades: number | null;
        winRate: import("@prisma/client/runtime/client").Decimal | null;
        profitFactor: import("@prisma/client/runtime/client").Decimal | null;
        startDate: Date;
        endDate: Date;
        progress: number;
        executionTimeMs: number | null;
        finalBalance: import("@prisma/client/runtime/client").Decimal | null;
        maxDrawdownPct: import("@prisma/client/runtime/client").Decimal | null;
        sharpeRatio: import("@prisma/client/runtime/client").Decimal | null;
    }[]>;
    /**
     * Get single backtest with trades
     */
    getBacktest(id: string): Promise<({
        trades: {
            id: string;
            createdAt: Date;
            side: import("@prisma/client").$Enums.TradeSide;
            entryPrice: import("@prisma/client/runtime/client").Decimal;
            entryTime: Date;
            entryZone: import("@prisma/client").$Enums.ZoneType | null;
            size: import("@prisma/client/runtime/client").Decimal;
            sizeUsd: import("@prisma/client/runtime/client").Decimal;
            stopLoss: import("@prisma/client/runtime/client").Decimal;
            takeProfit: import("@prisma/client/runtime/client").Decimal;
            exitPrice: import("@prisma/client/runtime/client").Decimal;
            exitTime: Date;
            exitZone: import("@prisma/client").$Enums.ZoneType | null;
            exitReason: string;
            pnlUsd: import("@prisma/client/runtime/client").Decimal;
            pnlPercent: import("@prisma/client/runtime/client").Decimal;
            rMultiple: import("@prisma/client/runtime/client").Decimal;
            fastMAAtEntry: import("@prisma/client/runtime/client").Decimal | null;
            slowMAAtEntry: import("@prisma/client/runtime/client").Decimal | null;
            atrAtEntry: import("@prisma/client/runtime/client").Decimal | null;
            drawdown: import("@prisma/client/runtime/client").Decimal;
            backtestId: string;
            tradeNumber: number;
            entryReason: string | null;
            runningBalance: import("@prisma/client/runtime/client").Decimal;
            runningPnl: import("@prisma/client/runtime/client").Decimal;
        }[];
    } & {
        symbol: string;
        name: string;
        id: string;
        description: string | null;
        status: import("@prisma/client").$Enums.BacktestStatus;
        timeframe: import("@prisma/client").$Enums.Timeframe;
        bankrollUsd: import("@prisma/client/runtime/client").Decimal;
        riskPercent: import("@prisma/client/runtime/client").Decimal;
        leverage: number;
        riskRewardRatio: import("@prisma/client/runtime/client").Decimal;
        swingLength: number;
        slDistance: import("@prisma/client/runtime/client").Decimal;
        fastMAPeriod: number;
        slowMAPeriod: number;
        allowTrendContinuation: boolean;
        exitOnZoneChange: boolean;
        startedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        maxDrawdown: import("@prisma/client/runtime/client").Decimal | null;
        totalPnl: import("@prisma/client/runtime/client").Decimal | null;
        totalTrades: number | null;
        winCount: number | null;
        lossCount: number | null;
        winRate: import("@prisma/client/runtime/client").Decimal | null;
        profitFactor: import("@prisma/client/runtime/client").Decimal | null;
        avgRMultiple: import("@prisma/client/runtime/client").Decimal | null;
        startDate: Date;
        endDate: Date;
        dataSource: import("@prisma/client").$Enums.DataSource;
        contractValue: import("@prisma/client/runtime/client").Decimal;
        progress: number;
        errorMessage: string | null;
        completedAt: Date | null;
        executionTimeMs: number | null;
        candlesProcessed: number | null;
        finalBalance: import("@prisma/client/runtime/client").Decimal | null;
        maxDrawdownPct: import("@prisma/client/runtime/client").Decimal | null;
        sharpeRatio: import("@prisma/client/runtime/client").Decimal | null;
        equityCurve: import("@prisma/client/runtime/client").JsonValue | null;
    }) | null>;
    /**
     * Create and run a backtest
     */
    runBacktest(input: CreateBacktestInput): Promise<string>;
    /**
     * Execute the backtest
     */
    private executeBacktest;
    /**
     * Save backtest results to database
     */
    private saveResults;
    /**
     * Delete a backtest
     */
    deleteBacktest(id: string): Promise<void>;
    /**
     * Get backtest status
     */
    getBacktestStatus(id: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.BacktestStatus;
        progress: number;
        errorMessage: string | null;
    } | null>;
}
export declare const backtestService: BacktestService;
