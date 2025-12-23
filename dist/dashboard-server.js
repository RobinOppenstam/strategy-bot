"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const prisma_1 = require("./db/prisma");
const backtest_service_1 = require("./backtest/backtest-service");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// CORS configuration for cross-origin requests
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://strategy-bot-eta.vercel.app',
        process.env.FRONTEND_URL || ''
    ].filter(Boolean),
    credentials: true
}));
app.use(express_1.default.json());
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Get all sessions with stats
app.get('/api/sessions', async (req, res) => {
    try {
        const sessions = await prisma_1.prisma.session.findMany({
            where: { status: 'ACTIVE' },
            orderBy: { startedAt: 'desc' },
            include: {
                trades: {
                    select: {
                        pnlUsd: true,
                        status: true
                    }
                }
            }
        });
        // Calculate stats for each session
        const sessionsWithStats = sessions.map(session => {
            const closedTrades = session.trades.filter(t => t.status !== 'OPEN');
            const wins = closedTrades.filter(t => Number(t.pnlUsd || 0) > 0).length;
            const losses = closedTrades.filter(t => Number(t.pnlUsd || 0) < 0).length;
            const totalPnl = closedTrades.reduce((sum, t) => sum + Number(t.pnlUsd || 0), 0);
            const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;
            // Calculate max drawdown
            let peak = Number(session.initialBalance);
            let maxDrawdown = 0;
            let runningBalance = peak;
            closedTrades.forEach(t => {
                runningBalance += Number(t.pnlUsd || 0);
                if (runningBalance > peak)
                    peak = runningBalance;
                const drawdown = ((peak - runningBalance) / peak) * 100;
                if (drawdown > maxDrawdown)
                    maxDrawdown = drawdown;
            });
            return {
                id: session.id,
                name: session.name,
                symbol: session.symbol,
                timeframe: session.timeframe,
                leverage: session.leverage,
                initialBalance: Number(session.initialBalance),
                currentBalance: Number(session.currentBalance),
                totalPnl,
                winRate,
                maxDrawdown,
                totalTrades: closedTrades.length,
                wins,
                losses,
                openTrades: session.trades.filter(t => t.status === 'OPEN').length
            };
        });
        res.json(sessionsWithStats);
    }
    catch (error) {
        console.error('Sessions error:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});
// Get stats with per-session equity curves (portfolio value over time)
app.get('/api/stats', async (req, res) => {
    try {
        // Get all active sessions with initial balance
        const sessions = await prisma_1.prisma.session.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true, name: true, initialBalance: true, startedAt: true }
        });
        if (sessions.length === 0) {
            return res.json({
                equityCurve: [],
                totalTrades: 0,
                totalPnl: 0,
                sessionNames: []
            });
        }
        // Build initial balances map
        const sessionInitialBalance = {};
        const sessionBalance = {};
        sessions.forEach(s => {
            const initial = Number(s.initialBalance) || 10000;
            sessionInitialBalance[s.id] = initial;
            sessionBalance[s.id] = initial;
        });
        // Get all closed trades grouped by session
        const trades = await prisma_1.prisma.trade.findMany({
            where: {
                status: { not: 'OPEN' },
                sessionId: { in: sessions.map(s => s.id) }
            },
            orderBy: { exitTime: 'asc' },
            select: {
                id: true,
                sessionId: true,
                exitTime: true,
                pnlUsd: true,
                session: {
                    select: {
                        name: true,
                        symbol: true
                    }
                }
            }
        });
        // Start with initial balances at session start time
        const earliestStart = sessions.reduce((min, s) => s.startedAt < min ? s.startedAt : min, sessions[0].startedAt);
        const equityCurve = [];
        // Add starting point with initial balances
        const startPoint = {
            time: earliestStart,
        };
        sessions.forEach(s => {
            startPoint[s.name.replace(/\s+/g, '')] = sessionInitialBalance[s.id];
        });
        equityCurve.push(startPoint);
        // Build equity curve from trades
        trades.forEach(trade => {
            sessionBalance[trade.sessionId] += Number(trade.pnlUsd || 0);
            const point = {
                time: trade.exitTime,
            };
            // Include current balance for each session
            sessions.forEach(s => {
                point[s.name.replace(/\s+/g, '')] = sessionBalance[s.id];
            });
            equityCurve.push(point);
        });
        // Calculate totals
        const totalPnl = sessions.reduce((sum, s) => sum + (sessionBalance[s.id] - sessionInitialBalance[s.id]), 0);
        res.json({
            equityCurve,
            totalTrades: trades.length,
            totalPnl,
            sessionNames: sessions.map(s => s.name)
        });
    }
    catch (error) {
        console.error('Stats endpoint error:', error);
        res.status(500).json({ error: 'Failed to fetch stats', details: String(error) });
    }
});
// Get open positions
app.get('/api/trades/open', async (req, res) => {
    try {
        const trades = await prisma_1.prisma.trade.findMany({
            where: {
                status: 'OPEN'
            },
            include: {
                session: {
                    select: {
                        name: true,
                        symbol: true
                    }
                }
            },
            orderBy: { entryTime: 'desc' }
        });
        res.json(trades);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch open trades' });
    }
});
// Get trade history
app.get('/api/trades/history', async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;
    try {
        const trades = await prisma_1.prisma.trade.findMany({
            where: {
                status: { not: 'OPEN' }
            },
            include: {
                session: {
                    select: {
                        name: true,
                        symbol: true
                    }
                }
            },
            orderBy: { exitTime: 'desc' },
            take: Number(limit),
            skip: Number(offset)
        });
        res.json(trades);
    }
    catch (error) {
        console.error('Trade history error:', error);
        res.status(500).json({ error: 'Failed to fetch trade history' });
    }
});
// ===========================================================================
// BACKTEST ENDPOINTS
// ===========================================================================
// Get data availability for backtesting
app.get('/api/data/availability', async (req, res) => {
    try {
        const availability = await backtest_service_1.backtestService.getDataAvailability();
        res.json(availability);
    }
    catch (error) {
        console.error('Data availability error:', error);
        res.status(500).json({ error: 'Failed to fetch data availability' });
    }
});
// Get all backtests
app.get('/api/backtests', async (req, res) => {
    try {
        const backtests = await backtest_service_1.backtestService.getAllBacktests();
        res.json(backtests);
    }
    catch (error) {
        console.error('Backtests error:', error);
        res.status(500).json({ error: 'Failed to fetch backtests' });
    }
});
// Get single backtest with trades
app.get('/api/backtests/:id', async (req, res) => {
    try {
        const backtest = await backtest_service_1.backtestService.getBacktest(req.params.id);
        if (!backtest) {
            return res.status(404).json({ error: 'Backtest not found' });
        }
        res.json(backtest);
    }
    catch (error) {
        console.error('Backtest error:', error);
        res.status(500).json({ error: 'Failed to fetch backtest' });
    }
});
// Get backtest status
app.get('/api/backtests/:id/status', async (req, res) => {
    try {
        const status = await backtest_service_1.backtestService.getBacktestStatus(req.params.id);
        if (!status) {
            return res.status(404).json({ error: 'Backtest not found' });
        }
        res.json(status);
    }
    catch (error) {
        console.error('Backtest status error:', error);
        res.status(500).json({ error: 'Failed to fetch backtest status' });
    }
});
// Create and run a backtest
app.post('/api/backtests', async (req, res) => {
    try {
        const { name, description, symbol, timeframe, startDate, endDate, bankrollUsd, riskPercent, leverage, riskRewardRatio, swingLength, slDistance, fastMAPeriod, slowMAPeriod, allowTrendContinuation, exitOnZoneChange, contractValue, } = req.body;
        // Validate required fields
        if (!name || !symbol || !timeframe || !startDate || !endDate) {
            return res.status(400).json({ error: 'Missing required fields: name, symbol, timeframe, startDate, endDate' });
        }
        const backtestId = await backtest_service_1.backtestService.runBacktest({
            name,
            description,
            symbol,
            timeframe,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            bankrollUsd: bankrollUsd || 10000,
            riskPercent: riskPercent || 0.02,
            leverage: leverage || 20,
            riskRewardRatio: riskRewardRatio || 2,
            swingLength: swingLength || 5,
            slDistance: slDistance || 0.001,
            fastMAPeriod: fastMAPeriod || 9,
            slowMAPeriod: slowMAPeriod || 21,
            allowTrendContinuation: allowTrendContinuation || false,
            exitOnZoneChange: exitOnZoneChange ?? true,
            contractValue: contractValue || 1,
        });
        res.status(201).json({ id: backtestId, message: 'Backtest started' });
    }
    catch (error) {
        console.error('Create backtest error:', error);
        res.status(500).json({ error: 'Failed to create backtest', details: String(error) });
    }
});
// Delete a backtest
app.delete('/api/backtests/:id', async (req, res) => {
    try {
        await backtest_service_1.backtestService.deleteBacktest(req.params.id);
        res.json({ message: 'Backtest deleted' });
    }
    catch (error) {
        console.error('Delete backtest error:', error);
        res.status(500).json({ error: 'Failed to delete backtest' });
    }
});
// Test database connection on startup
prisma_1.prisma.$connect()
    .then(() => {
    console.log('✅ Database connected successfully');
    app.listen(PORT, () => {
        console.log(`Dashboard API server running on http://localhost:${PORT}`);
    });
})
    .catch((err) => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
});
//# sourceMappingURL=dashboard-server.js.map