import type { Candle as LocalCandle } from "../types";
import { Timeframe, Candle } from "@prisma/client";
export declare function saveCandle(symbol: string, timeframe: string, candle: LocalCandle): Promise<Candle>;
export declare function saveCandles(symbol: string, timeframe: string, candles: LocalCandle[]): Promise<number>;
export declare function getCandles(symbol: string, timeframe: string, startTime?: Date, endTime?: Date, limit?: number): Promise<LocalCandle[]>;
export declare function getLatestCandle(symbol: string, timeframe: string): Promise<LocalCandle | null>;
export declare function getCandleCount(symbol: string, timeframe: string): Promise<number>;
export declare function deleteOldCandles(symbol: string, timeframe: string, olderThan: Date): Promise<number>;
export declare function getAvailableData(): Promise<{
    symbol: string;
    timeframe: Timeframe;
    count: number;
    latest: Date;
}[]>;
