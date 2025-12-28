import type { Config } from "../types";
import { Session } from "@prisma/client";
export interface CreateSessionInput {
    config: Config;
    name?: string;
    description?: string;
}
export declare function createSession(input: CreateSessionInput): Promise<Session>;
export declare function getSession(sessionId: string): Promise<Session | null>;
export declare function getActiveSessions(): Promise<Session[]>;
export declare function updateSessionBalance(sessionId: string, newBalance: number): Promise<Session>;
export declare function endSession(sessionId: string): Promise<Session>;
export declare function pauseSession(sessionId: string): Promise<Session>;
export declare function resumeSession(sessionId: string): Promise<Session>;
export declare function getSessionsByConfig(symbol: string, timeframe?: string): Promise<Session[]>;
export declare function getAllSessionsWithStats(): Promise<({
    snapshots: {
        id: string;
        createdAt: Date;
        sessionId: string;
        maxDrawdown: import("@prisma/client/runtime/client").Decimal | null;
        snapshotTime: Date;
        balance: import("@prisma/client/runtime/client").Decimal;
        totalPnl: import("@prisma/client/runtime/client").Decimal;
        totalTrades: number;
        openTrades: number;
        winCount: number;
        lossCount: number;
        winRate: import("@prisma/client/runtime/client").Decimal;
        profitFactor: import("@prisma/client/runtime/client").Decimal | null;
        avgWin: import("@prisma/client/runtime/client").Decimal | null;
        avgLoss: import("@prisma/client/runtime/client").Decimal | null;
        largestWin: import("@prisma/client/runtime/client").Decimal | null;
        largestLoss: import("@prisma/client/runtime/client").Decimal | null;
        maxDrawdownPercent: import("@prisma/client/runtime/client").Decimal | null;
        avgRMultiple: import("@prisma/client/runtime/client").Decimal | null;
        returnPercent: import("@prisma/client/runtime/client").Decimal;
    }[];
    _count: {
        trades: number;
    };
} & {
    symbol: string;
    name: string;
    id: string;
    description: string | null;
    mode: import("@prisma/client").$Enums.TradingMode;
    status: import("@prisma/client").$Enums.SessionStatus;
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
    initialBalance: import("@prisma/client/runtime/client").Decimal;
    currentBalance: import("@prisma/client/runtime/client").Decimal;
    startedAt: Date;
    endedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
})[]>;
