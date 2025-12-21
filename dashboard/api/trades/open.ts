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
    console.error('Open trades error:', error);
    res.status(500).json({ error: 'Failed to fetch open trades' });
  } finally {
    await prisma.$disconnect();
  }
}
