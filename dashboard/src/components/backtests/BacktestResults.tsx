import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Target, Clock } from 'lucide-react';
import type { BacktestDetail } from '../../lib/api';

interface BacktestResultsProps {
    backtest: BacktestDetail;
}

const StatCard: React.FC<{
    label: string;
    value: string | number;
    subValue?: string;
    icon?: React.ReactNode;
    color?: 'green' | 'red' | 'blue' | 'yellow' | 'gray';
}> = ({ label, value, subValue, icon, color = 'gray' }) => {
    const colorClasses = {
        green: 'text-green-400',
        red: 'text-red-400',
        blue: 'text-blue-400',
        yellow: 'text-yellow-400',
        gray: 'text-gray-300',
    };

    return (
        <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                {icon}
                {label}
            </div>
            <p className={`text-xl font-bold ${colorClasses[color]}`}>{value}</p>
            {subValue && (
                <p className="text-xs text-gray-500 mt-1">{subValue}</p>
            )}
        </div>
    );
};

export const BacktestResults: React.FC<BacktestResultsProps> = ({ backtest }) => {
    const totalPnl = Number(backtest.totalPnl) || 0;
    const winRate = (Number(backtest.winRate) || 0) * 100;
    const profitFactor = Number(backtest.profitFactor) || 0;
    const maxDrawdown = Number(backtest.maxDrawdown) || 0;
    const maxDrawdownPct = Number(backtest.maxDrawdownPct) || 0;
    const avgRMultiple = Number(backtest.avgRMultiple) || 0;
    const sharpeRatio = Number(backtest.sharpeRatio) || 0;
    const finalBalance = Number(backtest.finalBalance) || 0;
    const initialBalance = Number(backtest.bankrollUsd) || 10000;
    const returnPct = ((finalBalance - initialBalance) / initialBalance) * 100;

    // Format equity curve for chart
    const chartData = (backtest.equityCurve || []).map((point, idx) => ({
        index: idx,
        time: new Date(point.timestamp).toLocaleDateString(),
        balance: point.balance,
        drawdown: point.drawdown,
    }));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white">{backtest.name}</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            {backtest.symbol} {backtest.timeframe} | {new Date(backtest.startDate).toLocaleDateString()} - {new Date(backtest.endDate).toLocaleDateString()}
                        </p>
                        {backtest.description && (
                            <p className="text-gray-500 text-sm mt-2">{backtest.description}</p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                        </p>
                        <p className={`text-sm ${returnPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="Total Trades"
                    value={backtest.totalTrades || 0}
                    subValue={`${backtest.winCount || 0}W / ${backtest.lossCount || 0}L`}
                    icon={<Activity size={14} />}
                />
                <StatCard
                    label="Win Rate"
                    value={`${winRate.toFixed(1)}%`}
                    color={winRate >= 50 ? 'green' : 'red'}
                    icon={<Target size={14} />}
                />
                <StatCard
                    label="Profit Factor"
                    value={profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}
                    color={profitFactor >= 1.5 ? 'green' : profitFactor >= 1 ? 'yellow' : 'red'}
                    icon={<TrendingUp size={14} />}
                />
                <StatCard
                    label="Max Drawdown"
                    value={`$${maxDrawdown.toFixed(2)}`}
                    subValue={`${maxDrawdownPct.toFixed(2)}%`}
                    color="red"
                    icon={<TrendingDown size={14} />}
                />
                <StatCard
                    label="Avg R-Multiple"
                    value={avgRMultiple.toFixed(2)}
                    color={avgRMultiple >= 0 ? 'green' : 'red'}
                />
                <StatCard
                    label="Sharpe Ratio"
                    value={sharpeRatio.toFixed(2)}
                    color={sharpeRatio >= 1 ? 'green' : sharpeRatio >= 0 ? 'yellow' : 'red'}
                />
                <StatCard
                    label="Final Balance"
                    value={`$${finalBalance.toFixed(2)}`}
                    subValue={`Started with $${initialBalance.toFixed(2)}`}
                    color={finalBalance >= initialBalance ? 'green' : 'red'}
                />
                <StatCard
                    label="Execution Time"
                    value={`${((backtest.executionTimeMs || 0) / 1000).toFixed(1)}s`}
                    subValue={`${(backtest.candlesProcessed || 0).toLocaleString()} candles`}
                    icon={<Clock size={14} />}
                />
            </div>

            {/* Equity Curve */}
            {chartData.length > 0 && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Equity Curve</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis
                                    dataKey="time"
                                    stroke="#9CA3AF"
                                    fontSize={12}
                                    tick={{ fill: '#9CA3AF' }}
                                />
                                <YAxis
                                    stroke="#9CA3AF"
                                    fontSize={12}
                                    tick={{ fill: '#9CA3AF' }}
                                    tickFormatter={(v) => `$${v.toFixed(0)}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1F2937',
                                        border: '1px solid #374151',
                                        borderRadius: '8px',
                                    }}
                                    labelStyle={{ color: '#9CA3AF' }}
                                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Balance']}
                                />
                                <ReferenceLine
                                    y={initialBalance}
                                    stroke="#6B7280"
                                    strokeDasharray="3 3"
                                    label={{
                                        value: 'Initial',
                                        fill: '#6B7280',
                                        fontSize: 10,
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="balance"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Trade List */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white">Trades ({backtest.trades.length})</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-700/50">
                            <tr className="text-left text-xs text-gray-400 uppercase">
                                <th className="px-4 py-3">#</th>
                                <th className="px-4 py-3">Side</th>
                                <th className="px-4 py-3">Entry</th>
                                <th className="px-4 py-3">Exit</th>
                                <th className="px-4 py-3">P&L</th>
                                <th className="px-4 py-3">R</th>
                                <th className="px-4 py-3">Reason</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {backtest.trades.slice(0, 100).map((trade) => {
                                const pnl = Number(trade.pnlUsd);
                                const rMult = Number(trade.rMultiple);
                                return (
                                    <tr key={trade.id} className="text-sm hover:bg-gray-700/30">
                                        <td className="px-4 py-3 text-gray-400">{trade.tradeNumber}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                trade.side === 'LONG'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-red-500/20 text-red-400'
                                            }`}>
                                                {trade.side}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-300">
                                            <div>${Number(trade.entryPrice).toFixed(2)}</div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(trade.entryTime).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-300">
                                            <div>${Number(trade.exitPrice).toFixed(2)}</div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(trade.exitTime).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className={`px-4 py-3 font-medium ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                                        </td>
                                        <td className={`px-4 py-3 ${rMult >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {rMult >= 0 ? '+' : ''}{rMult.toFixed(2)}R
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">
                                            {trade.exitReason}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {backtest.trades.length > 100 && (
                        <div className="p-4 text-center text-gray-400 text-sm border-t border-gray-700">
                            Showing first 100 of {backtest.trades.length} trades
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
