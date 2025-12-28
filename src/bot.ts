import { HyperliquidClient } from "./hyperliquid-client";
import { TwelveDataClient } from "./twelvedata-client";
import { Indicators } from "./indicators";
import {
  Config,
  Candle,
  Position,
  TradeState,
  SwingPoint,
  ZoneType,
  PaperTradingState,
  PaperTrade,
} from "./types";
import {
  openTrade,
  closeTrade,
  saveCandles,
  getOpenTrade,
  getSession,
  updateSessionBalance,
  OpenTradeInput,
  TradeSignalInput,
} from "./db";
import { notifyTradeOpen, notifyTradeClose } from "./discord";

/**
 * Generic data client interface for fetching candles
 */
export interface DataClient {
  getCandles(symbol: string, timeframe: string, limit: number): Promise<Candle[]>;
}

/**
 * Generic exchange client interface for trading operations
 */
export interface ExchangeClient {
  getAccountInfo(): Promise<any>;
  getPositions(symbol?: string): Promise<any[]>;
  setLeverage(symbol: string, leverage: number, positionType?: number, openType?: number): Promise<any>;
  placeMarketOrder(symbol: string, side: "long" | "short", vol: number, leverage: number, stopLossPrice?: number, takeProfitPrice?: number): Promise<any>;
  closePosition(symbol: string, side: "long" | "short", vol: number): Promise<any>;
  cancelAllOrders(symbol: string): Promise<any>;
}

export class TrendStrategyBot {
  private dataClient: DataClient;
  private exchangeClient: ExchangeClient | null = null;
  private indicators: Indicators;
  private config: Config;
  private state: TradeState;
  private candles: Candle[] = [];
  private pollingInterval: NodeJS.Timeout | null = null;
  private tag: string; // Log prefix for this session

  // Paper trading
  private paperState: PaperTradingState;
  private tradeIdCounter = 0;

  // Database session
  private sessionId: string | null;
  private currentDbTradeId: string | null = null;

  constructor(config: Config, sessionId: string | null = null) {
    this.config = config;
    this.sessionId = sessionId;
    this.indicators = new Indicators();
    this.tag = config.name ? `[${config.name}]` : "[Bot]";
    this.state = {
      position: null,
      pendingOrders: [],
      lastSwingHigh: null,
      lastSwingLow: null,
      rangeHigh: null,
      rangeLow: null,
    };

    // Initialize paper trading state
    this.paperState = {
      balance: config.initialBalance,
      startingBalance: config.initialBalance,
      trades: [],
      totalPnl: 0,
      winCount: 0,
      lossCount: 0,
    };

    // Initialize data client and exchange client based on dataSource
    if (config.dataSource === "twelvedata") {
      const apiKey = process.env.TWELVEDATA_API_KEY;
      if (!apiKey) {
        throw new Error("TWELVEDATA_API_KEY is required for Twelve Data source");
      }
      this.dataClient = new TwelveDataClient(apiKey);
      console.log(`${this.tag} Using Twelve Data API for ${config.symbol}`);
    } else if (config.dataSource === "hyperliquid") {
      // Hyperliquid
      const privateKey = config.apiSecret; // Use apiSecret as private key
      const walletAddress = config.apiKey; // Use apiKey as wallet address
      const hlClient = new HyperliquidClient(privateKey, walletAddress);
      this.exchangeClient = hlClient;
      this.dataClient = {
        getCandles: async (symbol: string, timeframe: string, limit: number): Promise<Candle[]> => {
          const rawCandles = await hlClient.getCandles(symbol, timeframe, limit);
          return rawCandles.map((c: any) => ({
            timestamp: c.time * 1000,
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close),
            volume: parseFloat(c.vol),
          }));
        },
      };
      console.log(`${this.tag} Using Hyperliquid API for ${config.symbol}`);
    } else {
      // Default to Hyperliquid if no dataSource specified
      const privateKey = config.apiSecret;
      const walletAddress = config.apiKey;
      const hlClient = new HyperliquidClient(privateKey, walletAddress);
      this.exchangeClient = hlClient;
      this.dataClient = {
        getCandles: async (symbol: string, timeframe: string, limit: number): Promise<Candle[]> => {
          const rawCandles = await hlClient.getCandles(symbol, timeframe, limit);
          return rawCandles.map((c: any) => ({
            timestamp: c.time * 1000,
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close),
            volume: parseFloat(c.vol),
          }));
        },
      };
      console.log(`${this.tag} Using Hyperliquid API for ${config.symbol}`);
    }
  }

  async initialize(): Promise<void> {
    if (this.config.paperTrading) {
      console.log(`${this.tag} 📝 PAPER TRADING MODE - No real orders will be placed`);

      // Restore state from database if we have a session
      if (this.sessionId) {
        await this.restoreFromDatabase();
      }

      console.log(`${this.tag} Starting balance: $${this.paperState.balance.toFixed(2)}`);
    } else {
      // Live trading requires an exchange client
      if (!this.exchangeClient) {
        throw new Error("Live trading requires an exchange client (Hyperliquid)");
      }
      const exchangeName = "Hyperliquid";
      console.log(`${this.tag} 🔗 Connecting to ${exchangeName}...`);

      // Verify account connection
      try {
        const accountInfo = await this.exchangeClient.getAccountInfo();
        if (accountInfo) {
          console.log(`${this.tag} ✅ ${exchangeName} account connected successfully`);
          // Log available balance if present
          if (Array.isArray(accountInfo)) {
            const stableAsset = accountInfo.find((a: any) =>
              a.currency === "USDT" || a.currency === "USDC"
            );
            if (stableAsset) {
              console.log(`${this.tag} 💰 Balance: $${parseFloat(stableAsset.availableBalance || stableAsset.equity || 0).toFixed(2)}`);
            }
          }
        }
      } catch (error) {
        console.error(`${this.tag} ❌ Failed to connect to ${exchangeName} account:`, error);
        throw new Error(`${exchangeName} account connection failed - check API credentials`);
      }

      // Set leverage
      try {
        await this.exchangeClient.setLeverage(this.config.symbol, this.config.leverage, 1, 1);
        await this.exchangeClient.setLeverage(this.config.symbol, this.config.leverage, 2, 1);
        console.log(`${this.tag} ⚙️  Leverage set to ${this.config.leverage}x for ${this.config.symbol}`);
      } catch (error: any) {
        // Leverage might already be set or not changeable, continue anyway
        console.log(`${this.tag} ⚠️  Leverage setting: ${error.message || error}`);
        console.log(`${this.tag} ℹ️  Continuing with account's current leverage setting`);
      }

      // Check for existing positions
      try {
        const positions = await this.exchangeClient.getPositions(this.config.symbol);
        if (positions && positions.length > 0) {
          console.log(`${this.tag} 📊 Found ${positions.length} existing position(s)`);
          positions.forEach((pos: any) => {
            console.log(`${this.tag}    ${pos.positionType === 1 ? 'LONG' : 'SHORT'} ${pos.holdVol} contracts @ $${parseFloat(pos.openAvgPrice).toFixed(2)}`);
          });
        } else {
          console.log(`${this.tag} 📊 No existing positions for ${this.config.symbol}`);
        }
      } catch (error) {
        console.log(`${this.tag} ⚠️  Could not fetch existing positions`);
      }
    }

    // Load initial candles
    await this.loadHistoricalCandles();

    // Check existing position (only in live mode with exchange client)
    if (!this.config.paperTrading && this.exchangeClient) {
      await this.syncPosition();
    }
  }

  /**
   * Restore paper trading state from database after restart
   */
  private async restoreFromDatabase(): Promise<void> {
    if (!this.sessionId) return;

    try {
      // Restore balance from session
      const session = await getSession(this.sessionId);
      if (session) {
        const currentBalance = Number(session.currentBalance);
        const initialBalance = Number(session.initialBalance);

        if (currentBalance !== initialBalance) {
          this.paperState.balance = currentBalance;
          this.paperState.totalPnl = currentBalance - initialBalance;
          console.log(`${this.tag} 🔄 Restored balance from database: $${currentBalance.toFixed(2)}`);
        }
      }

      // Restore open position
      const openTrade = await getOpenTrade(this.sessionId);
      if (openTrade) {
        const side = openTrade.side === "LONG" ? "long" : "short";
        this.state.position = {
          side,
          size: Number(openTrade.size),
          entryPrice: Number(openTrade.entryPrice),
          stopLoss: Number(openTrade.stopLoss),
          takeProfit: Number(openTrade.takeProfit),
        };
        this.currentDbTradeId = openTrade.id;

        console.log(`${this.tag} 🔄 Restored open position: ${side.toUpperCase()} @ $${Number(openTrade.entryPrice).toFixed(2)}`);
        console.log(`${this.tag}    Size: ${openTrade.size} | SL: $${Number(openTrade.stopLoss).toFixed(2)} | TP: $${Number(openTrade.takeProfit).toFixed(2)}`);
      }
    } catch (error) {
      console.error(`${this.tag} Failed to restore state from database:`, error);
    }
  }

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  private async loadHistoricalCandles(): Promise<void> {
    // Use the generic data client
    const sourceMap: Record<string, string> = {
      twelvedata: "Twelve Data",
      hyperliquid: "Hyperliquid",
    };
    const source = sourceMap[this.config.dataSource || "hyperliquid"] || "Hyperliquid";
    console.log(`${this.tag} 📡 Fetching market data from ${source}...`);

    try {
      this.candles = await this.dataClient.getCandles(
        this.config.symbol,
        this.config.timeframe,
        500
      );
    } catch (error) {
      console.error(`${this.tag} ❌ Failed to fetch market data:`, error);
      throw new Error(`Market data fetch failed - check symbol ${this.config.symbol}`);
    }

    if (this.candles.length === 0) {
      throw new Error(`No candle data received for ${this.config.symbol}`);
    }

    console.log(`${this.tag} ✅ Loaded ${this.candles.length} historical candles`);

    const latest = this.candles[this.candles.length - 1];
    const oldest = this.candles[0];
    console.log(`${this.tag} 📈 ${this.config.symbol} @ $${latest.close.toFixed(2)}`);
    console.log(`${this.tag} 📅 Data range: ${new Date(oldest.timestamp).toISOString().slice(0, 16)} → ${new Date(latest.timestamp).toISOString().slice(0, 16)}`);

    // Verify candle timestamps are recent (within last hour for 5m candles)
    const candleAge = Date.now() - latest.timestamp;
    const maxAge = 60 * 60 * 1000; // 1 hour
    if (candleAge > maxAge) {
      console.log(`${this.tag} ⚠️  Latest candle is ${Math.round(candleAge / 60000)} minutes old`);
    }

    // Save candles to database
    if (this.sessionId && this.candles.length > 0) {
      try {
        const savedCount = await saveCandles(
          this.config.symbol,
          this.config.timeframe,
          this.candles
        );
        console.log(`${this.tag} 💾 Saved ${savedCount} candles to database`);
      } catch (error) {
        console.error(`${this.tag} Failed to save candles:`, error);
      }
    }
  }

  private async syncPosition(): Promise<void> {
    if (!this.exchangeClient) return;
    const positions = await this.exchangeClient.getPositions(this.config.symbol);

    const pos = positions.find(
      (p: any) => parseFloat(p.holdVol) > 0
    );

    if (pos) {
      this.state.position = {
        side: pos.positionType === 1 ? "long" : "short",
        size: parseFloat(pos.holdVol),
        entryPrice: parseFloat(pos.openAvgPrice),
        stopLoss: null,
        takeProfit: null,
      };
      console.log(
        `[Bot] Existing position: ${this.state.position.side} ${this.state.position.size}`
      );
    }
  }

  // ============================================================================
  // MAIN LOOP - POLLING
  // ============================================================================

  async start(): Promise<void> {
    console.log(`${this.tag} Starting polling for ${this.config.symbol} ${this.config.timeframe}`);

    // Initial check
    await this.checkMarket();

    // Poll based on timeframe
    const intervalMs = this.getPollingInterval();
    this.pollingInterval = setInterval(async () => {
      try {
        await this.checkMarket();
      } catch (error) {
        console.error(`[Bot] Polling error:`, error);
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    console.log(`${this.tag} Stopped`);
  }

  private getPollingInterval(): number {
    const map: Record<string, number> = {
      "Min1": 60 * 1000,
      "Min5": 60 * 1000,
      "Min15": 60 * 1000,
      "Min30": 60 * 1000,
      "Min60": 5 * 60 * 1000,
      "Hour4": 5 * 60 * 1000,
      "Day1": 60 * 60 * 1000,
    };
    return map[this.config.timeframe] || 60 * 1000;
  }

  private async checkMarket(): Promise<void> {
    // Fetch latest candles using the generic data client
    const latestCandles = await this.dataClient.getCandles(
      this.config.symbol,
      this.config.timeframe,
      100
    );

    // Check if new candle
    const lastKnown = this.candles[this.candles.length - 1];
    const latestNew = latestCandles[latestCandles.length - 1];

    if (!lastKnown || latestNew.timestamp > lastKnown.timestamp) {
      // Update candles
      this.candles = [...this.candles.slice(-400), ...latestCandles.slice(-100)];
      await this.onNewCandle(latestNew);
    }

    // Sync position state (only in live mode with exchange client)
    if (!this.config.paperTrading && this.exchangeClient) {
      await this.syncPosition();
    }
  }

  async onNewCandle(candle: Candle): Promise<void> {
    console.log(
      `\n[${new Date(candle.timestamp).toISOString()}] Candle: O=${candle.open.toFixed(2)} H=${candle.high.toFixed(2)} L=${candle.low.toFixed(2)} C=${candle.close.toFixed(2)}`
    );

    // Paper trading: Check if TP/SL was hit during this candle
    if (this.config.paperTrading && this.state.position) {
      await this.checkPaperTpSl(candle);
    }

    // 1. Update swing points and zones
    this.updateSwingPoints();
    this.updateZones();

    // 2. Calculate indicators
    const analysis = this.analyzeMarket();

    // 3. Check exits first
    if (this.state.position) {
      await this.checkExits(analysis);
    }

    // 4. Check entries
    if (!this.state.position) {
      await this.checkEntries(analysis);
    }

    // Paper trading: Print status
    if (this.config.paperTrading) {
      this.printPaperStatus();
    }
  }

  /**
   * Check if TP or SL was hit during the candle (paper trading)
   */
  private async checkPaperTpSl(candle: Candle): Promise<void> {
    if (!this.state.position) return;

    const { side, stopLoss, takeProfit, entryPrice, size } = this.state.position;

    let exitPrice: number | null = null;
    let exitReason: "closed_tp" | "closed_sl" | null = null;

    if (side === "long") {
      // Check SL first (worst case)
      if (stopLoss && candle.low <= stopLoss) {
        exitPrice = stopLoss;
        exitReason = "closed_sl";
      }
      // Then check TP
      else if (takeProfit && candle.high >= takeProfit) {
        exitPrice = takeProfit;
        exitReason = "closed_tp";
      }
    } else {
      // Short position
      if (stopLoss && candle.high >= stopLoss) {
        exitPrice = stopLoss;
        exitReason = "closed_sl";
      } else if (takeProfit && candle.low <= takeProfit) {
        exitPrice = takeProfit;
        exitReason = "closed_tp";
      }
    }

    if (exitPrice && exitReason) {
      const pnl = this.calculatePnl(side, entryPrice, exitPrice, size);
      await this.closePaperPosition(exitPrice, pnl, exitReason);
    }
  }

  // ============================================================================
  // SWING POINT DETECTION
  // ============================================================================

  private updateSwingPoints(): void {
    const len = this.config.swingLength;
    if (this.candles.length < len * 2 + 1) return;

    const pivotIndex = this.candles.length - 1 - len;
    const pivotCandle = this.candles[pivotIndex];

    let isSwingHigh = true;
    let isSwingLow = true;

    for (let i = pivotIndex - len; i <= pivotIndex + len; i++) {
      if (i === pivotIndex || i < 0 || i >= this.candles.length) continue;

      if (this.candles[i].high >= pivotCandle.high) isSwingHigh = false;
      if (this.candles[i].low <= pivotCandle.low) isSwingLow = false;
    }

    if (isSwingHigh) {
      this.state.lastSwingHigh = {
        price: pivotCandle.high,
        timestamp: pivotCandle.timestamp,
        index: pivotIndex,
      };
      console.log(`[Swing] New swing HIGH: ${pivotCandle.high}`);
    }

    if (isSwingLow) {
      this.state.lastSwingLow = {
        price: pivotCandle.low,
        timestamp: pivotCandle.timestamp,
        index: pivotIndex,
      };
      console.log(`[Swing] New swing LOW: ${pivotCandle.low}`);
    }
  }

  // ============================================================================
  // PREMIUM / DISCOUNT ZONES
  // ============================================================================

  private updateZones(): void {
    if (!this.state.lastSwingHigh || !this.state.lastSwingLow) return;

    this.state.rangeHigh = this.state.lastSwingHigh.price;
    this.state.rangeLow = this.state.lastSwingLow.price;

    const range = this.state.rangeHigh - this.state.rangeLow;
    const equilibrium = this.state.rangeLow + range * 0.5;
    const currentPrice = this.candles[this.candles.length - 1].close;
    const pricePercent = ((currentPrice - this.state.rangeLow) / range) * 100;

    console.log(`[Zone] Range: ${this.state.rangeLow.toFixed(2)} - ${this.state.rangeHigh.toFixed(2)}`);
    console.log(`[Zone] Equilibrium: ${equilibrium.toFixed(2)} | Price at ${pricePercent.toFixed(1)}%`);
  }

  private getCurrentZone(): ZoneType {
    if (!this.state.rangeHigh || !this.state.rangeLow) return "equilibrium";

    const currentPrice = this.candles[this.candles.length - 1].close;
    const range = this.state.rangeHigh - this.state.rangeLow;
    const equilibrium = this.state.rangeLow + range * 0.5;

    if (currentPrice > equilibrium) return "premium";
    if (currentPrice < equilibrium) return "discount";
    return "equilibrium";
  }

  // ============================================================================
  // MARKET ANALYSIS
  // ============================================================================

  private analyzeMarket() {
    const closes = this.candles.map((c) => c.close);
    const highs = this.candles.map((c) => c.high);
    const lows = this.candles.map((c) => c.low);

    const sma20 = this.indicators.sma(closes, 20);
    const currentClose = closes[closes.length - 1];
    const currentSma = sma20[sma20.length - 1];

    const fastMA = this.indicators.sma(closes, this.config.fastMAPeriod);
    const slowMA = this.indicators.sma(closes, this.config.slowMAPeriod);

    const currentFastMA = fastMA[fastMA.length - 1];
    const currentSlowMA = slowMA[slowMA.length - 1];
    const prevFastMA = fastMA[fastMA.length - 2];
    const prevSlowMA = slowMA[slowMA.length - 2];

    const atr = this.indicators.atr(highs, lows, closes, 14);
    const currentATR = atr[atr.length - 1];

    const zone = this.getCurrentZone();

    const bullishCrossover = prevFastMA <= prevSlowMA && currentFastMA > currentSlowMA;
    const bearishCrossover = prevFastMA >= prevSlowMA && currentFastMA < currentSlowMA;

    const isBullish = currentFastMA > currentSlowMA;
    const isBearish = currentFastMA < currentSlowMA;

    return {
      currentPrice: currentClose,
      fastMA: currentFastMA,
      slowMA: currentSlowMA,
      sma20: currentSma,
      atr: currentATR,
      zone,
      isBullish,
      isBearish,
      bullishCrossover,
      bearishCrossover,
    };
  }

  // ============================================================================
  // ENTRY LOGIC
  // ============================================================================

  private async checkEntries(analysis: ReturnType<typeof this.analyzeMarket>): Promise<void> {
    const { zone, isBullish, isBearish, bullishCrossover, bearishCrossover, atr, currentPrice } = analysis;

    const longCondition =
      zone === "discount" &&
      (bullishCrossover || (isBullish && this.config.allowTrendContinuation));

    const shortCondition =
      zone === "premium" &&
      (bearishCrossover || (isBearish && this.config.allowTrendContinuation));

    if (longCondition) {
      console.log(`[Signal] LONG entry signal!`);
      await this.enterTrade("long", currentPrice, atr);
    } else if (shortCondition) {
      console.log(`[Signal] SHORT entry signal!`);
      await this.enterTrade("short", currentPrice, atr);
    }
  }

  // ============================================================================
  // POSITION SIZING (Risk-based)
  // ============================================================================

  private calculatePositionSize(entryPrice: number, stopLoss: number): number {
    const riskAmount = this.config.bankrollUsd * this.config.riskPercent;
    const slDistancePercent = Math.abs(entryPrice - stopLoss) / entryPrice;

    const positionSizeUsd = riskAmount / slDistancePercent;
    const maxPositionUsd = this.config.bankrollUsd * this.config.leverage;
    const cappedPositionUsd = Math.min(positionSizeUsd, maxPositionUsd);

    // Use contract value from config
    // BTC: 0.0001 (1 contract = 0.0001 BTC)
    // Gold: 1 (1 contract = 1 oz)
    const size = cappedPositionUsd / entryPrice / this.config.contractValue;

    console.log(`[Size] Risk: $${riskAmount.toFixed(2)} | SL Distance: ${(slDistancePercent * 100).toFixed(2)}%`);
    console.log(`[Size] Position: $${cappedPositionUsd.toFixed(2)} | ${Math.floor(size)} contracts`);

    return Math.floor(size);
  }

  // ============================================================================
  // TRADE EXECUTION - ENTRY
  // ============================================================================

  private async enterTrade(
    side: "long" | "short",
    entryPrice: number,
    atr: number
  ): Promise<void> {
    // Calculate stop loss
    let stopLoss: number;
    if (side === "long") {
      stopLoss = this.state.lastSwingLow
        ? this.state.lastSwingLow.price - this.config.slDistance
        : entryPrice - atr * 1.5;
    } else {
      stopLoss = this.state.lastSwingHigh
        ? this.state.lastSwingHigh.price + this.config.slDistance
        : entryPrice + atr * 1.5;
    }

    // Calculate position size based on risk
    const size = this.calculatePositionSize(entryPrice, stopLoss);

    if (size <= 0) {
      console.log(`[Trade] Position size too small, skipping trade`);
      return;
    }

    // Calculate take profit
    const riskAmount = Math.abs(entryPrice - stopLoss);
    const takeProfit =
      side === "long"
        ? entryPrice + riskAmount * this.config.riskRewardRatio
        : entryPrice - riskAmount * this.config.riskRewardRatio;

    const riskUsd = this.config.bankrollUsd * this.config.riskPercent;
    const rewardUsd = riskUsd * this.config.riskRewardRatio;

    console.log(`\n${"=".repeat(50)}`);
    console.log(`  ${this.config.paperTrading ? "📝 PAPER" : "🔴 LIVE"} ENTERING ${side.toUpperCase()}`);
    console.log(`${"=".repeat(50)}`);
    console.log(`  Entry Price:  $${entryPrice.toFixed(2)}`);
    console.log(`  Stop Loss:    $${stopLoss.toFixed(2)} (-$${riskUsd.toFixed(2)})`);
    console.log(`  Take Profit:  $${takeProfit.toFixed(2)} (+$${rewardUsd.toFixed(2)})`);
    console.log(`  Size:         ${size} contracts`);
    console.log(`  R:R:          1:${this.config.riskRewardRatio}`);
    console.log(`${"=".repeat(50)}\n`);

    if (this.config.paperTrading) {
      // Paper trading: Just update state
      this.tradeIdCounter++;
      const trade: PaperTrade = {
        id: this.tradeIdCounter,
        side,
        entryPrice,
        exitPrice: null,
        size,
        stopLoss,
        takeProfit,
        entryTime: new Date(),
        exitTime: null,
        pnl: null,
        status: "open",
      };
      this.paperState.trades.push(trade);

      this.state.position = {
        side,
        size,
        entryPrice,
        stopLoss,
        takeProfit,
      };

      console.log(`[Paper] Trade #${trade.id} opened`);

      // Save to database
      if (this.sessionId) {
        try {
          const analysis = this.analyzeMarket();
          const riskAmount = Math.abs(entryPrice - stopLoss) * size * this.config.contractValue;
          const sizeUsd = size * this.config.contractValue * entryPrice;

          const tradeInput: OpenTradeInput = {
            sessionId: this.sessionId,
            side,
            entryPrice,
            size,
            sizeUsd,
            riskAmount,
            stopLoss,
            takeProfit,
            entryZone: analysis.zone,
            fastMAAtEntry: analysis.fastMA,
            slowMAAtEntry: analysis.slowMA,
            atrAtEntry: analysis.atr,
          };

          const signalInput: TradeSignalInput = {
            isCrossover: analysis.bullishCrossover || analysis.bearishCrossover,
            isContinuation: this.config.allowTrendContinuation && (analysis.isBullish || analysis.isBearish),
            fastMA: analysis.fastMA,
            slowMA: analysis.slowMA,
            atr: analysis.atr,
            zone: analysis.zone,
            rangeHigh: this.state.rangeHigh ?? entryPrice,
            rangeLow: this.state.rangeLow ?? entryPrice,
            equilibrium: ((this.state.rangeHigh ?? entryPrice) + (this.state.rangeLow ?? entryPrice)) / 2,
            swingHighPrice: this.state.lastSwingHigh?.price,
            swingHighTime: this.state.lastSwingHigh
              ? new Date(this.state.lastSwingHigh.timestamp)
              : undefined,
            swingLowPrice: this.state.lastSwingLow?.price,
            swingLowTime: this.state.lastSwingLow
              ? new Date(this.state.lastSwingLow.timestamp)
              : undefined,
          };

          const dbTrade = await openTrade(tradeInput, signalInput);
          this.currentDbTradeId = dbTrade.id;
          console.log(`${this.tag} 💾 Trade saved to database`);

          // Send Discord notification
          await notifyTradeOpen({
            botName: this.config.name ?? this.config.symbol,
            side,
            entryPrice,
            stopLoss,
            takeProfit,
            sizeUsd,
            riskUsd,
            leverage: this.config.leverage,
          });
        } catch (error) {
          console.error(`${this.tag} Failed to save trade:`, error);
        }
      }
    } else {
      // Live trading
      if (!this.exchangeClient) {
        console.error(`[Order] Live trading requires an exchange client`);
        return;
      }
      try {
        const result = await this.exchangeClient.placeMarketOrder(
          this.config.symbol,
          side,
          size,
          this.config.leverage,
          stopLoss,
          takeProfit
        );

        console.log(`[Order] Entry placed:`, result);

        this.state.position = {
          side,
          size,
          entryPrice,
          stopLoss,
          takeProfit,
        };
      } catch (error) {
        console.error(`[Order] Failed to enter trade:`, error);
      }
    }
  }

  // ============================================================================
  // EXIT LOGIC
  // ============================================================================

  private async checkExits(analysis: ReturnType<typeof this.analyzeMarket>): Promise<void> {
    if (!this.state.position) return;

    const { zone, isBullish, isBearish } = analysis;
    const { side } = this.state.position;

    let shouldExit = false;
    let reason = "";

    if (side === "long" && isBearish) {
      shouldExit = true;
      reason = "Trend reversal (bearish)";
    } else if (side === "short" && isBullish) {
      shouldExit = true;
      reason = "Trend reversal (bullish)";
    }

    if (this.config.exitOnZoneChange) {
      if (side === "long" && zone === "premium") {
        shouldExit = true;
        reason = "Reached premium zone";
      } else if (side === "short" && zone === "discount") {
        shouldExit = true;
        reason = "Reached discount zone";
      }
    }

    if (shouldExit) {
      console.log(`\n[Exit Signal] ${reason}`);
      await this.closePosition(reason);
    }
  }

  private async closePosition(reason: string): Promise<void> {
    if (!this.state.position) return;

    const { side, size, entryPrice } = this.state.position;
    const currentPrice = this.candles[this.candles.length - 1].close;
    const pnl = this.calculatePnl(side, entryPrice, currentPrice, size);

    console.log(`\n${"=".repeat(50)}`);
    console.log(`  ${this.config.paperTrading ? "📝 PAPER" : "🔴 LIVE"} CLOSING ${side.toUpperCase()}`);
    console.log(`${"=".repeat(50)}`);
    console.log(`  Reason:       ${reason}`);
    console.log(`  Entry:        $${entryPrice.toFixed(2)}`);
    console.log(`  Exit:         $${currentPrice.toFixed(2)}`);
    console.log(`  P&L:          ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`);
    console.log(`${"=".repeat(50)}\n`);

    if (this.config.paperTrading) {
      await this.closePaperPosition(currentPrice, pnl, "closed_signal");
    } else {
      // Live trading
      if (!this.exchangeClient) {
        console.error(`[Order] Live trading requires an exchange client`);
        return;
      }
      try {
        await this.exchangeClient.cancelAllOrders(this.config.symbol);
        await this.exchangeClient.closePosition(this.config.symbol, side, size);
        console.log(`[Order] Position closed`);
        this.state.position = null;
      } catch (error) {
        console.error(`[Order] Failed to close position:`, error);
      }
    }
  }

  /**
   * Close paper trading position
   */
  private async closePaperPosition(
    exitPrice: number,
    pnl: number,
    status: "closed_tp" | "closed_sl" | "closed_signal"
  ): Promise<void> {
    // Update paper state
    this.paperState.balance += pnl;
    this.paperState.totalPnl += pnl;

    if (pnl >= 0) {
      this.paperState.winCount++;
    } else {
      this.paperState.lossCount++;
    }

    // Update the trade record
    const openTradeRecord = this.paperState.trades.find((t) => t.status === "open");
    if (openTradeRecord) {
      openTradeRecord.exitPrice = exitPrice;
      openTradeRecord.exitTime = new Date();
      openTradeRecord.pnl = pnl;
      openTradeRecord.status = status;
    }

    const emoji = status === "closed_tp" ? "🎯" : status === "closed_sl" ? "🛑" : "📊";
    console.log(`[Paper] ${emoji} Trade closed: ${status.replace("closed_", "").toUpperCase()}`);
    console.log(`[Paper] P&L: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`);

    // Save to database
    if (this.sessionId && this.currentDbTradeId) {
      try {
        const analysis = this.analyzeMarket();
        await closeTrade({
          tradeId: this.currentDbTradeId,
          exitPrice,
          exitZone: analysis.zone,
          exitReason: status.replace("closed_", "").toUpperCase(),
          status,
        });

        // Update session balance in database for persistence
        await updateSessionBalance(this.sessionId, this.paperState.balance);

        console.log(`${this.tag} 💾 Trade closure saved to database`);
        this.currentDbTradeId = null;

        // Send Discord notification
        if (openTradeRecord && this.state.position) {
          const sizeUsd = openTradeRecord.size * this.config.contractValue * openTradeRecord.entryPrice;
          const pnlPercent = sizeUsd > 0 ? (pnl / sizeUsd) * 100 : 0;
          await notifyTradeClose({
            botName: this.config.name ?? this.config.symbol,
            side: this.state.position.side,
            entryPrice: openTradeRecord.entryPrice,
            exitPrice,
            pnl,
            pnlPercent,
            status,
            balance: this.paperState.balance,
          });
        }
      } catch (error) {
        console.error(`${this.tag} Failed to save trade closure:`, error);
      }
    }

    this.state.position = null;
  }

  /**
   * Calculate P&L for a trade
   */
  private calculatePnl(
    side: "long" | "short",
    entryPrice: number,
    exitPrice: number,
    size: number
  ): number {
    // Size is in contracts, use contract value from config
    // BTC: 0.0001 (1 contract = 0.0001 BTC)
    // Gold: 1 (1 contract = 1 oz)
    const assetSize = size * this.config.contractValue;

    if (side === "long") {
      return (exitPrice - entryPrice) * assetSize;
    } else {
      return (entryPrice - exitPrice) * assetSize;
    }
  }

  /**
   * Print paper trading status
   */
  private printPaperStatus(): void {
    const winRate = this.paperState.winCount + this.paperState.lossCount > 0
      ? (this.paperState.winCount / (this.paperState.winCount + this.paperState.lossCount) * 100).toFixed(1)
      : "0.0";

    const returnPct = ((this.paperState.balance - this.paperState.startingBalance) / this.paperState.startingBalance * 100).toFixed(2);

    console.log(`\n┌─────────────────────────────────────────┐`);
    console.log(`│          📊 PAPER TRADING STATUS        │`);
    console.log(`├─────────────────────────────────────────┤`);
    console.log(`│  Balance:     $${this.paperState.balance.toFixed(2).padStart(10)}            │`);
    console.log(`│  Total P&L:   ${(this.paperState.totalPnl >= 0 ? "+" : "") + "$" + this.paperState.totalPnl.toFixed(2).padStart(9)}            │`);
    console.log(`│  Return:      ${returnPct.padStart(10)}%           │`);
    console.log(`│  Wins/Losses: ${String(this.paperState.winCount).padStart(4)}/${String(this.paperState.lossCount).padEnd(4)}               │`);
    console.log(`│  Win Rate:    ${winRate.padStart(10)}%           │`);
    console.log(`│  Position:    ${this.state.position ? this.state.position.side.toUpperCase().padStart(10) : "      FLAT"}            │`);
    console.log(`└─────────────────────────────────────────┘\n`);
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getState(): TradeState {
    return { ...this.state };
  }

  getPaperStats(): PaperTradingState {
    return { ...this.paperState };
  }

  getTrades(): PaperTrade[] {
    return [...this.paperState.trades];
  }

  isLiveTrading(): boolean {
    return !this.config.paperTrading;
  }

  /**
   * Get real exchange account balance (for live trading)
   */
  async getRealBalance(): Promise<number> {
    if (!this.exchangeClient) {
      return this.paperState.balance;
    }
    try {
      const accountInfo = await this.exchangeClient.getAccountInfo();
      if (Array.isArray(accountInfo)) {
        // Support USDC (Hyperliquid)
        const stableAsset = accountInfo.find((a: any) =>
          a.currency === "USDC"
        );
        if (stableAsset) {
          return parseFloat(stableAsset.availableBalance || stableAsset.equity || 0);
        }
      }
      return this.paperState.balance;
    } catch (error) {
      console.error(`${this.tag} Failed to get real balance:`, error);
      return this.paperState.balance;
    }
  }
}
