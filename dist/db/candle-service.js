"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveCandle = saveCandle;
exports.saveCandles = saveCandles;
exports.getCandles = getCandles;
exports.getLatestCandle = getLatestCandle;
exports.getCandleCount = getCandleCount;
exports.deleteOldCandles = deleteOldCandles;
exports.getAvailableData = getAvailableData;
const prisma_1 = require("./prisma");
// Map string timeframe to Prisma enum
function mapTimeframe(tf) {
    const mapping = {
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
async function saveCandle(symbol, timeframe, candle) {
    const tf = mapTimeframe(timeframe);
    const timestamp = new Date(candle.timestamp);
    return prisma_1.prisma.candle.upsert({
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
async function saveCandles(symbol, timeframe, candles) {
    const tf = mapTimeframe(timeframe);
    // Process candles in parallel batches without transactions for reliability with remote DBs
    const BATCH_SIZE = 20;
    let savedCount = 0;
    for (let i = 0; i < candles.length; i += BATCH_SIZE) {
        const batch = candles.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map((candle) => {
            const timestamp = new Date(candle.timestamp);
            return prisma_1.prisma.candle.upsert({
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
        }));
        savedCount += results.length;
    }
    return savedCount;
}
// Get candles for backtesting
async function getCandles(symbol, timeframe, startTime, endTime, limit) {
    const tf = mapTimeframe(timeframe);
    const candles = await prisma_1.prisma.candle.findMany({
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
async function getLatestCandle(symbol, timeframe) {
    const tf = mapTimeframe(timeframe);
    const candle = await prisma_1.prisma.candle.findFirst({
        where: { symbol, timeframe: tf },
        orderBy: { timestamp: "desc" },
    });
    if (!candle)
        return null;
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
async function getCandleCount(symbol, timeframe) {
    const tf = mapTimeframe(timeframe);
    return prisma_1.prisma.candle.count({
        where: { symbol, timeframe: tf },
    });
}
// Delete old candles (for cleanup if needed)
async function deleteOldCandles(symbol, timeframe, olderThan) {
    const tf = mapTimeframe(timeframe);
    const result = await prisma_1.prisma.candle.deleteMany({
        where: {
            symbol,
            timeframe: tf,
            timestamp: { lt: olderThan },
        },
    });
    return result.count;
}
// Get available symbols and timeframes
async function getAvailableData() {
    const result = await prisma_1.prisma.candle.groupBy({
        by: ["symbol", "timeframe"],
        _count: { id: true },
        _max: { timestamp: true },
    });
    return result.map((r) => ({
        symbol: r.symbol,
        timeframe: r.timeframe,
        count: r._count.id,
        latest: r._max.timestamp,
    }));
}
//# sourceMappingURL=candle-service.js.map