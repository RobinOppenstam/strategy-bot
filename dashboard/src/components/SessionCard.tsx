import React from 'react';
import { clsx } from 'clsx';
import type { Session } from '../lib/api';

interface SessionCardProps {
    session: Session;
    color: string;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session, color }) => {
    const totalPnl = Number(session.totalPnl) || 0;
    const currentBalance = Number(session.currentBalance) || 0;
    const initialBalance = Number(session.initialBalance) || 10000;
    const winRate = Number(session.winRate) || 0;
    const maxDrawdown = Number(session.maxDrawdown) || 0;

    const performance = initialBalance > 0 ? ((currentBalance - initialBalance) / initialBalance) * 100 : 0;

    const pnlColor = totalPnl >= 0 ? 'text-green-400' : 'text-red-400';
    const perfColor = performance >= 0 ? 'text-green-400' : 'text-red-400';
    const perfSign = performance >= 0 ? '+' : '';
    const pnlSign = totalPnl >= 0 ? '+' : '';

    return (
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <h3 className="text-white font-semibold">{session.name}</h3>
                </div>
                <span className={clsx("text-sm font-medium", perfColor)}>
                    {perfSign}{performance.toFixed(2)}%
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <p className="text-xs text-gray-500">Balance</p>
                    <p className="text-sm text-white font-medium">
                        ${currentBalance.toFixed(2)}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500">P&L</p>
                    <p className={clsx("text-sm font-medium", pnlColor)}>
                        {pnlSign}${totalPnl.toFixed(2)}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500">Win Rate</p>
                    <p className="text-sm text-white font-medium">
                        {winRate.toFixed(1)}%
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500">Max DD</p>
                    <p className="text-sm text-red-400 font-medium">
                        {maxDrawdown.toFixed(1)}%
                    </p>
                </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between text-xs text-gray-400">
                <span>{session.wins}W / {session.losses}L</span>
                <span>{session.openTrades} open</span>
            </div>
        </div>
    );
};
