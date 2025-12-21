import React from 'react';
import type { Trade } from '../lib/api';

interface OpenPositionsProps {
    trades: Trade[];
}

export const OpenPositions: React.FC<OpenPositionsProps> = ({ trades }) => {
    return (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Open Positions</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-700/50 text-gray-200">
                        <tr>
                            <th className="px-6 py-3 font-medium">Symbol</th>
                            <th className="px-6 py-3 font-medium">Side</th>
                            <th className="px-6 py-3 font-medium">Entry Price</th>
                            <th className="px-6 py-3 font-medium">Stop Loss</th>
                            <th className="px-6 py-3 font-medium">Take Profit</th>
                            <th className="px-6 py-3 font-medium">Size</th>
                            <th className="px-6 py-3 font-medium">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {trades.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                    No open positions
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
                                    <td className="px-6 py-4 text-white">{trade.entryPrice}</td>
                                    <td className="px-6 py-4 text-red-400">{trade.stopLoss}</td>
                                    <td className="px-6 py-4 text-green-400">{trade.takeProfit}</td>
                                    <td className="px-6 py-4 text-white">{trade.size}</td>
                                    <td className="px-6 py-4">{new Date(trade.entryTime).toLocaleString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
