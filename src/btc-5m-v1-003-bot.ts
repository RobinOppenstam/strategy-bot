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
// BTC 5M V1 002 CONFIGURATION
// Exact parameters from backtest "btc 5m v1 002"
// Using Hyperliquid exchange
// ============================================================================

const config: Config = {
  // Session name
  name: "BTC 5m v1 002 Live",

  // API CREDENTIALS (Hyperliquid: wallet address + private key)
  apiKey: process.env.HYPERLIQUID_WALLET_ADDRESS || "",
  apiSecret: process.env.HYPERLIQUID_PRIVATE_KEY || "",

  // PAPER TRADING MODE - Set to true for paper trading
  paperTrading: true,
  initialBalance: 1000,

  // MARKET CONFIG
  symbol: process.env.SYMBOL || "BTC",
  timeframe: "Min5",
  leverage: parseInt(process.env.LEVERAGE || "20", 10),

  // POSITION SIZING (from backtest v1 002)
  bankrollUsd: 1000,
  riskPercent: 0.02, // 2% risk per trade

  // CONTRACT VALUE
  // Hyperliquid: 1 = 1 BTC (trades in actual BTC size)
  contractValue: 1,

  // SWING DETECTION (from backtest)
  swingLength: 5,

  // STOP LOSS SETTINGS (from backtest)
  slDistance: 0.001, // Very tight SL

  // MOVING AVERAGES (from backtest)
  fastMAPeriod: 9,
  slowMAPeriod: 21,

  // RISK MANAGEMENT (from backtest v1 002)
  riskRewardRatio: 2.0, // 1:2 risk reward

  // STRATEGY OPTIONS (from backtest)
  allowTrendContinuation: false,
  exitOnZoneChange: true,

  // DATA SOURCE
  dataSource: "hyperliquid",
};

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║            BTC 5M V1 002 - LIVE TRADING BOT                    ║
║                                                                ║
║  Strategy: ICT Premium/Discount Zones + MA Crossover           ║
║  Exchange:  Hyperliquid                                        ║
║                                                                ║
║  Configuration (from backtest "btc 5m v1 002"):                ║
║    Symbol:         ${config.symbol.padEnd(43)}║
║    Timeframe:      5 minute                                    ║
║    Leverage:       ${config.leverage}x${" ".repeat(42 - config.leverage.toString().length)}║
║    Bankroll:       $1000                                       ║
║    Risk/Trade:     2%                                          ║
║    Risk:Reward:    1:2                                         ║
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

  // Check for credentials if not paper trading
  if (!config.paperTrading) {
    if (!config.apiKey || !config.apiSecret) {
      console.error(
        "ERROR: Set HYPERLIQUID_WALLET_ADDRESS and HYPERLIQUID_PRIVATE_KEY for live trading"
      );
      process.exit(1);
    }
    console.log(`⚠️  LIVE TRADING MODE on Hyperliquid - Real money at risk!\n`);
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

    // Send startup notification to Discord with real balance for live trading
    const startupBalance = bot.isLiveTrading()
      ? await bot.getRealBalance()
      : config.initialBalance;
    const summaryData: DailySummaryBot[] = [
      {
        name: config.name ?? config.symbol,
        balance: startupBalance,
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
          const balance = bot.isLiveTrading()
            ? await bot.getRealBalance()
            : bot.getPaperStats().balance;
          await updateSessionBalance(sessionId!, balance);
          await createSessionSnapshot(sessionId!);
          console.log(`[Bot] 📸 Snapshot saved (Balance: $${balance.toFixed(2)})`);
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
          const balance = bot.isLiveTrading()
            ? await bot.getRealBalance()
            : bot.getPaperStats().balance;
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
              balance,
              initialBalance: config.initialBalance,
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
      const finalBalance = bot.isLiveTrading()
        ? await bot.getRealBalance()
        : stats.balance;

      console.log("\n" + "=".repeat(50));
      console.log("        BTC 5M V1 002 TRADING RESULTS");
      console.log("=".repeat(50));
      console.log(`  Symbol:           ${config.symbol} ${config.timeframe}`);
      console.log(`  Mode:             ${bot.isLiveTrading() ? "LIVE" : "PAPER"}`);
      console.log(`  Starting Balance: $${config.initialBalance.toFixed(2)}`);
      console.log(`  Final Balance:    $${finalBalance.toFixed(2)}`);
      console.log(
        `  Total P&L:        ${(finalBalance - config.initialBalance) >= 0 ? "+" : ""}$${(finalBalance - config.initialBalance).toFixed(2)}`
      );
      console.log(
        `  Return:           ${(((finalBalance - config.initialBalance) / config.initialBalance) * 100).toFixed(2)}%`
      );
      console.log(`  Total Trades:     ${trades.length}`);
      console.log(`  Wins:             ${stats.winCount}`);
      console.log(`  Losses:           ${stats.lossCount}`);
      console.log(
        `  Win Rate:         ${trades.length > 0 ? ((stats.winCount / trades.length) * 100).toFixed(1) : 0}%`
      );

      if (sessionId) {
        try {
          await updateSessionBalance(sessionId, finalBalance);
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
