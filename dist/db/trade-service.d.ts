import type { ZoneType as LocalZoneType, PaperTrade } from "../types";
import { Trade } from "@prisma/client";
export interface OpenTradeInput {
    sessionId: string;
    side: "long" | "short";
    entryPrice: number;
    size: number;
    sizeUsd: number;
    riskAmount: number;
    stopLoss: number;
    takeProfit: number;
    entryZone?: LocalZoneType;
    fastMAAtEntry?: number;
    slowMAAtEntry?: number;
    atrAtEntry?: number;
    externalId?: string;
}
export interface TradeSignalInput {
    isCrossover: boolean;
    isContinuation: boolean;
    fastMA: number;
    slowMA: number;
    atr: number;
    zone: LocalZoneType;
    rangeHigh: number;
    rangeLow: number;
    equilibrium: number;
    swingHighPrice?: number;
    swingHighTime?: Date;
    swingLowPrice?: number;
    swingLowTime?: Date;
}
export declare function openTrade(input: OpenTradeInput, signalData?: TradeSignalInput): Promise<Trade>;
export interface CloseTradeInput {
    tradeId: string;
    exitPrice: number;
    exitZone?: LocalZoneType;
    exitReason?: string;
    status: "closed_tp" | "closed_sl" | "closed_signal" | "closed_manual";
}
export declare function closeTrade(input: CloseTradeInput): Promise<Trade>;
export declare function getOpenTrades(sessionId: string): Promise<Trade[]>;
export declare function getOpenTrade(sessionId: string): Promise<Trade | null>;
export declare function getSessionTrades(sessionId: string): Promise<Trade[]>;
export declare function getTradesByDateRange(sessionId: string, startDate: Date, endDate: Date): Promise<Trade[]>;
export declare function savePaperTrade(sessionId: string, paperTrade: PaperTrade, sizeUsd: number, riskAmount: number): Promise<Trade>;
export declare function getRecentTrades(limit?: number): Promise<Trade[]>;
