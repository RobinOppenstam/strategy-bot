import React from 'react';
import type { Trade } from '../lib/api';

interface TradeHistoryProps {
    trades: Trade[];
}

export const TradeHistory: React.FC<TradeHistoryProps> = ({ trades }) => {
    return (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Trade History</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-700/50 text-gray-200">
                        <tr>
                            <th className="px-6 py-3 font-medium">Symbol</th>
                            <th className="px-6 py-3 font-medium">Side</th>
                            <th className="px-6 py-3 font-medium">Entry Price</th>
                            <th className="px-6 py-3 font-medium">Exit Price</th>
                            <th className="px-6 py-3 font-medium">PnL ($)</th>
                            <th className="px-6 py-3 font-medium">PnL (%)</th>
                            <th className="px-6 py-3 font-medium">Exit Time</th>
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
                                    <td className="px-6 py-4 font-medium text-white">{trade.session.symbol}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${trade.side === 'LONG' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                            }`}>
                                            {trade.side}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-white">{parseFloat(trade.entryPrice).toFixed(4)}</td>
                                    <td className="px-6 py-4 text-white">{trade.exitPrice ? parseFloat(trade.exitPrice).toFixed(4) : '-'}</td>
                                    <td className={`px-6 py-4 font-medium ${Number(trade.pnlUsd) >= 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                        {trade.pnlUsd ? `$${Number(trade.pnlUsd).toFixed(2)}` : '-'}
                                    </td>
                                    <td className={`px-6 py-4 font-medium ${Number(trade.pnlPercent) >= 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                        {trade.pnlPercent ? `${Number(trade.pnlPercent).toFixed(2)}%` : '-'}
                                    </td>
                                    <td className="px-6 py-4">{trade.exitTime ? new Date(trade.exitTime).toLocaleString() : '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
