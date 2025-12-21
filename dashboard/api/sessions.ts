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
  } finally {
    await prisma.$disconnect();
  }
}
