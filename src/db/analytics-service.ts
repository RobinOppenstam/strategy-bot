import { prisma } from "./prisma";
import { TradeStatus, SessionSnapshot, DailyPerformance } from "@prisma/client";

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

// Calculate statistics for a session
export async function calculateSessionStats(
  sessionId: string
): Promise<SessionStats> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      trades: true,
    },
  });

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const trades = session.trades;
  const closedTrades = trades.filter((t) => t.status !== TradeStatus.OPEN);
  const openTrades = trades.filter((t) => t.status === TradeStatus.OPEN);

  const wins = closedTrades.filter((t) => Number(t.pnlUsd) > 0);
  const losses = closedTrades.filter((t) => Number(t.pnlUsd) < 0);

  const winCount = wins.length;
  const lossCount = losses.length;
  const totalClosed = closedTrades.length;

  const winRate = totalClosed > 0 ? winCount / totalClosed : 0;

  const totalPnl = closedTrades.reduce((sum, t) => sum + Number(t.pnlUsd ?? 0), 0);

  const avgWin =
    winCount > 0
      ? wins.reduce((sum, t) => sum + Number(t.pnlUsd), 0) / winCount
      : null;

  const avgLoss =
    lossCount > 0
      ? losses.reduce((sum, t) => sum + Number(t.pnlUsd), 0) / lossCount
      : null;

  const largestWin =
    wins.length > 0 ? Math.max(...wins.map((t) => Number(t.pnlUsd))) : null;

  const largestLoss =
    losses.length > 0 ? Math.min(...losses.map((t) => Number(t.pnlUsd))) : null;

  // Profit factor = gross profit / gross loss
  const grossProfit = wins.reduce((sum, t) => sum + Number(t.pnlUsd), 0);
  const grossLoss = Math.abs(
    losses.reduce((sum, t) => sum + Number(t.pnlUsd), 0)
  );
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;

  // Average R-multiple
  const rMultiples = closedTrades
    .filter((t) => t.rMultiple !== null)
    .map((t) => Number(t.rMultiple));
  const avgRMultiple =
    rMultiples.length > 0
      ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length
      : null;

  // Calculate max drawdown from equity curve
  const initialBalance = Number(session.initialBalance);
  let peak = initialBalance;
  let maxDrawdown = 0;

  // Sort trades by exit time
  const sortedTrades = [...closedTrades]
    .filter((t) => t.exitTime)
    .sort((a, b) => a.exitTime!.getTime() - b.exitTime!.getTime());

  let balance = initialBalance;
  for (const trade of sortedTrades) {
    balance += Number(trade.pnlUsd ?? 0);
    if (balance > peak) {
      peak = balance;
    }
    const drawdown = peak - balance;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  const returnPercent =
    initialBalance > 0 ? (totalPnl / initialBalance) * 100 : 0;

  return {
    totalTrades: trades.length,
    openTrades: openTrades.length,
    closedTrades: totalClosed,
    winCount,
    lossCount,
    winRate,
    totalPnl,
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
    profitFactor,
    avgRMultiple,
    maxDrawdown: maxDrawdown > 0 ? maxDrawdown : null,
    returnPercent,
  };
}

// Create a session snapshot
export async function createSessionSnapshot(
  sessionId: string
): Promise<SessionSnapshot> {
  const stats = await calculateSessionStats(sessionId);
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  return prisma.sessionSnapshot.create({
    data: {
      sessionId,
      balance: session.currentBalance,
      totalPnl: stats.totalPnl,
      totalTrades: stats.totalTrades,
      openTrades: stats.openTrades,
      winCount: stats.winCount,
      lossCount: stats.lossCount,
      winRate: stats.winRate,
      profitFactor: stats.profitFactor,
      avgWin: stats.avgWin,
      avgLoss: stats.avgLoss,
      largestWin: stats.largestWin,
      largestLoss: stats.largestLoss,
      maxDrawdown: stats.maxDrawdown,
      maxDrawdownPercent: stats.maxDrawdown
        ? (stats.maxDrawdown / Number(session.initialBalance)) * 100
        : null,
      avgRMultiple: stats.avgRMultiple,
      returnPercent: stats.returnPercent,
    },
  });
}

// Get latest snapshot for a session
export async function getLatestSnapshot(
  sessionId: string
): Promise<SessionSnapshot | null> {
  return prisma.sessionSnapshot.findFirst({
    where: { sessionId },
    orderBy: { snapshotTime: "desc" },
  });
}

// Get snapshot history for a session
export async function getSnapshotHistory(
  sessionId: string,
  limit?: number
): Promise<SessionSnapshot[]> {
  return prisma.sessionSnapshot.findMany({
    where: { sessionId },
    orderBy: { snapshotTime: "asc" },
    ...(limit && { take: limit }),
  });
}

// Update daily performance
export async function updateDailyPerformance(
  sessionId: string,
  date: Date
): Promise<DailyPerformance> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Get trades closed today
  const todaysTrades = await prisma.trade.findMany({
    where: {
      sessionId,
      exitTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Get trades opened today
  const tradesOpened = await prisma.trade.count({
    where: {
      sessionId,
      entryTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const dailyPnl = todaysTrades.reduce(
    (sum, t) => sum + Number(t.pnlUsd ?? 0),
    0
  );
  const winsToday = todaysTrades.filter((t) => Number(t.pnlUsd) > 0).length;
  const lossesToday = todaysTrades.filter((t) => Number(t.pnlUsd) < 0).length;

  // Get previous day's ending balance or use initial
  const previousDay = await prisma.dailyPerformance.findFirst({
    where: {
      sessionId,
      date: { lt: startOfDay },
    },
    orderBy: { date: "desc" },
  });

  const startingBalance = previousDay
    ? Number(previousDay.endingBalance)
    : Number(session.initialBalance);

  const endingBalance = startingBalance + dailyPnl;
  const dailyReturn =
    startingBalance > 0 ? (dailyPnl / startingBalance) * 100 : 0;

  // Track high water mark
  const previousHWM = previousDay
    ? Number(previousDay.highWaterMark)
    : startingBalance;
  const highWaterMark = Math.max(previousHWM, endingBalance);
  const drawdown = highWaterMark - endingBalance;

  return prisma.dailyPerformance.upsert({
    where: {
      sessionId_symbol_date: {
        sessionId,
        symbol: session.symbol,
        date: startOfDay,
      },
    },
    update: {
      endingBalance,
      dailyPnl,
      dailyReturn,
      tradesClosed: todaysTrades.length,
      tradesOpened,
      winsToday,
      lossesToday,
      highWaterMark,
      drawdown,
    },
    create: {
      sessionId,
      symbol: session.symbol,
      date: startOfDay,
      startingBalance,
      endingBalance,
      dailyPnl,
      dailyReturn,
      tradesOpened,
      tradesClosed: todaysTrades.length,
      winsToday,
      lossesToday,
      highWaterMark,
      drawdown,
    },
  });
}

// Get equity curve data for charting
export async function getEquityCurve(
  sessionId: string
): Promise<{ date: Date; balance: number; pnl: number }[]> {
  const performance = await prisma.dailyPerformance.findMany({
    where: { sessionId },
    orderBy: { date: "asc" },
  });

  return performance.map((p) => ({
    date: p.date,
    balance: Number(p.endingBalance),
    pnl: Number(p.dailyPnl),
  }));
}

// Compare multiple sessions
export async function compareSessions(sessionIds: string[]): Promise<
  {
    sessionId: string;
    name: string;
    symbol: string;
    timeframe: string;
    stats: SessionStats;
  }[]
> {
  const results = [];

  for (const sessionId of sessionIds) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (session) {
      const stats = await calculateSessionStats(sessionId);
      results.push({
        sessionId,
        name: session.name,
        symbol: session.symbol,
        timeframe: session.timeframe,
        stats,
      });
    }
  }

  return results;
}

// Get best performing sessions
export async function getBestSessions(
  limit: number = 10,
  orderBy: "winRate" | "totalPnl" | "profitFactor" = "totalPnl"
): Promise<SessionSnapshot[]> {
  // Get latest snapshot for each session
  const sessions = await prisma.session.findMany({
    include: {
      snapshots: {
        orderBy: { snapshotTime: "desc" },
        take: 1,
      },
    },
  });

  // Filter sessions with snapshots and sort
  const withSnapshots = sessions
    .filter((s) => s.snapshots.length > 0)
    .map((s) => s.snapshots[0]);

  return withSnapshots
    .sort((a, b) => {
      switch (orderBy) {
        case "winRate":
          return Number(b.winRate) - Number(a.winRate);
        case "profitFactor":
          return Number(b.profitFactor ?? 0) - Number(a.profitFactor ?? 0);
        default:
          return Number(b.totalPnl) - Number(a.totalPnl);
      }
    })
    .slice(0, limit);
}
