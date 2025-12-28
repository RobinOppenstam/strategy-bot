// ============================================================================
// CONFIGURATION
// ============================================================================

export interface Config {
  // Session name for logs
  name?: string;

  // Connection
  apiKey: string;
  apiSecret: string;

  // Paper trading mode (no real orders)
  paperTrading: boolean;
  initialBalance: number; // Starting balance for paper trading

  // Trading pair
  symbol: string; // e.g., "BTC_USDT" for MEXC futures, "XAU/USD" for gold
  timeframe: string; // "Min1", "Min5", "Min15", "Min30", "Min60", "Hour4", "Day1"

  // Position sizing (risk-based)
  bankrollUsd: number;
  riskPercent: number; // 0.02 = 2%
  leverage: number;

  // Contract value multiplier
  // BTC: 0.0001 (1 contract = 0.0001 BTC)
  // Gold: 1 (1 contract = 1 oz)
  contractValue: number;

  // Swing detection (from Pine Script)
  swingLength: number;

  // Stop loss distance from swing point
  slDistance: number;

  // Moving averages for trend
  fastMAPeriod: number;
  slowMAPeriod: number;

  // Risk management
  riskRewardRatio: number;

  // Strategy options
  allowTrendContinuation: boolean;
  exitOnZoneChange: boolean;

  // Data source
  dataSource?: "hyperliquid" | "twelvedata";
}

// ============================================================================
// MARKET DATA
// ============================================================================

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SwingPoint {
  price: number;
  timestamp: number;
  index: number;
}

// ============================================================================
// ZONES (ICT Concept)
// ============================================================================

export type ZoneType = "premium" | "discount" | "equilibrium";

// ============================================================================
// POSITIONS & ORDERS
// ============================================================================

export interface Position {
  side: "long" | "short";
  size: number;
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
}

export interface TradeState {
  position: Position | null;
  pendingOrders: string[]; // Order IDs
  lastSwingHigh: SwingPoint | null;
  lastSwingLow: SwingPoint | null;
  rangeHigh: number | null;
  rangeLow: number | null;
}

// ============================================================================
// PAPER TRADING
// ============================================================================

export interface PaperTradingState {
  balance: number;
  startingBalance: number;
  trades: PaperTrade[];
  totalPnl: number;
  winCount: number;
  lossCount: number;
}

export interface PaperTrade {
  id: number;
  side: "long" | "short";
  entryPrice: number;
  exitPrice: number | null;
  size: number;
  stopLoss: number;
  takeProfit: number;
  entryTime: Date;
  exitTime: Date | null;
  pnl: number | null;
  status: "open" | "closed_tp" | "closed_sl" | "closed_signal";
}

