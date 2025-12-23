/**
 * Discord Webhook Notification Service
 */
interface TradeOpenPayload {
    botName: string;
    side: "long" | "short";
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    sizeUsd: number;
    riskUsd: number;
    leverage: number;
}
interface TradeClosePayload {
    botName: string;
    side: "long" | "short";
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    pnlPercent: number;
    status: "closed_tp" | "closed_sl" | "closed_signal";
    balance: number;
}
export declare function notifyTradeOpen(trade: TradeOpenPayload): Promise<void>;
export declare function notifyTradeClose(trade: TradeClosePayload): Promise<void>;
export interface DailySummaryBot {
    name: string;
    balance: number;
    initialBalance: number;
    todayPnl: number;
    wins: number;
    losses: number;
}
export declare function notifyDailySummary(bots: DailySummaryBot[]): Promise<void>;
export {};
