export interface Config {
    name?: string;
    apiKey: string;
    apiSecret: string;
    paperTrading: boolean;
    initialBalance: number;
    symbol: string;
    timeframe: string;
    bankrollUsd: number;
    riskPercent: number;
    leverage: number;
    contractValue: number;
    swingLength: number;
    slDistance: number;
    fastMAPeriod: number;
    slowMAPeriod: number;
    riskRewardRatio: number;
    allowTrendContinuation: boolean;
    exitOnZoneChange: boolean;
    dataSource?: "hyperliquid" | "twelvedata";
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
export type ZoneType = "premium" | "discount" | "equilibrium";
export interface Position {
    side: "long" | "short";
    size: number;
    entryPrice: number;
    stopLoss: number | null;
    takeProfit: number | null;
}
export interface TradeState {
    position: Position | null;
    pendingOrders: string[];
    lastSwingHigh: SwingPoint | null;
    lastSwingLow: SwingPoint | null;
    rangeHigh: number | null;
    rangeLow: number | null;
}
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
