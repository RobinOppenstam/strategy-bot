import React from 'react';
import type { Trade } from '../lib/api';

interface TradeHistoryProps {
    trades: Trade[];
}

export const TradeHistory: React.FC<TradeHistoryProps> = ({ trades }) => {
    return (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Trade History</h3>
            </div>

            {/* Mobile Card View */}
            <div className="block sm:hidden">
                {trades.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">
                        No trade history
                    </div>
                ) : (
                    <div className="divide-y divide-gray-700">
                        {trades.map((trade) => {
                            const pnlUsd = Number(trade.pnlUsd) || 0;
                            const pnlPercent = Number(trade.pnlPercent) || 0;
                            const isProfit = pnlUsd >= 0;

                            return (
                                <div key={trade.id} className="p-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-white">{trade.session.symbol}</span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                trade.side === 'LONG'
                                                    ? 'bg-green-500/10 text-green-400'
                                                    : 'bg-red-500/10 text-red-400'
                                            }`}>
                                                {trade.side}
                                            </span>
                                        </div>
                                        <div className={`text-right font-medium ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                                            <div>{isProfit ? '+' : ''}${pnlUsd.toFixed(2)}</div>
                                            <div className="text-xs">{isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-gray-500">Entry</span>
                                            <p className="text-white">${parseFloat(trade.entryPrice).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Exit</span>
                                            <p className="text-white">
                                                {trade.exitPrice ? `$${parseFloat(trade.exitPrice).toFixed(2)}` : '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {trade.exitTime ? new Date(trade.exitTime).toLocaleString() : '-'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-700/50 text-gray-200">
                        <tr>
                            <th className="px-4 lg:px-6 py-3 font-medium">Symbol</th>
                            <th className="px-4 lg:px-6 py-3 font-medium">Side</th>
                            <th className="px-4 lg:px-6 py-3 font-medium">Entry</th>
                            <th className="px-4 lg:px-6 py-3 font-medium">Exit</th>
                            <th className="px-4 lg:px-6 py-3 font-medium">PnL ($)</th>
                            <th className="px-4 lg:px-6 py-3 font-medium hidden md:table-cell">PnL (%)</th>
                            <th className="px-4 lg:px-6 py-3 font-medium hidden lg:table-cell">Exit Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {trades.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                    No trade history
                                </td>
                            </tr>
                        ) : (
                            trades.map((trade) => (
                                <tr key={trade.id} className="hover:bg-gray-700/30 transition-colors">
                                    <td className="px-4 lg:px-6 py-4 font-medium text-white">{trade.session.symbol}</td>
                                    <td className="px-4 lg:px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${trade.side === 'LONG' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                            }`}>
                                            {trade.side}
                                        </span>
                                    </td>
                                    <td className="px-4 lg:px-6 py-4 text-white">{parseFloat(trade.entryPrice).toFixed(2)}</td>
                                    <td className="px-4 lg:px-6 py-4 text-white">{trade.exitPrice ? parseFloat(trade.exitPrice).toFixed(2) : '-'}</td>
                                    <td className={`px-4 lg:px-6 py-4 font-medium ${Number(trade.pnlUsd) >= 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                        {trade.pnlUsd ? `$${Number(trade.pnlUsd).toFixed(2)}` : '-'}
                                    </td>
                                    <td className={`px-4 lg:px-6 py-4 font-medium hidden md:table-cell ${Number(trade.pnlPercent) >= 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                        {trade.pnlPercent ? `${Number(trade.pnlPercent).toFixed(2)}%` : '-'}
                                    </td>
                                    <td className="px-4 lg:px-6 py-4 hidden lg:table-cell">{trade.exitTime ? new Date(trade.exitTime).toLocaleString() : '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
