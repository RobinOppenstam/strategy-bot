import "dotenv/config";
import { TrendStrategyBot } from "./bot";
import { Config } from "./types";
import {
  testConnection,
  createSession,
  updateSessionBalance,
  createSessionSnapshot,
  disconnectPrisma,
} from "./db";
import { notifyDailySummary, DailySummaryBot } from "./discord";

// ============================================================================
// BTC 5M V1 003 CONFIGURATION
// Exact parameters from backtest "btc 5m v1 003" with $100 bankroll
// ============================================================================

const config: Config = {
  // Session name
  name: "BTC 5m v1 003 Live",

  // MEXC API CREDENTIALS
  apiKey: process.env.MEXC_API_KEY || "",
  apiSecret: process.env.MEXC_API_SECRET || "",

  // PAPER TRADING MODE - Set to false for live trading
  paperTrading: process.env.MEXC_TRADING_ENABLED !== "true",
  initialBalance: 100,

  // MARKET CONFIG
  symbol: process.env.MEXC_SYMBOL || "BTC_USDT",
  timeframe: "Min5",
  leverage: parseInt(process.env.MEXC_LEVERAGE || "40", 10),

  // POSITION SIZING (from backtest)
  bankrollUsd: 100,
  riskPercent: 0.03, // 3% risk per trade (from backtest)

  // CONTRACT VALUE
  // BTC on MEXC: 1 contract = 0.0001 BTC
  contractValue: 0.0001,

  // SWING DETECTION (from backtest)
  swingLength: 5,

  // STOP LOSS SETTINGS (from backtest)
  slDistance: 0.001, // Very tight SL

  // MOVING AVERAGES (from backtest)
  fastMAPeriod: 9,
  slowMAPeriod: 21,

  // RISK MANAGEMENT (from backtest)
  riskRewardRatio: 3.0, // 1:3 risk reward

  // STRATEGY OPTIONS (from backtest)
  allowTrendContinuation: false,
  exitOnZoneChange: true,

  // DATA SOURCE
  dataSource: "mexc",
};

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║            BTC 5M V1 003 - LIVE TRADING BOT                    ║
║                                                                ║
║  Strategy: ICT Premium/Discount Zones + MA Crossover           ║
║                                                                ║
║  Configuration (from backtest "btc 5m v1 003"):                ║
║    Symbol:         BTC_USDT                                    ║
║    Timeframe:      5 minute                                    ║
║    Leverage:       40x                                         ║
║    Bankroll:       $100                                        ║
║    Risk/Trade:     3%                                          ║
║    Risk:Reward:    1:3                                         ║
║    Fast MA:        9                                           ║
║    Slow MA:        21                                          ║
║    Swing Length:   5                                           ║
╚════════════════════════════════════════════════════════════════╝
  `);

  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error(
      "⚠️  Database connection failed - running without persistence"
    );
    console.error("   Set DATABASE_URL in .env to enable data persistence\n");
  }

  // Check for MEXC credentials if not paper trading
  if (!config.paperTrading) {
    if (!config.apiKey || !config.apiSecret) {
      console.error(
        "ERROR: Set MEXC_API_KEY and MEXC_API_SECRET for live trading"
      );
      process.exit(1);
    }
    console.log("⚠️  LIVE TRADING MODE - Real money at risk!\n");
  } else {
    console.log("📝 PAPER TRADING MODE ENABLED - No real money at risk\n");
  }

  // Create database session
  let sessionId: string | null = null;
  if (dbConnected) {
    try {
      const dbSession = await createSession({
        config,
        name: config.name,
        description: `BTC 5m v1 003 strategy - $100 bankroll paper trading`,
      });
      sessionId = dbSession.id;
      console.log(`[Bot] Database session created: ${sessionId.slice(0, 8)}...`);
    } catch (error) {
      console.error("Failed to create DB session:", error);
    }
  }

  // Create bot instance
  const bot = new TrendStrategyBot(config, sessionId);

  // Snapshot interval reference
  let snapshotInterval: NodeJS.Timeout | null = null;

  try {
    // Initialize bot with retry logic
    console.log("[Bot] Initializing...\n");
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await bot.initialize();
        console.log("[Bot] ✓ Initialized successfully");
        break;
      } catch (error) {
        if (attempt < maxRetries) {
          console.log(`[Bot] ⚠ Init attempt ${attempt} failed, retrying in 5s...`);
          await new Promise((r) => setTimeout(r, 5000));
        } else {
          throw new Error(`Failed to initialize after ${maxRetries} attempts: ${error}`);
        }
      }
    }

    // Start the bot
    await bot.start();
    console.log("[Bot] Running... Press Ctrl+C to stop\n");

    // Send startup notification to Discord
    const summaryData: DailySummaryBot[] = [
      {
        name: config.name ?? config.symbol,
        balance: config.initialBalance,
        initialBalance: config.initialBalance,
        todayPnl: 0,
        wins: 0,
        losses: 0,
      },
    ];
    await notifyDailySummary(summaryData);
    console.log("[Bot] 📊 Startup notification sent to Discord");

    // Start periodic snapshots (every 5 minutes)
    if (dbConnected && sessionId) {
      snapshotInterval = setInterval(async () => {
        try {
          const stats = bot.getPaperStats();
          await updateSessionBalance(sessionId!, stats.balance);
          await createSessionSnapshot(sessionId!);
          console.log(`[Bot] 📸 Snapshot saved (Balance: $${stats.balance.toFixed(2)})`);
        } catch (error) {
          console.error("[Bot] Failed to save snapshot:", error);
        }
      }, 5 * 60 * 1000);
    }

    // Schedule daily summary at 9am Bangkok time (UTC+7)
    const scheduleDailySummary = () => {
      const now = new Date();
      const bangkokOffset = 7 * 60;
      const utcNow = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
      const bangkokNow = new Date(utcNow + bangkokOffset * 60 * 1000);

      const next9am = new Date(bangkokNow);
      next9am.setHours(9, 0, 0, 0);
      if (bangkokNow.getHours() >= 9) {
        next9am.setDate(next9am.getDate() + 1);
      }

      const next9amUtc = next9am.getTime() - bangkokOffset * 60 * 1000;
      const msUntil9am = next9amUtc - utcNow;

      console.log(
        `[Bot] Daily summary scheduled for 9am BKK (in ${Math.round(msUntil9am / 1000 / 60)} minutes)`
      );

      setTimeout(async () => {
        try {
          const stats = bot.getPaperStats();
          const trades = bot.getTrades();
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const todayTrades = trades.filter(
            (t) => t.exitTime && new Date(t.exitTime) >= today
          );
          const todayPnl = todayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
          const todayWins = todayTrades.filter((t) => (t.pnl ?? 0) > 0).length;
          const todayLosses = todayTrades.filter((t) => (t.pnl ?? 0) < 0).length;

          await notifyDailySummary([
            {
              name: config.name ?? config.symbol,
              balance: stats.balance,
              initialBalance: stats.startingBalance,
              todayPnl,
              wins: todayWins,
              losses: todayLosses,
            },
          ]);
          console.log("[Bot] 📊 Daily summary sent to Discord");
        } catch (error) {
          console.error("[Bot] Failed to send daily summary:", error);
        }

        scheduleDailySummary();
      }, msUntil9am);
    };

    scheduleDailySummary();

    // Handle shutdown
    process.on("SIGINT", async () => {
      console.log("\n[Bot] Shutting down...");

      if (snapshotInterval) {
        clearInterval(snapshotInterval);
      }

      bot.stop();

      const stats = bot.getPaperStats();
      const trades = bot.getTrades();

      console.log("\n" + "=".repeat(50));
      console.log("        BTC 5M V1 003 TRADING RESULTS");
      console.log("=".repeat(50));
      console.log(`  Symbol:           ${config.symbol} ${config.timeframe}`);
      console.log(`  Starting Balance: $${stats.startingBalance.toFixed(2)}`);
      console.log(`  Final Balance:    $${stats.balance.toFixed(2)}`);
      console.log(
        `  Total P&L:        ${stats.totalPnl >= 0 ? "+" : ""}$${stats.totalPnl.toFixed(2)}`
      );
      console.log(
        `  Return:           ${(((stats.balance - stats.startingBalance) / stats.startingBalance) * 100).toFixed(2)}%`
      );
      console.log(`  Total Trades:     ${trades.length}`);
      console.log(`  Wins:             ${stats.winCount}`);
      console.log(`  Losses:           ${stats.lossCount}`);
      console.log(
        `  Win Rate:         ${trades.length > 0 ? ((stats.winCount / trades.length) * 100).toFixed(1) : 0}%`
      );

      if (sessionId) {
        try {
          await updateSessionBalance(sessionId, stats.balance);
          await createSessionSnapshot(sessionId);
          console.log(`  Database:         Session saved ✓`);
        } catch (error) {
          console.error(`  Database:         Failed to save session`);
        }
      }

      console.log("=".repeat(50) + "\n");

      if (dbConnected) {
        await disconnectPrisma();
        console.log("[Bot] Database connection closed");
      }

      process.exit(0);
    });
  } catch (error) {
    console.error("[Bot] Fatal error:", error);
    if (dbConnected) {
      await disconnectPrisma();
    }
    process.exit(1);
  }
}

main();
