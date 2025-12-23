"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBestSessions = exports.compareSessions = exports.getEquityCurve = exports.updateDailyPerformance = exports.getSnapshotHistory = exports.getLatestSnapshot = exports.createSessionSnapshot = exports.calculateSessionStats = exports.getAvailableData = exports.deleteOldCandles = exports.getCandleCount = exports.getLatestCandle = exports.getCandles = exports.saveCandles = exports.saveCandle = exports.getRecentTrades = exports.savePaperTrade = exports.getTradesByDateRange = exports.getSessionTrades = exports.getOpenTrade = exports.getOpenTrades = exports.closeTrade = exports.openTrade = exports.getAllSessionsWithStats = exports.getSessionsByConfig = exports.resumeSession = exports.pauseSession = exports.endSession = exports.updateSessionBalance = exports.getActiveSessions = exports.getSession = exports.createSession = exports.testConnection = exports.disconnectPrisma = exports.prisma = void 0;
// Database module exports
var prisma_1 = require("./prisma");
Object.defineProperty(exports, "prisma", { enumerable: true, get: function () { return prisma_1.prisma; } });
Object.defineProperty(exports, "disconnectPrisma", { enumerable: true, get: function () { return prisma_1.disconnectPrisma; } });
Object.defineProperty(exports, "testConnection", { enumerable: true, get: function () { return prisma_1.testConnection; } });
// Session management
var session_service_1 = require("./session-service");
Object.defineProperty(exports, "createSession", { enumerable: true, get: function () { return session_service_1.createSession; } });
Object.defineProperty(exports, "getSession", { enumerable: true, get: function () { return session_service_1.getSession; } });
Object.defineProperty(exports, "getActiveSessions", { enumerable: true, get: function () { return session_service_1.getActiveSessions; } });
Object.defineProperty(exports, "updateSessionBalance", { enumerable: true, get: function () { return session_service_1.updateSessionBalance; } });
Object.defineProperty(exports, "endSession", { enumerable: true, get: function () { return session_service_1.endSession; } });
Object.defineProperty(exports, "pauseSession", { enumerable: true, get: function () { return session_service_1.pauseSession; } });
Object.defineProperty(exports, "resumeSession", { enumerable: true, get: function () { return session_service_1.resumeSession; } });
Object.defineProperty(exports, "getSessionsByConfig", { enumerable: true, get: function () { return session_service_1.getSessionsByConfig; } });
Object.defineProperty(exports, "getAllSessionsWithStats", { enumerable: true, get: function () { return session_service_1.getAllSessionsWithStats; } });
// Trade tracking
var trade_service_1 = require("./trade-service");
Object.defineProperty(exports, "openTrade", { enumerable: true, get: function () { return trade_service_1.openTrade; } });
Object.defineProperty(exports, "closeTrade", { enumerable: true, get: function () { return trade_service_1.closeTrade; } });
Object.defineProperty(exports, "getOpenTrades", { enumerable: true, get: function () { return trade_service_1.getOpenTrades; } });
Object.defineProperty(exports, "getOpenTrade", { enumerable: true, get: function () { return trade_service_1.getOpenTrade; } });
Object.defineProperty(exports, "getSessionTrades", { enumerable: true, get: function () { return trade_service_1.getSessionTrades; } });
Object.defineProperty(exports, "getTradesByDateRange", { enumerable: true, get: function () { return trade_service_1.getTradesByDateRange; } });
Object.defineProperty(exports, "savePaperTrade", { enumerable: true, get: function () { return trade_service_1.savePaperTrade; } });
Object.defineProperty(exports, "getRecentTrades", { enumerable: true, get: function () { return trade_service_1.getRecentTrades; } });
// Market data
var candle_service_1 = require("./candle-service");
Object.defineProperty(exports, "saveCandle", { enumerable: true, get: function () { return candle_service_1.saveCandle; } });
Object.defineProperty(exports, "saveCandles", { enumerable: true, get: function () { return candle_service_1.saveCandles; } });
Object.defineProperty(exports, "getCandles", { enumerable: true, get: function () { return candle_service_1.getCandles; } });
Object.defineProperty(exports, "getLatestCandle", { enumerable: true, get: function () { return candle_service_1.getLatestCandle; } });
Object.defineProperty(exports, "getCandleCount", { enumerable: true, get: function () { return candle_service_1.getCandleCount; } });
Object.defineProperty(exports, "deleteOldCandles", { enumerable: true, get: function () { return candle_service_1.deleteOldCandles; } });
Object.defineProperty(exports, "getAvailableData", { enumerable: true, get: function () { return candle_service_1.getAvailableData; } });
// Analytics
var analytics_service_1 = require("./analytics-service");
Object.defineProperty(exports, "calculateSessionStats", { enumerable: true, get: function () { return analytics_service_1.calculateSessionStats; } });
Object.defineProperty(exports, "createSessionSnapshot", { enumerable: true, get: function () { return analytics_service_1.createSessionSnapshot; } });
Object.defineProperty(exports, "getLatestSnapshot", { enumerable: true, get: function () { return analytics_service_1.getLatestSnapshot; } });
Object.defineProperty(exports, "getSnapshotHistory", { enumerable: true, get: function () { return analytics_service_1.getSnapshotHistory; } });
Object.defineProperty(exports, "updateDailyPerformance", { enumerable: true, get: function () { return analytics_service_1.updateDailyPerformance; } });
Object.defineProperty(exports, "getEquityCurve", { enumerable: true, get: function () { return analytics_service_1.getEquityCurve; } });
Object.defineProperty(exports, "compareSessions", { enumerable: true, get: function () { return analytics_service_1.compareSessions; } });
Object.defineProperty(exports, "getBestSessions", { enumerable: true, get: function () { return analytics_service_1.getBestSessions; } });
//# sourceMappingURL=index.js.map