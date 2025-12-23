import { SessionSnapshot, DailyPerformance } from "@prisma/client";
export interface SessionStats {
    totalTrades: number;
    openTrades: number;
    closedTrades: number;
    winCount: number;
    lossCount: number;
    winRate: number;
    totalPnl: number;
    avgWin: number | null;
    avgLoss: number | null;
    largestWin: number | null;
    largestLoss: number | null;
    profitFactor: number | null;
    avgRMultiple: number | null;
    maxDrawdown: number | null;
    returnPercent: number;
}
export declare function calculateSessionStats(sessionId: string): Promise<SessionStats>;
export declare function createSessionSnapshot(sessionId: string): Promise<SessionSnapshot>;
export declare function getLatestSnapshot(sessionId: string): Promise<SessionSnapshot | null>;
export declare function getSnapshotHistory(sessionId: string, limit?: number): Promise<SessionSnapshot[]>;
export declare function updateDailyPerformance(sessionId: string, date: Date): Promise<DailyPerformance>;
export declare function getEquityCurve(sessionId: string): Promise<{
    date: Date;
    balance: number;
    pnl: number;
}[]>;
export declare function compareSessions(sessionIds: string[]): Promise<{
    sessionId: string;
    name: string;
    symbol: string;
    timeframe: string;
    stats: SessionStats;
}[]>;
export declare function getBestSessions(limit?: number, orderBy?: "winRate" | "totalPnl" | "profitFactor"): Promise<SessionSnapshot[]>;
