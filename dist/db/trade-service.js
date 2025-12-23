"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openTrade = openTrade;
exports.closeTrade = closeTrade;
exports.getOpenTrades = getOpenTrades;
exports.getOpenTrade = getOpenTrade;
exports.getSessionTrades = getSessionTrades;
exports.getTradesByDateRange = getTradesByDateRange;
exports.savePaperTrade = savePaperTrade;
exports.getRecentTrades = getRecentTrades;
const prisma_1 = require("./prisma");
const client_1 = require("@prisma/client");
// Map local types to Prisma enums
function mapSide(side) {
    return side === "long" ? client_1.TradeSide.LONG : client_1.TradeSide.SHORT;
}
function mapZone(zone) {
    if (!zone)
        return null;
    const mapping = {
        premium: client_1.ZoneType.PREMIUM,
        discount: client_1.ZoneType.DISCOUNT,
        equilibrium: client_1.ZoneType.EQUILIBRIUM,
    };
    return mapping[zone];
}
function mapStatus(status) {
    const mapping = {
        open: client_1.TradeStatus.OPEN,
        closed_tp: client_1.TradeStatus.CLOSED_TP,
        closed_sl: client_1.TradeStatus.CLOSED_SL,
        closed_signal: client_1.TradeStatus.CLOSED_SIGNAL,
        closed_manual: client_1.TradeStatus.CLOSED_MANUAL,
    };
    return mapping[status] ?? client_1.TradeStatus.OPEN;
}
// Open a new trade
async function openTrade(input, signalData) {
    const trade = await prisma_1.prisma.trade.create({
        data: {
            sessionId: input.sessionId,
            side: mapSide(input.side),
            status: client_1.TradeStatus.OPEN,
            entryPrice: input.entryPrice,
            size: input.size,
            sizeUsd: input.sizeUsd,
            riskAmount: input.riskAmount,
            stopLoss: input.stopLoss,
            takeProfit: input.takeProfit,
            entryZone: mapZone(input.entryZone ?? null),
            fastMAAtEntry: input.fastMAAtEntry,
            slowMAAtEntry: input.slowMAAtEntry,
            atrAtEntry: input.atrAtEntry,
            externalId: input.externalId,
            ...(signalData && {
                signal: {
                    create: {
                        isCrossover: signalData.isCrossover,
                        isContinuation: signalData.isContinuation,
                        fastMA: signalData.fastMA,
                        slowMA: signalData.slowMA,
                        atr: signalData.atr,
                        zone: mapZone(signalData.zone),
                        rangeHigh: signalData.rangeHigh,
                        rangeLow: signalData.rangeLow,
                        equilibrium: signalData.equilibrium,
                        swingHighPrice: signalData.swingHighPrice,
                        swingHighTime: signalData.swingHighTime,
                        swingLowPrice: signalData.swingLowPrice,
                        swingLowTime: signalData.swingLowTime,
                    },
                },
            }),
        },
        include: { signal: true },
    });
    console.log(`📈 Trade opened: ${trade.id} (${input.side.toUpperCase()} @ ${input.entryPrice})`);
    return trade;
}
// Close a trade
async function closeTrade(input) {
    // Get the original trade to calculate P&L
    const original = await prisma_1.prisma.trade.findUnique({
        where: { id: input.tradeId },
    });
    if (!original) {
        throw new Error(`Trade not found: ${input.tradeId}`);
    }
    // Calculate P&L
    // Use sizeUsd / entryPrice to get actual asset quantity (handles contractValue properly)
    const entryPrice = Number(original.entryPrice);
    const exitPrice = input.exitPrice;
    const sizeUsd = Number(original.sizeUsd);
    const riskAmount = Number(original.riskAmount);
    // Calculate actual asset size from sizeUsd (e.g., $1000 position at $100k BTC = 0.01 BTC)
    const assetSize = sizeUsd / entryPrice;
    let pnlUsd;
    if (original.side === client_1.TradeSide.LONG) {
        pnlUsd = (exitPrice - entryPrice) * assetSize;
    }
    else {
        pnlUsd = (entryPrice - exitPrice) * assetSize;
    }
    const pnlPercent = (pnlUsd / Number(original.sizeUsd)) * 100;
    const rMultiple = riskAmount > 0 ? pnlUsd / riskAmount : 0;
    const trade = await prisma_1.prisma.trade.update({
        where: { id: input.tradeId },
        data: {
            status: mapStatus(input.status),
            exitPrice,
            exitTime: new Date(),
            exitZone: mapZone(input.exitZone ?? null),
            exitReason: input.exitReason,
            pnlUsd,
            pnlPercent,
            rMultiple,
        },
    });
    const pnlStr = pnlUsd >= 0 ? `+$${pnlUsd.toFixed(2)}` : `-$${Math.abs(pnlUsd).toFixed(2)}`;
    console.log(`📉 Trade closed: ${trade.id} (${input.status}) ${pnlStr} (${rMultiple.toFixed(2)}R)`);
    return trade;
}
// Get open trades for a session
async function getOpenTrades(sessionId) {
    return prisma_1.prisma.trade.findMany({
        where: {
            sessionId,
            status: client_1.TradeStatus.OPEN,
        },
        include: { signal: true },
    });
}
// Get a single open trade for a session (for restoring state)
async function getOpenTrade(sessionId) {
    return prisma_1.prisma.trade.findFirst({
        where: {
            sessionId,
            status: client_1.TradeStatus.OPEN,
        },
        include: { signal: true },
    });
}
// Get all trades for a session
async function getSessionTrades(sessionId) {
    return prisma_1.prisma.trade.findMany({
        where: { sessionId },
        orderBy: { entryTime: "desc" },
        include: { signal: true },
    });
}
// Get trades by date range
async function getTradesByDateRange(sessionId, startDate, endDate) {
    return prisma_1.prisma.trade.findMany({
        where: {
            sessionId,
            entryTime: {
                gte: startDate,
                lte: endDate,
            },
        },
        orderBy: { entryTime: "asc" },
        include: { signal: true },
    });
}
// Save a paper trade (for migration from in-memory)
async function savePaperTrade(sessionId, paperTrade, sizeUsd, riskAmount) {
    const pnlUsd = paperTrade.pnl ?? 0;
    const rMultiple = riskAmount > 0 ? pnlUsd / riskAmount : 0;
    return prisma_1.prisma.trade.create({
        data: {
            sessionId,
            side: mapSide(paperTrade.side),
            status: mapStatus(paperTrade.status),
            entryPrice: paperTrade.entryPrice,
            entryTime: paperTrade.entryTime,
            size: paperTrade.size,
            sizeUsd,
            riskAmount,
            stopLoss: paperTrade.stopLoss,
            takeProfit: paperTrade.takeProfit,
            exitPrice: paperTrade.exitPrice,
            exitTime: paperTrade.exitTime,
            pnlUsd: paperTrade.pnl,
            pnlPercent: sizeUsd > 0 ? (pnlUsd / sizeUsd) * 100 : 0,
            rMultiple,
        },
    });
}
// Get recent trades across all sessions
async function getRecentTrades(limit = 50) {
    return prisma_1.prisma.trade.findMany({
        orderBy: { entryTime: "desc" },
        take: limit,
        include: {
            session: {
                select: { name: true, symbol: true, timeframe: true },
            },
            signal: true,
        },
    });
}
//# sourceMappingURL=trade-service.js.map