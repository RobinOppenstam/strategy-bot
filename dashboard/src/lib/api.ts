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
