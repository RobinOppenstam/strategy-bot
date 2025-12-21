import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { prisma } from './db/prisma';
const app = express();
const PORT = process.env.DASHBOARD_PORT || 3001;

app.use(cors());
app.use(express.json());

// Get all sessions with stats
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
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
        if (runningBalance > peak) peak = runningBalance;
        const drawdown = ((peak - runningBalance) / peak) * 100;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
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
  } catch (error) {
    console.error('Sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get stats with per-session equity curves (portfolio value over time)
app.get('/api/stats', async (req, res) => {
  try {
    // Get all active sessions with initial balance
    const sessions = await prisma.session.findMany({
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
    const sessionInitialBalance: Record<string, number> = {};
    const sessionBalance: Record<string, number> = {};
    sessions.forEach(s => {
      const initial = Number(s.initialBalance) || 10000;
      sessionInitialBalance[s.id] = initial;
      sessionBalance[s.id] = initial;
    });

    // Get all closed trades grouped by session
    const trades = await prisma.trade.findMany({
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
    const earliestStart = sessions.reduce((min, s) =>
      s.startedAt < min ? s.startedAt : min, sessions[0].startedAt);

    const equityCurve: Array<Record<string, string | number | Date | null>> = [];

    // Add starting point with initial balances
    const startPoint: Record<string, string | number | Date | null> = {
      time: earliestStart,
    };
    sessions.forEach(s => {
      startPoint[s.name.replace(/\s+/g, '')] = sessionInitialBalance[s.id];
    });
    equityCurve.push(startPoint);

    // Build equity curve from trades
    trades.forEach(trade => {
      sessionBalance[trade.sessionId] += Number(trade.pnlUsd || 0);

      const point: Record<string, string | number | Date | null> = {
        time: trade.exitTime,
      };
      // Include current balance for each session
      sessions.forEach(s => {
        point[s.name.replace(/\s+/g, '')] = sessionBalance[s.id];
      });
      equityCurve.push(point);
    });

    // Calculate totals
    const totalPnl = sessions.reduce((sum, s) =>
      sum + (sessionBalance[s.id] - sessionInitialBalance[s.id]), 0);

    res.json({
      equityCurve,
      totalTrades: trades.length,
      totalPnl,
      sessionNames: sessions.map(s => s.name)
    });
  } catch (error) {
    console.error('Stats endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch stats', details: String(error) });
  }
});

// Get open positions
app.get('/api/trades/open', async (req, res) => {
  try {
    const trades = await prisma.trade.findMany({
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch open trades' });
  }
});

// Get trade history
app.get('/api/trades/history', async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  try {
    const trades = await prisma.trade.findMany({
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
  } catch (error) {
    console.error('Trade history error:', error);
    res.status(500).json({ error: 'Failed to fetch trade history' });
  }
});

app.listen(PORT, () => {
  console.log(`Dashboard API server running on http://localhost:${PORT}`);
});
