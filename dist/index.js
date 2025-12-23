"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bot_1 = require("./bot");
const db_1 = require("./db");
const discord_1 = require("./discord");
// ============================================================================
// BASE CONFIGURATION (for Crypto - MEXC)
// ============================================================================
const cryptoBaseConfig = {
    // MEXC API CREDENTIALS
    apiKey: process.env.MEXC_API_KEY || "",
    apiSecret: process.env.MEXC_API_SECRET || "",
    // PAPER TRADING MODE
    paperTrading: true,
    initialBalance: 10000,
    // POSITION SIZING (Risk-based)
    bankrollUsd: 10000,
    riskPercent: 0.02, // 2% risk per trade
    // CONTRACT VALUE
    // BTC/ETH on MEXC: 1 contract = 0.0001 of the asset
    contractValue: 0.0001,
    // SWING DETECTION
    swingLength: 10,
    // STOP LOSS SETTINGS
    slDistance: 50, // $50 buffer from swing point
    // MOVING AVERAGES
    fastMAPeriod: 10,
    slowMAPeriod: 30,
    // RISK MANAGEMENT
    riskRewardRatio: 2.0,
    // STRATEGY OPTIONS
    allowTrendContinuation: false,
    exitOnZoneChange: true,
    // DATA SOURCE
    dataSource: "mexc",
};
// ============================================================================
// GOLD CONFIGURATION (Twelve Data)
// ============================================================================
const goldBaseConfig = {
    // API credentials not needed for Twelve Data (uses TWELVEDATA_API_KEY env var)
    apiKey: "",
    apiSecret: "",
    // PAPER TRADING MODE (Gold is paper-only for now)
    paperTrading: true,
    initialBalance: 10000,
    // POSITION SIZING (Risk-based) - Lower risk for gold
    bankrollUsd: 10000,
    riskPercent: 0.01, // 1% risk per trade (lower than crypto)
    // CONTRACT VALUE
    // Gold: 1 contract = 1 oz
    contractValue: 1,
    // SWING DETECTION - Longer for gold's slower moves
    swingLength: 15,
    // STOP LOSS SETTINGS
    slDistance: 3, // $3 buffer from swing point (gold ~$2600)
    // MOVING AVERAGES - Longer periods for gold
    fastMAPeriod: 12,
    slowMAPeriod: 50,
    // RISK MANAGEMENT
    riskRewardRatio: 2.0,
    // STRATEGY OPTIONS
    allowTrendContinuation: false,
    exitOnZoneChange: true,
    // DATA SOURCE
    dataSource: "twelvedata",
};
const sessions = [
    // Crypto sessions (MEXC)
    { name: "BTC 15m", symbol: "BTC_USDT", timeframe: "Min15", leverage: 40, baseConfig: cryptoBaseConfig },
    { name: "BTC 5m", symbol: "BTC_USDT", timeframe: "Min5", leverage: 40, baseConfig: cryptoBaseConfig },
    { name: "ETH 5m", symbol: "ETH_USDT", timeframe: "Min5", leverage: 20, baseConfig: cryptoBaseConfig },
    { name: "ETH 15m", symbol: "ETH_USDT", timeframe: "Min15", leverage: 20, baseConfig: cryptoBaseConfig },
    { name: "SOL 5m", symbol: "SOL_USDT", timeframe: "Min5", leverage: 20, baseConfig: cryptoBaseConfig },
    { name: "SOL 15m", symbol: "SOL_USDT", timeframe: "Min15", leverage: 20, baseConfig: cryptoBaseConfig },
    // Gold sessions (Twelve Data) - DISABLED: Need valid Twelve Data API key
    // { name: "Gold 15m", symbol: "XAU/USD", timeframe: "Min15", leverage: 10, baseConfig: goldBaseConfig },
    // { name: "Gold 5m", symbol: "XAU/USD", timeframe: "Min5", leverage: 10, baseConfig: goldBaseConfig },
];
// ============================================================================
// MAIN
// ============================================================================
async function main() {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║            TREND STRATEGY BOT - MULTI ASSET SESSION            ║
║                                                                ║
║  Strategy: ICT Premium/Discount Zones + MA Crossover           ║
║                                                                ║
║  Sessions:                                                     ║
║    1. BTC_USDT 15m @ 40x (MEXC)                                ║
║    2. BTC_USDT 5m  @ 40x (MEXC)                                ║
║    3. ETH_USDT 5m  @ 20x (MEXC)                                ║
║    4. ETH_USDT 15m @ 20x (MEXC)                                ║
║    5. XAU/USD  15m @ 10x (Twelve Data)                         ║
║    6. XAU/USD  5m  @ 10x (Twelve Data)                         ║
╚════════════════════════════════════════════════════════════════╝
  `);
    // Test database connection
    const dbConnected = await (0, db_1.testConnection)();
    if (!dbConnected) {
        console.error("⚠️  Database connection failed - running without persistence");
        console.error("   Set DATABASE_URL in .env to enable data persistence\n");
    }
    // Check if any session requires live trading
    const hasLiveSession = sessions.some(s => !s.baseConfig.paperTrading);
    if (hasLiveSession) {
        const hasMexcCreds = cryptoBaseConfig.apiKey && cryptoBaseConfig.apiSecret;
        if (!hasMexcCreds) {
            console.error("ERROR: Set MEXC_API_KEY and MEXC_API_SECRET for live crypto trading");
            process.exit(1);
        }
    }
    // Check for Twelve Data API key if gold session is enabled
    const hasGoldSession = sessions.some(s => s.baseConfig.dataSource === "twelvedata");
    if (hasGoldSession && !process.env.TWELVEDATA_API_KEY) {
        console.error("⚠️  TWELVEDATA_API_KEY not set - Gold session will fail");
        console.error("   Get a free API key at https://twelvedata.com\n");
    }
    console.log("📝 PAPER TRADING MODE ENABLED - No real money at risk\n");
    // Create all bots with database sessions
    const bots = [];
    for (const session of sessions) {
        const config = {
            ...session.baseConfig,
            name: session.name,
            symbol: session.symbol,
            timeframe: session.timeframe,
            leverage: session.leverage,
        };
        // Create database session if connected
        let sessionId = null;
        if (dbConnected) {
            try {
                const dbSession = await (0, db_1.createSession)({
                    config,
                    name: session.name,
                    description: `Paper trading session for ${session.symbol} ${session.timeframe}`,
                });
                sessionId = dbSession.id;
            }
            catch (error) {
                console.error(`Failed to create DB session for ${session.name}:`, error);
            }
        }
        bots.push({
            name: session.name,
            bot: new bot_1.TrendStrategyBot(config, sessionId),
            config,
            sessionId,
        });
    }
    // Print session configs
    console.log("Sessions:");
    bots.forEach(({ name, config, sessionId }) => {
        const dbStatus = sessionId ? `(DB: ${sessionId.slice(0, 8)}...)` : "(no DB)";
        console.log(`  [${name}] ${config.symbol} ${config.timeframe} @ ${config.leverage}x ${dbStatus}`);
    });
    console.log("");
    // Periodic snapshot interval (every 5 minutes)
    let snapshotInterval = null;
    try {
        // Initialize all bots in parallel (with retry logic)
        console.log("[Main] Initializing all sessions...\n");
        const initResults = await Promise.allSettled(bots.map(async ({ name, bot }) => {
            const maxRetries = 3;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    await bot.initialize();
                    console.log(`[${name}] ✓ Initialized`);
                    return { name, success: true };
                }
                catch (error) {
                    if (attempt < maxRetries) {
                        console.log(`[${name}] ⚠ Init attempt ${attempt} failed, retrying in 5s...`);
                        await new Promise(r => setTimeout(r, 5000));
                    }
                    else {
                        console.error(`[${name}] ✗ Failed to initialize after ${maxRetries} attempts:`, error);
                        return { name, success: false };
                    }
                }
            }
            return { name, success: false };
        }));
        // Filter to only successfully initialized bots
        const successfulBots = bots.filter((_, i) => {
            const result = initResults[i];
            return result.status === 'fulfilled' && result.value.success;
        });
        if (successfulBots.length === 0) {
            throw new Error("No bots initialized successfully");
        }
        console.log(`\n[Main] ${successfulBots.length}/${bots.length} sessions initialized. Starting...\n`);
        // Start only successfully initialized bots
        await Promise.all(successfulBots.map(async ({ name, bot }) => {
            try {
                await bot.start();
            }
            catch (error) {
                console.error(`[${name}] Error during start:`, error);
            }
        }));
        // Update bots array to only include successful ones for the rest of the lifecycle
        bots.length = 0;
        bots.push(...successfulBots);
        console.log("[Main] All sessions running... Press Ctrl+C to stop\n");
        // Send deployment summary to Discord
        const summaryData = bots.map(({ name, bot }) => {
            const stats = bot.getPaperStats();
            const trades = bot.getTrades();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayTrades = trades.filter(t => t.exitTime && new Date(t.exitTime) >= today);
            const todayPnl = todayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
            const todayWins = todayTrades.filter(t => (t.pnl ?? 0) > 0).length;
            const todayLosses = todayTrades.filter(t => (t.pnl ?? 0) < 0).length;
            return {
                name,
                balance: stats.balance,
                initialBalance: stats.startingBalance,
                todayPnl,
                wins: todayWins,
                losses: todayLosses,
            };
        });
        await (0, discord_1.notifyDailySummary)(summaryData);
        console.log("[Main] 📊 Deployment summary sent to Discord");
        // Start periodic snapshots
        if (dbConnected) {
            snapshotInterval = setInterval(async () => {
                for (const { name, sessionId, bot } of bots) {
                    if (sessionId) {
                        try {
                            const stats = bot.getPaperStats();
                            await (0, db_1.updateSessionBalance)(sessionId, stats.balance);
                            await (0, db_1.createSessionSnapshot)(sessionId);
                            console.log(`[${name}] 📸 Snapshot saved`);
                        }
                        catch (error) {
                            console.error(`[${name}] Failed to save snapshot:`, error);
                        }
                    }
                }
            }, 5 * 60 * 1000); // Every 5 minutes
        }
        // Schedule daily summary at 9am Bangkok time (UTC+7)
        const scheduleDailySummary = () => {
            const now = new Date();
            const bangkokOffset = 7 * 60; // UTC+7 in minutes
            const utcNow = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
            const bangkokNow = new Date(utcNow + bangkokOffset * 60 * 1000);
            // Calculate next 9am Bangkok time
            const next9am = new Date(bangkokNow);
            next9am.setHours(9, 0, 0, 0);
            if (bangkokNow.getHours() >= 9) {
                next9am.setDate(next9am.getDate() + 1);
            }
            // Convert back to local time for setTimeout
            const next9amUtc = next9am.getTime() - bangkokOffset * 60 * 1000;
            const msUntil9am = next9amUtc - utcNow;
            console.log(`[Main] Daily summary scheduled for 9am BKK (in ${Math.round(msUntil9am / 1000 / 60)} minutes)`);
            setTimeout(async () => {
                try {
                    const summaryData = bots.map(({ name, bot }) => {
                        const stats = bot.getPaperStats();
                        const trades = bot.getTrades();
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const todayTrades = trades.filter(t => t.exitTime && new Date(t.exitTime) >= today);
                        const todayPnl = todayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
                        const todayWins = todayTrades.filter(t => (t.pnl ?? 0) > 0).length;
                        const todayLosses = todayTrades.filter(t => (t.pnl ?? 0) < 0).length;
                        return {
                            name,
                            balance: stats.balance,
                            initialBalance: stats.startingBalance,
                            todayPnl,
                            wins: todayWins,
                            losses: todayLosses,
                        };
                    });
                    await (0, discord_1.notifyDailySummary)(summaryData);
                    console.log("[Main] 📊 Daily summary sent to Discord");
                }
                catch (error) {
                    console.error("[Main] Failed to send daily summary:", error);
                }
                // Schedule next day
                scheduleDailySummary();
            }, msUntil9am);
        };
        scheduleDailySummary();
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
                    console.log(`  Starting Balance: $${stats.startingBalance.toFixed(2)}`);
                    console.log(`  Final Balance:    $${stats.balance.toFixed(2)}`);
                    console.log(`  Total P&L:        ${stats.totalPnl >= 0 ? "+" : ""}$${stats.totalPnl.toFixed(2)}`);
                    console.log(`  Return:           ${(((stats.balance - stats.startingBalance) / stats.startingBalance) * 100).toFixed(2)}%`);
                    console.log(`  Total Trades:     ${trades.length}`);
                    console.log(`  Wins:             ${stats.winCount}`);
                    console.log(`  Losses:           ${stats.lossCount}`);
                    console.log(`  Win Rate:         ${trades.length > 0 ? ((stats.winCount / trades.length) * 100).toFixed(1) : 0}%`);
                    // Save current state to database (session stays ACTIVE for next restart)
                    if (sessionId) {
                        try {
                            await (0, db_1.updateSessionBalance)(sessionId, stats.balance);
                            await (0, db_1.createSessionSnapshot)(sessionId);
                            console.log(`  Database:         Session saved ✓`);
                        }
                        catch (error) {
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
                await (0, db_1.disconnectPrisma)();
                console.log("[Main] Database connection closed");
            }
            process.exit(0);
        });
    }
    catch (error) {
        console.error("[Main] Fatal error:", error);
        if (dbConnected) {
            await (0, db_1.disconnectPrisma)();
        }
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map