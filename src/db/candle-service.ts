import { prisma } from "./prisma";
import type { Candle as LocalCandle } from "../types";
import { Timeframe, Candle } from "@prisma/client";

// Map string timeframe to Prisma enum
function mapTimeframe(tf: string): Timeframe {
  const mapping: Record<string, Timeframe> = {
    Min1: "Min1",
    Min5: "Min5",
    Min15: "Min15",
    Min30: "Min30",
    Min60: "Min60",
    Hour4: "Hour4",
    Day1: "Day1",
  };
  return mapping[tf] ?? "Min15";
}

// Save a single candle (upsert to avoid duplicates)
export async function saveCandle(
  symbol: string,
  timeframe: string,
  candle: LocalCandle
): Promise<Candle> {
  const tf = mapTimeframe(timeframe);
  const timestamp = new Date(candle.timestamp);

  return prisma.candle.upsert({
    where: {
      symbol_timeframe_timestamp: {
        symbol,
        timeframe: tf,
        timestamp,
      },
    },
    update: {
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    },
    create: {
      symbol,
      timeframe: tf,
      timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    },
  });
}

// Save multiple candles in batch - uses parallel upserts without transaction for reliability
export async function saveCandles(
  symbol: string,
  timeframe: string,
  candles: LocalCandle[]
): Promise<number> {
  const tf = mapTimeframe(timeframe);

  // Process candles in parallel batches without transactions for reliability with remote DBs
  const BATCH_SIZE = 20;
  let savedCount = 0;

  for (let i = 0; i < candles.length; i += BATCH_SIZE) {
    const batch = candles.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map((candle) => {
        const timestamp = new Date(candle.timestamp);
        return prisma.candle.upsert({
          where: {
            symbol_timeframe_timestamp: {
              symbol,
              timeframe: tf,
              timestamp,
            },
          },
          update: {
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume,
          },
          create: {
            symbol,
            timeframe: tf,
            timestamp,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume,
          },
        });
      })
    );

    savedCount += results.length;
  }

  return savedCount;
}

// Get candles for backtesting
export async function getCandles(
  symbol: string,
  timeframe: string,
  startTime?: Date,
  endTime?: Date,
  limit?: number
): Promise<LocalCandle[]> {
  const tf = mapTimeframe(timeframe);

  const candles = await prisma.candle.findMany({
    where: {
      symbol,
      timeframe: tf,
      ...(startTime && { timestamp: { gte: startTime } }),
      ...(endTime && { timestamp: { lte: endTime } }),
    },
    orderBy: { timestamp: "asc" },
    ...(limit && { take: limit }),
  });

  // Convert to local Candle format
  return candles.map((c) => ({
    timestamp: c.timestamp.getTime(),
    open: Number(c.open),
    high: Number(c.high),
    low: Number(c.low),
    close: Number(c.close),
    volume: Number(c.volume),
  }));
}

// Get latest candle
export async function getLatestCandle(
  symbol: string,
  timeframe: string
): Promise<LocalCandle | null> {
  const tf = mapTimeframe(timeframe);

  const candle = await prisma.candle.findFirst({
    where: { symbol, timeframe: tf },
    orderBy: { timestamp: "desc" },
  });

  if (!candle) return null;

  return {
    timestamp: candle.timestamp.getTime(),
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
    volume: Number(candle.volume),
  };
}

// Get candle count for a symbol/timeframe
export async function getCandleCount(
  symbol: string,
  timeframe: string
): Promise<number> {
  const tf = mapTimeframe(timeframe);

  return prisma.candle.count({
    where: { symbol, timeframe: tf },
  });
}

// Delete old candles (for cleanup if needed)
export async function deleteOldCandles(
  symbol: string,
  timeframe: string,
  olderThan: Date
): Promise<number> {
  const tf = mapTimeframe(timeframe);

  const result = await prisma.candle.deleteMany({
    where: {
      symbol,
      timeframe: tf,
      timestamp: { lt: olderThan },
    },
  });

  return result.count;
}

// Get available symbols and timeframes
export async function getAvailableData(): Promise<
  { symbol: string; timeframe: Timeframe; count: number; latest: Date }[]
> {
  const result = await prisma.candle.groupBy({
    by: ["symbol", "timeframe"],
    _count: { id: true },
    _max: { timestamp: true },
  });

  return result.map((r) => ({
    symbol: r.symbol,
    timeframe: r.timeframe,
    count: r._count.id,
    latest: r._max.timestamp!,
  }));
}
