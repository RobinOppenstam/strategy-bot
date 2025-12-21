// Database module exports
export { prisma, disconnectPrisma, testConnection } from "./prisma";

// Session management
export {
  createSession,
  getSession,
  getActiveSessions,
  updateSessionBalance,
  endSession,
  pauseSession,
  resumeSession,
  getSessionsByConfig,
  getAllSessionsWithStats,
} from "./session-service";

// Trade tracking
export {
  openTrade,
  closeTrade,
  getOpenTrades,
  getOpenTrade,
  getSessionTrades,
  getTradesByDateRange,
  savePaperTrade,
  getRecentTrades,
} from "./trade-service";

// Market data
export {
  saveCandle,
  saveCandles,
  getCandles,
  getLatestCandle,
  getCandleCount,
  deleteOldCandles,
  getAvailableData,
} from "./candle-service";

// Analytics
export {
  calculateSessionStats,
  createSessionSnapshot,
  getLatestSnapshot,
  getSnapshotHistory,
  updateDailyPerformance,
  getEquityCurve,
  compareSessions,
  getBestSessions,
} from "./analytics-service";

// Re-export types
export type { CreateSessionInput } from "./session-service";
export type {
  OpenTradeInput,
  CloseTradeInput,
  TradeSignalInput,
} from "./trade-service";
export type { SessionStats } from "./analytics-service";
