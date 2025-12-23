/**
 * Backtest Types
 */

export interface BacktestConfig {
  name: string;
  description?: string;

  // Data range
  symbol: string;
  timeframe: string;
  startDate: Date;
  endDate: Date;

  // Strategy parameters
  bankrollUsd: number;
  riskPercent: number;
  leverage: number;
  riskRewardRatio: number;
  swingLength: number;
  slDistance: number;
  fastMAPeriod: number;
  slowMAPeriod: number;
  allowTrendContinuation: boolean;
  exitOnZoneChange: boolean;
  contractValue: number;
}

export interface BacktestTradeResult {
  tradeNumber: number;
  side: "long" | "short";
  entryPrice: number;
  entryTime: Date;
  entryZone: "premium" | "discount" | "equilibrium";
  entryReason: string;
  exitPrice: number;
  exitTime: Date;
  exitZone: "premium" | "discount" | "equilibrium";
  exitReason: string;
  size: number;
  sizeUsd: number;
  stopLoss: number;
  takeProfit: number;
  pnlUsd: number;
  pnlPercent: number;
  rMultiple: number;
  runningBalance: number;
  runningPnl: number;
  drawdown: number;
  fastMAAtEntry: number;
  slowMAAtEntry: number;
  atrAtEntry: number;
}

export interface EquityPoint {
  timestamp: number;
  balance: number;
  drawdown: number;
  drawdownPercent: number;
}

export interface BacktestResult {
  id?: string;
  config: BacktestConfig;
  status: "completed" | "failed";
  errorMessage?: string;

  // Performance metrics
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  totalPnl: number;
  finalBalance: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  profitFactor: number;
  sharpeRatio: number;
  avgRMultiple: number;

  // Detailed data
  trades: BacktestTradeResult[];
  equityCurve: EquityPoint[];

  // Execution info
  executionTimeMs: number;
  candlesProcessed: number;
}

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

export interface Position {
  side: "long" | "short";
  size: number;
  sizeUsd: number;
  entryPrice: number;
  entryTime: Date;
  stopLoss: number;
  takeProfit: number;
  entryZone: "premium" | "discount" | "equilibrium";
  entryReason: string;
  fastMAAtEntry: number;
  slowMAAtEntry: number;
  atrAtEntry: number;
}

export type ZoneType = "premium" | "discount" | "equilibrium";
