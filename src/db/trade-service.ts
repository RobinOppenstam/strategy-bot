import { prisma } from "./prisma";
import type { ZoneType as LocalZoneType, PaperTrade } from "../types";
import {
  TradeSide,
  TradeStatus,
  ZoneType,
  Trade,
  TradeSignal,
} from "@prisma/client";

// Map local types to Prisma enums
function mapSide(side: "long" | "short"): TradeSide {
  return side === "long" ? TradeSide.LONG : TradeSide.SHORT;
}

function mapZone(zone: LocalZoneType | null): ZoneType | null {
  if (!zone) return null;
  const mapping: Record<LocalZoneType, ZoneType> = {
    premium: ZoneType.PREMIUM,
    discount: ZoneType.DISCOUNT,
    equilibrium: ZoneType.EQUILIBRIUM,
  };
  return mapping[zone];
}

function mapStatus(
  status: "open" | "closed_tp" | "closed_sl" | "closed_signal" | "closed_manual"
): TradeStatus {
  const mapping: Record<string, TradeStatus> = {
    open: TradeStatus.OPEN,
    closed_tp: TradeStatus.CLOSED_TP,
    closed_sl: TradeStatus.CLOSED_SL,
    closed_signal: TradeStatus.CLOSED_SIGNAL,
    closed_manual: TradeStatus.CLOSED_MANUAL,
  };
  return mapping[status] ?? TradeStatus.OPEN;
}

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

// Open a new trade
export async function openTrade(
  input: OpenTradeInput,
  signalData?: TradeSignalInput
): Promise<Trade> {
  const trade = await prisma.trade.create({
    data: {
      sessionId: input.sessionId,
      side: mapSide(input.side),
      status: TradeStatus.OPEN,
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
            zone: mapZone(signalData.zone)!,
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

  console.log(
    `📈 Trade opened: ${trade.id} (${input.side.toUpperCase()} @ ${input.entryPrice})`
  );
  return trade;
}

export interface CloseTradeInput {
  tradeId: string;
  exitPrice: number;
  exitZone?: LocalZoneType;
  exitReason?: string;
  status: "closed_tp" | "closed_sl" | "closed_signal" | "closed_manual";
}

// Close a trade
export async function closeTrade(input: CloseTradeInput): Promise<Trade> {
  // Get the original trade to calculate P&L
  const original = await prisma.trade.findUnique({
    where: { id: input.tradeId },
  });

  if (!original) {
    throw new Error(`Trade not found: ${input.tradeId}`);
  }

  // Calculate P&L
  const entryPrice = Number(original.entryPrice);
  const exitPrice = input.exitPrice;
  const size = Number(original.size);
  const riskAmount = Number(original.riskAmount);

  let pnlUsd: number;
  if (original.side === TradeSide.LONG) {
    pnlUsd = (exitPrice - entryPrice) * size;
  } else {
    pnlUsd = (entryPrice - exitPrice) * size;
  }

  const pnlPercent = (pnlUsd / Number(original.sizeUsd)) * 100;
  const rMultiple = riskAmount > 0 ? pnlUsd / riskAmount : 0;

  const trade = await prisma.trade.update({
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
  console.log(
    `📉 Trade closed: ${trade.id} (${input.status}) ${pnlStr} (${rMultiple.toFixed(2)}R)`
  );
  return trade;
}

// Get open trades for a session
export async function getOpenTrades(sessionId: string): Promise<Trade[]> {
  return prisma.trade.findMany({
    where: {
      sessionId,
      status: TradeStatus.OPEN,
    },
    include: { signal: true },
  });
}

// Get all trades for a session
export async function getSessionTrades(sessionId: string): Promise<Trade[]> {
  return prisma.trade.findMany({
    where: { sessionId },
    orderBy: { entryTime: "desc" },
    include: { signal: true },
  });
}

// Get trades by date range
export async function getTradesByDateRange(
  sessionId: string,
  startDate: Date,
  endDate: Date
): Promise<Trade[]> {
  return prisma.trade.findMany({
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
export async function savePaperTrade(
  sessionId: string,
  paperTrade: PaperTrade,
  sizeUsd: number,
  riskAmount: number
): Promise<Trade> {
  const pnlUsd = paperTrade.pnl ?? 0;
  const rMultiple = riskAmount > 0 ? pnlUsd / riskAmount : 0;

  return prisma.trade.create({
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
export async function getRecentTrades(limit: number = 50): Promise<Trade[]> {
  return prisma.trade.findMany({
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
