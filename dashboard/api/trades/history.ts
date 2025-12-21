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

  const { limit = '50', offset = '0' } = req.query;

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
  } finally {
    await prisma.$disconnect();
  }
}
