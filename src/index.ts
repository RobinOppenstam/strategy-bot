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

// ============================================================================
// BASE CONFIGURATION
// ============================================================================

const baseConfig: Omit<Config, "symbol" | "timeframe" | "leverage"> = {
  // MEXC API CREDENTIALS
  apiKey: process.env.MEXC_API_KEY || "",
  apiSecret: process.env.MEXC_API_SECRET || "",

  // PAPER TRADING MODE
  paperTrading: true,
  initialBalance: 10000,

  // POSITION SIZING (Risk-based)
  bankrollUsd: 10000,
  riskPercent: 0.02,

  // SWING DETECTION
  swingLength: 10,

  // STOP LOSS SETTINGS
  slDistance: 50,

  // MOVING AVERAGES
  fastMAPeriod: 10,
  slowMAPeriod: 30,

  // RISK MANAGEMENT
  riskRewardRatio: 2.0,

  // STRATEGY OPTIONS
  allowTrendContinuation: false,
  exitOnZoneChange: true,
};

// ============================================================================
// SESSION CONFIGURATIONS
// ============================================================================

const sessions: Array<{
  name: string;
  symbol: string;
  timeframe: string;
  leverage: number;
}> = [
  { name: "BTC 15m", symbol: "BTC_USDT", timeframe: "Min15", leverage: 40 },
  { name: "BTC 5m", symbol: "BTC_USDT", timeframe: "Min5", leverage: 40 },
  { name: "ETH 5m", symbol: "ETH_USDT", timeframe: "Min5", leverage: 20 },
  { name: "ETH 15m", symbol: "ETH_USDT", timeframe: "Min15", leverage: 20 },
];

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              MEXC TREND STRATEGY BOT - MULTI SESSION           ║
║                                                                ║
║  Strategy: ICT Premium/Discount Zones + MA Crossover           ║
║                                                                ║
║  Sessions:                                                     ║
║    1. BTC_USDT 15m @ 40x                                       ║
║    2. BTC_USDT 5m  @ 40x                                       ║
║    3. ETH_USDT 5m  @ 20x                                       ║
║    4. ETH_USDT 15m @ 20x                                       ║
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

  if (baseConfig.paperTrading) {
    console.log("📝 PAPER TRADING MODE ENABLED - No real money at risk\n");
  } else {
    if (!baseConfig.apiKey || !baseConfig.apiSecret) {
      console.error(
        "ERROR: Set MEXC_API_KEY and MEXC_API_SECRET for live trading"
      );
      process.exit(1);
    }
  }

  // Create all bots with database sessions
  const bots: Array<{
    name: string;
    bot: TrendStrategyBot;
    config: Config;
    sessionId: string | null;
  }> = [];

  for (const session of sessions) {
    const config: Config = {
      ...baseConfig,
      name: session.name,
      symbol: session.symbol,
      timeframe: session.timeframe,
      leverage: session.leverage,
    };

    // Create database session if connected
    let sessionId: string | null = null;
    if (dbConnected) {
      try {
        const dbSession = await createSession({
          config,
          name: session.name,
          description: `Paper trading session for ${session.symbol} ${session.timeframe}`,
        });
        sessionId = dbSession.id;
      } catch (error) {
        console.error(`Failed to create DB session for ${session.name}:`, error);
      }
    }

    bots.push({
      name: session.name,
      bot: new TrendStrategyBot(config, sessionId),
      config,
      sessionId,
    });
  }

  // Print session configs
  console.log("Sessions:");
  bots.forEach(({ name, config, sessionId }) => {
    const dbStatus = sessionId ? `(DB: ${sessionId.slice(0, 8)}...)` : "(no DB)";
    console.log(
      `  [${name}] ${config.symbol} ${config.timeframe} @ ${config.leverage}x ${dbStatus}`
    );
  });
  console.log("");

  // Periodic snapshot interval (every 5 minutes)
  let snapshotInterval: NodeJS.Timeout | null = null;

  try {
    // Initialize all bots in parallel
    console.log("[Main] Initializing all sessions...\n");
    await Promise.all(
      bots.map(async ({ name, bot }) => {
        try {
          await bot.initialize();
          console.log(`[${name}] ✓ Initialized`);
        } catch (error) {
          console.error(`[${name}] ✗ Failed to initialize:`, error);
          throw error;
        }
      })
    );

    console.log("\n[Main] All sessions initialized. Starting...\n");

    // Start all bots in parallel
    await Promise.all(
      bots.map(async ({ name, bot }) => {
        try {
          await bot.start();
        } catch (error) {
          console.error(`[${name}] Error during start:`, error);
        }
      })
    );

    console.log("[Main] All sessions running... Press Ctrl+C to stop\n");

    // Start periodic snapshots
    if (dbConnected) {
      snapshotInterval = setInterval(async () => {
        for (const { name, sessionId, bot } of bots) {
          if (sessionId) {
            try {
              const stats = bot.getPaperStats();
              await updateSessionBalance(sessionId, stats.balance);
              await createSessionSnapshot(sessionId);
              console.log(`[${name}] 📸 Snapshot saved`);
            } catch (error) {
              console.error(`[${name}] Failed to save snapshot:`, error);
            }
          }
        }
      }, 5 * 60 * 1000); // Every 5 minutes
    }

    process.on("SIGINT", async () => {
      console.log("\n[Main] Shutting down all sessions...");

      // Stop snapshot interval
      if (snapshotInterval) {
        clearInterval(snapshotInterval);
      }

      for (const { name, bot, config, sessionId } of bots) {
        bot.stop();

        if (config.paperTrading) {
          const stats = bot.getPaperStats();
          const trades = bot.getTrades();

          console.log("\n" + "=".repeat(50));
          console.log(`           [${name}] PAPER TRADING RESULTS`);
          console.log("=".repeat(50));
          console.log(`  Symbol:           ${config.symbol} ${config.timeframe}`);
          console.log(
            `  Starting Balance: $${stats.startingBalance.toFixed(2)}`
          );
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

          // Save current state to database (session stays ACTIVE for next restart)
          if (sessionId) {
            try {
              await updateSessionBalance(sessionId, stats.balance);
              await createSessionSnapshot(sessionId);
              console.log(`  Database:         Session saved ✓`);
            } catch (error) {
              console.error(`  Database:         Failed to save session`);
            }
          }
        }
      }

      console.log("\n" + "=".repeat(50));
      console.log("           ALL SESSIONS STOPPED");
      console.log("=".repeat(50) + "\n");

      // Disconnect from database
      if (dbConnected) {
        await disconnectPrisma();
        console.log("[Main] Database connection closed");
      }

      process.exit(0);
    });
  } catch (error) {
    console.error("[Main] Fatal error:", error);
    if (dbConnected) {
      await disconnectPrisma();
    }
    process.exit(1);
  }
}

main();
