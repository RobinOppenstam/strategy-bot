"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.getSession = getSession;
exports.getActiveSessions = getActiveSessions;
exports.updateSessionBalance = updateSessionBalance;
exports.endSession = endSession;
exports.pauseSession = pauseSession;
exports.resumeSession = resumeSession;
exports.getSessionsByConfig = getSessionsByConfig;
exports.getAllSessionsWithStats = getAllSessionsWithStats;
const prisma_1 = require("./prisma");
const client_1 = require("@prisma/client");
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
// Get or create a trading session - reuses existing active session by name
async function createSession(input) {
    const { config, name, description } = input;
    const sessionName = name ?? config.name ?? `${config.symbol} ${config.timeframe}`;
    // Check if an active session with this name already exists
    const existingSession = await prisma_1.prisma.session.findFirst({
        where: {
            name: sessionName,
            status: client_1.SessionStatus.ACTIVE,
        },
    });
    if (existingSession) {
        console.log(`📊 Session resumed: ${existingSession.id} (${existingSession.name})`);
        return existingSession;
    }
    // Create new session only if none exists
    const session = await prisma_1.prisma.session.create({
        data: {
            name: sessionName,
            description,
            mode: config.paperTrading ? client_1.TradingMode.PAPER : client_1.TradingMode.LIVE,
            status: client_1.SessionStatus.ACTIVE,
            symbol: config.symbol,
            timeframe: mapTimeframe(config.timeframe),
            bankrollUsd: config.bankrollUsd,
            riskPercent: config.riskPercent,
            leverage: config.leverage,
            riskRewardRatio: config.riskRewardRatio,
            swingLength: config.swingLength,
            slDistance: config.slDistance,
            fastMAPeriod: config.fastMAPeriod,
            slowMAPeriod: config.slowMAPeriod,
            allowTrendContinuation: config.allowTrendContinuation,
            exitOnZoneChange: config.exitOnZoneChange,
            initialBalance: config.initialBalance,
            currentBalance: config.initialBalance,
        },
    });
    console.log(`📊 Session created: ${session.id} (${session.name})`);
    return session;
}
// Get session by ID
async function getSession(sessionId) {
    return prisma_1.prisma.session.findUnique({
        where: { id: sessionId },
    });
}
// Get active sessions
async function getActiveSessions() {
    return prisma_1.prisma.session.findMany({
        where: { status: client_1.SessionStatus.ACTIVE },
        orderBy: { startedAt: "desc" },
    });
}
// Update session balance
async function updateSessionBalance(sessionId, newBalance) {
    return prisma_1.prisma.session.update({
        where: { id: sessionId },
        data: { currentBalance: newBalance },
    });
}
// End a session
async function endSession(sessionId) {
    return prisma_1.prisma.session.update({
        where: { id: sessionId },
        data: {
            status: client_1.SessionStatus.COMPLETED,
            endedAt: new Date(),
        },
    });
}
// Pause a session
async function pauseSession(sessionId) {
    return prisma_1.prisma.session.update({
        where: { id: sessionId },
        data: { status: client_1.SessionStatus.PAUSED },
    });
}
// Resume a session
async function resumeSession(sessionId) {
    return prisma_1.prisma.session.update({
        where: { id: sessionId },
        data: { status: client_1.SessionStatus.ACTIVE },
    });
}
// Get sessions by symbol and timeframe for comparison
async function getSessionsByConfig(symbol, timeframe) {
    return prisma_1.prisma.session.findMany({
        where: {
            symbol,
            ...(timeframe && { timeframe: mapTimeframe(timeframe) }),
        },
        orderBy: { startedAt: "desc" },
        include: {
            _count: {
                select: { trades: true },
            },
        },
    });
}
// Get all sessions with basic stats
async function getAllSessionsWithStats() {
    return prisma_1.prisma.session.findMany({
        orderBy: { startedAt: "desc" },
        include: {
            _count: {
                select: { trades: true },
            },
            snapshots: {
                orderBy: { snapshotTime: "desc" },
                take: 1,
            },
        },
    });
}
//# sourceMappingURL=session-service.js.map