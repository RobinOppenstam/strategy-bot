"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const prisma_1 = require("./db/prisma");
async function main() {
    // List all backtests
    const backtests = await prisma_1.prisma.backtest.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
            id: true,
            name: true,
            symbol: true,
            timeframe: true,
            bankrollUsd: true,
            riskPercent: true,
            leverage: true,
            riskRewardRatio: true,
            swingLength: true,
            slDistance: true,
            fastMAPeriod: true,
            slowMAPeriod: true,
            allowTrendContinuation: true,
            exitOnZoneChange: true,
            contractValue: true,
            totalTrades: true,
            winRate: true,
            totalPnl: true,
            finalBalance: true,
        },
    });
    console.log("\n=== All Backtests ===\n");
    backtests.forEach((bt, i) => {
        console.log(`${i + 1}. ${bt.name}`);
        console.log(`   Symbol: ${bt.symbol} ${bt.timeframe}`);
        console.log(`   Bankroll: $${bt.bankrollUsd}, Risk: ${Number(bt.riskPercent) * 100}%, Leverage: ${bt.leverage}x`);
        console.log(`   R:R: ${bt.riskRewardRatio}, Swing: ${bt.swingLength}, SL: ${bt.slDistance}`);
        console.log(`   MA: ${bt.fastMAPeriod}/${bt.slowMAPeriod}`);
        console.log(`   Trades: ${bt.totalTrades}, Win Rate: ${bt.winRate ? Number(bt.winRate) * 100 : 'N/A'}%`);
        console.log(`   Final Balance: $${bt.finalBalance}, PnL: $${bt.totalPnl}`);
        console.log("");
    });
    // Specifically search for 002
    const v002 = await prisma_1.prisma.backtest.findMany({
        where: {
            name: {
                contains: "002",
                mode: "insensitive",
            },
        },
    });
    if (v002.length > 0) {
        console.log("\n=== Found v1 002 ===\n");
        console.log(JSON.stringify(v002[0], null, 2));
    }
    process.exit(0);
}
main().catch(console.error);
//# sourceMappingURL=query-backtest.js.map