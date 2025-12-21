import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
  } finally {
    await prisma.$disconnect();
  }
}
