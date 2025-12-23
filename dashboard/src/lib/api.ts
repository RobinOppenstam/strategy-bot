import axios from 'axios';

// Use environment variable for API URL, fallback to relative path for Vercel or localhost for dev
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
});

export interface Session {
    id: string;
    name: string;
    symbol: string;
    timeframe: string;
    leverage: number;
    initialBalance: number;
    currentBalance: number;
    totalPnl: number;
    winRate: number;
    maxDrawdown: number;
    totalTrades: number;
    wins: number;
    losses: number;
    openTrades: number;
}

export interface Trade {
    id: string;
    side: 'LONG' | 'SHORT';
    entryPrice: string;
    exitPrice?: string;
    stopLoss: string;
    takeProfit: string;
    size: string;
    pnlUsd?: string;
    pnlPercent?: string;
    entryTime: string;
    exitTime?: string;
    status: string;
    session: {
        name: string;
        symbol: string;
    };
}

export interface Stats {
    equityCurve: {
        time: string;
        pnl: number;
        sessionName: string;
        sessionId: string;
        [key: string]: string | number; // Dynamic session cumulative values
    }[];
    totalTrades: number;
    totalPnl: number;
    sessionNames: string[];
}

export const getSessions = () => api.get<Session[]>('/sessions').then(res => res.data);
export const getStats = () => api.get<Stats>('/stats').then(res => res.data);
export const getOpenPositions = () => api.get<Trade[]>('/trades/open').then(res => res.data);
export const getTradeHistory = (limit = 50, offset = 0) => api.get<Trade[]>('/trades/history', { params: { limit, offset } }).then(res => res.data);

// ===========================================================================
// BACKTEST TYPES
// ===========================================================================

export interface DataAvailability {
    symbol: string;
    timeframe: string;
    candleCount: number;
    earliestCandle: string;
    latestCandle: string;
}

export interface BacktestSummary {
    id: string;
    name: string;
    description?: string;
    symbol: string;
    timeframe: string;
    startDate: string;
    endDate: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    progress: number;
    totalTrades?: number;
    winRate?: number;
    totalPnl?: number;
    finalBalance?: number;
    maxDrawdown?: number;
    maxDrawdownPct?: number;
    profitFactor?: number;
    sharpeRatio?: number;
    executionTimeMs?: number;
    createdAt: string;
}

export interface BacktestTrade {
    id: string;
    tradeNumber: number;
    side: 'LONG' | 'SHORT';
    entryPrice: string;
    entryTime: string;
    entryZone?: string;
    entryReason?: string;
    exitPrice: string;
    exitTime: string;
    exitZone?: string;
    exitReason: string;
    size: string;
    sizeUsd: string;
    stopLoss: string;
    takeProfit: string;
    pnlUsd: string;
    pnlPercent: string;
    rMultiple: string;
    runningBalance: string;
    runningPnl: string;
    drawdown: string;
}

export interface EquityPoint {
    timestamp: number;
    balance: number;
    drawdown: number;
    drawdownPercent: number;
}

export interface BacktestDetail extends BacktestSummary {
    bankrollUsd: string;
    riskPercent: string;
    leverage: number;
    riskRewardRatio: string;
    swingLength: number;
    slDistance: string;
    fastMAPeriod: number;
    slowMAPeriod: number;
    allowTrendContinuation: boolean;
    exitOnZoneChange: boolean;
    contractValue: string;
    winCount?: number;
    lossCount?: number;
    avgRMultiple?: number;
    equityCurve?: EquityPoint[];
    candlesProcessed?: number;
    trades: BacktestTrade[];
}

export interface CreateBacktestInput {
    name: string;
    description?: string;
    symbol: string;
    timeframe: string;
    startDate: string;
    endDate: string;
    bankrollUsd?: number;
    riskPercent?: number;
    leverage?: number;
    riskRewardRatio?: number;
    swingLength?: number;
    slDistance?: number;
    fastMAPeriod?: number;
    slowMAPeriod?: number;
    allowTrendContinuation?: boolean;
    exitOnZoneChange?: boolean;
    contractValue?: number;
}

// ===========================================================================
// BACKTEST API
// ===========================================================================

export const getDataAvailability = () =>
    api.get<DataAvailability[]>('/data/availability').then(res => res.data);

export const getBacktests = () =>
    api.get<BacktestSummary[]>('/backtests').then(res => res.data);

export const getBacktest = (id: string) =>
    api.get<BacktestDetail>(`/backtests/${id}`).then(res => res.data);

export const getBacktestStatus = (id: string) =>
    api.get<{ id: string; status: string; progress: number; errorMessage?: string }>(`/backtests/${id}/status`).then(res => res.data);

export const createBacktest = (input: CreateBacktestInput) =>
    api.post<{ id: string; message: string }>('/backtests', input).then(res => res.data);

export const deleteBacktest = (id: string) =>
    api.delete(`/backtests/${id}`).then(res => res.data);
