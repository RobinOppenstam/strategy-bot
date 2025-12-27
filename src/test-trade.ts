import "dotenv/config";
import { MexcClient } from "./mexc-client";

/**
 * Test script to place a small $1 long position on BTC_USDT
 * Run with: npx ts-node --transpile-only src/test-trade.ts
 */

async function testTrade() {
  const apiKey = process.env.MEXC_API_KEY || "";
  const apiSecret = process.env.MEXC_API_SECRET || "";
  const symbol = process.env.MEXC_SYMBOL || "BTC_USDT";

  if (!apiKey || !apiSecret) {
    console.error("❌ Missing MEXC_API_KEY or MEXC_API_SECRET");
    process.exit(1);
  }

  const client = new MexcClient(apiKey, apiSecret);

  console.log("🔗 Connecting to MEXC...");

  // 1. Get account info
  try {
    const account = await client.getAccountInfo();
    console.log("\n✅ Account connected");
    if (Array.isArray(account)) {
      const usdt = account.find((a: any) => a.currency === "USDT");
      if (usdt) {
        console.log(`💰 USDT Available: $${parseFloat(usdt.availableBalance || 0).toFixed(2)}`);
      }
    }
  } catch (error) {
    console.error("❌ Account error:", error);
    process.exit(1);
  }

  // 2. Get current BTC price
  let currentPrice: number;
  try {
    const candles = await client.getCandles(symbol, "Min5", 1);
    currentPrice = parseFloat(candles[0].close);
    console.log(`\n📈 ${symbol} Current Price: $${currentPrice.toFixed(2)}`);
  } catch (error) {
    console.error("❌ Failed to get price:", error);
    process.exit(1);
  }

  // 3. Calculate position size for ~$1 value
  // BTC contract = 0.0001 BTC per contract
  // $1 / price = BTC amount, / 0.0001 = contracts
  const contractValue = 0.0001; // 0.0001 BTC per contract
  const targetUsd = 1;
  const contracts = Math.ceil(targetUsd / (currentPrice * contractValue));
  const actualValue = contracts * contractValue * currentPrice;

  console.log(`\n📝 Test Order Details:`);
  console.log(`   Symbol: ${symbol}`);
  console.log(`   Side: LONG (open)`);
  console.log(`   Type: MARKET`);
  console.log(`   Contracts: ${contracts}`);
  console.log(`   Value: ~$${actualValue.toFixed(2)}`);

  // 4. Place test order
  console.log(`\n🚀 Placing test order...`);
  try {
    const response = await client.placeOrder({
      symbol,
      side: 1, // 1 = open long
      type: 5, // 5 = market
      vol: contracts,
      openType: 1, // 1 = isolated
    });

    console.log(`\n✅ Order Response:`);
    console.log(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error(`\n❌ Order Failed:`, error.message || error);

    // Log full error for debugging
    console.log("\nFull error:", error);
  }

  // 5. Check positions
  console.log(`\n📊 Checking positions...`);
  try {
    const positions = await client.getPositions(symbol);
    if (positions && positions.length > 0) {
      console.log(`Found ${positions.length} position(s):`);
      positions.forEach((pos: any) => {
        console.log(`   ${pos.positionType === 1 ? 'LONG' : 'SHORT'} ${pos.holdVol} contracts @ $${parseFloat(pos.openAvgPrice).toFixed(2)}`);
      });
    } else {
      console.log("No open positions");
    }
  } catch (error) {
    console.error("Failed to get positions:", error);
  }
}

testTrade().catch(console.error);
