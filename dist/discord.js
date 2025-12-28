"use strict";
/**
 * Discord Webhook Notification Service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyTradeOpen = notifyTradeOpen;
exports.notifyTradeClose = notifyTradeClose;
exports.notifyDailySummary = notifyDailySummary;
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;
const MEXC_TRADE_WEBHOOK = process.env.MEXC_TRADE_WEBHOOK;
// Discord embed colors
const COLOR_GREEN = 5763719;
const COLOR_RED = 15548997;
async function sendWebhook(payload, webhookUrl) {
    const url = webhookUrl || WEBHOOK_URL;
    if (!url) {
        return;
    }
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            console.error(`Discord webhook failed: ${response.status}`);
        }
    }
    catch (error) {
        console.error("Discord webhook error:", error);
    }
}
async function notifyTradeOpen(trade) {
    const isLong = trade.side === "long";
    const embed = {
        title: "🔔 Trade Opened",
        color: isLong ? COLOR_GREEN : COLOR_RED,
        fields: [
            { name: "Bot", value: trade.botName, inline: false },
            { name: "Side", value: isLong ? "🟢 LONG" : "🔴 SHORT", inline: true },
            { name: "Leverage", value: `${trade.leverage}x`, inline: true },
            { name: "Entry Price", value: `$${trade.entryPrice.toFixed(2)}`, inline: true },
            { name: "Position Size", value: `$${trade.sizeUsd.toFixed(2)}`, inline: true },
            { name: "Stop Loss", value: `$${trade.stopLoss.toFixed(2)}`, inline: true },
            { name: "Take Profit", value: `$${trade.takeProfit.toFixed(2)}`, inline: true },
            { name: "Risk", value: `$${trade.riskUsd.toFixed(2)}`, inline: true },
        ],
        timestamp: new Date().toISOString(),
    };
    await sendWebhook({ embeds: [embed] }, MEXC_TRADE_WEBHOOK);
}
async function notifyTradeClose(trade) {
    const isWin = trade.pnl >= 0;
    const outcomeText = trade.status === "closed_tp"
        ? "🎯 Take Profit"
        : trade.status === "closed_sl"
            ? "🛑 Stop Loss"
            : "📊 Signal Exit";
    const pnlText = `${isWin ? "+" : ""}$${trade.pnl.toFixed(2)}`;
    const pnlPercentText = `${isWin ? "+" : ""}${trade.pnlPercent.toFixed(2)}%`;
    const embed = {
        title: "🔔 Trade Closed",
        color: isWin ? COLOR_GREEN : COLOR_RED,
        fields: [
            { name: "Bot", value: trade.botName, inline: false },
            { name: "Outcome", value: outcomeText, inline: true },
            { name: "Side", value: trade.side === "long" ? "🟢 LONG" : "🔴 SHORT", inline: true },
            { name: "Entry", value: `$${trade.entryPrice.toFixed(2)}`, inline: true },
            { name: "Exit", value: `$${trade.exitPrice.toFixed(2)}`, inline: true },
            { name: "P&L", value: pnlText, inline: true },
            { name: "Return", value: pnlPercentText, inline: true },
            { name: "Balance", value: `$${trade.balance.toFixed(2)}`, inline: false },
        ],
        timestamp: new Date().toISOString(),
    };
    await sendWebhook({ embeds: [embed] }, MEXC_TRADE_WEBHOOK);
}
async function notifyDailySummary(bots) {
    const totalBalance = bots.reduce((sum, b) => sum + b.balance, 0);
    const totalInitial = bots.reduce((sum, b) => sum + b.initialBalance, 0);
    const totalTodayPnl = bots.reduce((sum, b) => sum + b.todayPnl, 0);
    const totalWins = bots.reduce((sum, b) => sum + b.wins, 0);
    const totalLosses = bots.reduce((sum, b) => sum + b.losses, 0);
    const totalReturn = totalInitial > 0 ? ((totalBalance - totalInitial) / totalInitial) * 100 : 0;
    const isProfitToday = totalTodayPnl >= 0;
    const isProfitOverall = totalBalance >= totalInitial;
    const botSummaries = bots.map(b => {
        const perf = b.initialBalance > 0 ? ((b.balance - b.initialBalance) / b.initialBalance) * 100 : 0;
        const perfSign = perf >= 0 ? "+" : "";
        const todaySign = b.todayPnl >= 0 ? "+" : "";
        return `**${b.name}**\nBalance: $${b.balance.toFixed(2)} (${perfSign}${perf.toFixed(2)}%)\nToday: ${todaySign}$${b.todayPnl.toFixed(2)} | ${b.wins}W/${b.losses}L`;
    }).join("\n\n");
    const embed = {
        title: "📊 Daily Summary",
        color: isProfitOverall ? COLOR_GREEN : COLOR_RED,
        fields: [
            { name: "Total Balance", value: `$${totalBalance.toFixed(2)}`, inline: true },
            { name: "Total Return", value: `${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(2)}%`, inline: true },
            { name: "Today's P&L", value: `${isProfitToday ? "+" : ""}$${totalTodayPnl.toFixed(2)}`, inline: true },
            { name: "Today's Trades", value: `${totalWins}W / ${totalLosses}L`, inline: true },
            { name: "Bot Performance", value: botSummaries || "No data", inline: false },
            { name: "Dashboard", value: "[View Dashboard](https://strategy-bot-eta.vercel.app/)", inline: false },
        ],
        timestamp: new Date().toISOString(),
    };
    await sendWebhook({ embeds: [embed] }, MEXC_TRADE_WEBHOOK);
}
//# sourceMappingURL=discord.js.map