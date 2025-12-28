"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const hyperliquid_client_1 = require("./hyperliquid-client");
/**
 * Test script for Hyperliquid API connection and trading
 */
async function testHyperliquid() {
    const walletAddress = process.env.HYPERLIQUID_WALLET_ADDRESS || "";
    const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY || "";
    const symbol = process.env.SYMBOL || "BTC";
    const leverage = parseInt(process.env.LEVERAGE || "20", 10);
    console.log("=".repeat(60));
    console.log("         HYPERLIQUID API TEST");
    console.log("=".repeat(60));
    if (!walletAddress) {
        console.log("\n⚠️  No wallet address provided.");
        console.log("   Set HYPERLIQUID_WALLET_ADDRESS in .env\n");
        console.log("   Testing PUBLIC endpoints only...\n");
    }
    const client = new hyperliquid_client_1.HyperliquidClient(privateKey, walletAddress);
    // 1. Test public endpoints - Get BTC price
    console.log("\n=== 1. Market Data (Public) ===");
    try {
        const ticker = await client.getTicker(symbol);
        console.log(`${symbol} Price: $${parseFloat(ticker.lastPrice).toFixed(2)}`);
    }
    catch (error) {
        console.error("Ticker error:", error.message);
    }
    // 2. Get candles
    console.log("\n=== 2. Candle Data (Public) ===");
    try {
        const candles = await client.getCandles(symbol, "Min5", 5);
        console.log(`Fetched ${candles.length} candles:`);
        candles.slice(-3).forEach((c) => {
            const time = new Date(c.time * 1000).toISOString().slice(11, 16);
            console.log(`  ${time} - O:${parseFloat(c.open).toFixed(2)} H:${parseFloat(c.high).toFixed(2)} L:${parseFloat(c.low).toFixed(2)} C:${parseFloat(c.close).toFixed(2)}`);
        });
    }
    catch (error) {
        console.error("Candles error:", error.message);
    }
    // 3. Get asset metadata
    console.log("\n=== 3. Asset Metadata (Public) ===");
    try {
        const meta = await client.getAssetMeta(symbol);
        if (meta) {
            console.log(`Asset: ${meta.name}`);
            console.log(`Asset ID: ${meta.assetId}`);
            console.log(`Size Decimals: ${meta.szDecimals}`);
        }
        else {
            console.log(`Asset ${symbol} not found in metadata`);
        }
    }
    catch (error) {
        console.error("Metadata error:", error.message);
    }
    // If no wallet address, stop here
    if (!walletAddress) {
        console.log("\n" + "=".repeat(60));
        console.log("PUBLIC TESTS COMPLETE");
        console.log("=".repeat(60));
        console.log("\nTo test authenticated endpoints, set:");
        console.log("  HYPERLIQUID_WALLET_ADDRESS=0x...");
        console.log("  HYPERLIQUID_PRIVATE_KEY=...");
        return;
    }
    // 4. Get account info (requires wallet address)
    console.log("\n=== 4. Account Info ===");
    try {
        const account = await client.getAccountInfo();
        console.log("Account balances:");
        account.forEach((a) => {
            console.log(`  ${a.currency}: $${parseFloat(a.availableBalance).toFixed(2)}`);
        });
    }
    catch (error) {
        console.error("Account error:", error.message);
    }
    // 5. Get positions
    console.log("\n=== 5. Open Positions ===");
    try {
        const positions = await client.getPositions();
        if (positions.length === 0) {
            console.log("No open positions");
        }
        else {
            positions.forEach((p) => {
                console.log(`  ${p.symbol}: ${p.positionType === 1 ? "LONG" : "SHORT"} ${p.holdVol} @ $${parseFloat(p.openAvgPrice).toFixed(2)}`);
            });
        }
    }
    catch (error) {
        console.error("Positions error:", error.message);
    }
    // 6. Set leverage (requires private key)
    if (privateKey) {
        console.log(`\n=== 6. Setting Leverage (${leverage}x) ===`);
        try {
            await client.setLeverage(symbol, leverage);
            console.log(`Leverage set to ${leverage}x for ${symbol}`);
        }
        catch (error) {
            console.error("Leverage error:", error.message);
        }
    }
    // 7. Test order placement (optional - commented out by default)
    /*
    if (privateKey) {
      console.log("\n=== 7. Test Order (SMALL SIZE) ===");
      try {
        // Get current price
        const ticker = await client.getTicker(symbol);
        const price = parseFloat(ticker.lastPrice);
  
        // Calculate a very small position (0.001 BTC ~ $95 at current prices)
        const size = 0.001;
        const stopLoss = price * 0.99; // 1% below
        const takeProfit = price * 1.02; // 2% above
  
        console.log(`Placing test LONG order:`);
        console.log(`  Size: ${size} BTC`);
        console.log(`  Entry: ~$${price.toFixed(2)}`);
        console.log(`  SL: $${stopLoss.toFixed(2)}`);
        console.log(`  TP: $${takeProfit.toFixed(2)}`);
  
        const result = await client.placeMarketOrder(
          symbol,
          "long",
          size,
          leverage,
          stopLoss,
          takeProfit
        );
  
        console.log("\nOrder result:", JSON.stringify(result, null, 2));
      } catch (error: any) {
        console.error("Order error:", error.message);
      }
    }
    */
    console.log("\n" + "=".repeat(60));
    console.log("HYPERLIQUID TESTS COMPLETE");
    console.log("=".repeat(60));
    console.log("\nTo place a test trade, uncomment section 7 in the test script.");
}
testHyperliquid().catch(console.error);
//# sourceMappingURL=test-hyperliquid.js.map