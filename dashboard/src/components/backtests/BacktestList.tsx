import React from 'react';
import { Play, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import type { BacktestSummary } from '../../lib/api';

interface BacktestListProps {
    backtests: BacktestSummary[];
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    selectedId?: string;
}

const StatusIcon: React.FC<{ status: BacktestSummary['status'] }> = ({ status }) => {
    switch (status) {
        case 'COMPLETED':
            return <CheckCircle size={16} className="text-green-400" />;
        case 'RUNNING':
            return <Play size={16} className="text-blue-400 animate-pulse" />;
        case 'PENDING':
            return <Clock size={16} className="text-yellow-400" />;
        case 'FAILED':
        case 'CANCELLED':
            return <XCircle size={16} className="text-red-400" />;
        default:
            return null;
    }
};

export const BacktestList: React.FC<BacktestListProps> = ({
    backtests,
    onSelect,
    onDelete,
    selectedId,
}) => {
    if (backtests.length === 0) {
        return (
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center">
                <p className="text-gray-400">No backtests yet.</p>
                <p className="text-gray-500 text-sm mt-2">
                    Create a new backtest to test your strategy on historical data.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Backtest History</h3>
            </div>
            <div className="divide-y divide-gray-700">
                {backtests.map((bt) => (
                    <div
                        key={bt.id}
                        onClick={() => onSelect(bt.id)}
                        className={`p-4 cursor-pointer transition-colors ${
                            selectedId === bt.id
                                ? 'bg-gray-700/50'
                                : 'hover:bg-gray-700/30'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <StatusIcon status={bt.status} />
                                <div>
                                    <p className="font-medium text-white">{bt.name}</p>
                                    <p className="text-sm text-gray-400">
                                        {bt.symbol} {bt.timeframe}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {bt.status === 'COMPLETED' && bt.totalPnl !== undefined && (
                                    <div className="text-right">
                                        <p className={`font-medium ${
                                            bt.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                            {bt.totalPnl >= 0 ? '+' : ''}${Number(bt.totalPnl).toFixed(2)}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {bt.totalTrades} trades | {((bt.winRate ?? 0) * 100).toFixed(0)}% WR
                                        </p>
                                    </div>
                                )}
                                {bt.status === 'RUNNING' && (
                                    <div className="text-right">
                                        <p className="text-sm text-blue-400">Running...</p>
                                        <p className="text-xs text-gray-400">{bt.progress}%</p>
                                    </div>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(bt.id);
                                    }}
                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
