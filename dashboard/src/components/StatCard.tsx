import React from 'react';
import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: number;
    className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, className }) => {
    return (
        <div className={clsx("bg-gray-800 rounded-xl p-6 border border-gray-700", className)}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-400 text-sm font-medium">{title}</p>
                    <h3 className="text-2xl font-bold text-white mt-2">{value}</h3>
                </div>
                <div className="p-3 bg-gray-700/50 rounded-lg">
                    <Icon className="w-6 h-6 text-blue-400" />
                </div>
            </div>
            {trend !== undefined && (
                <div className="mt-4 flex items-center">
                    <span className={clsx("text-sm font-medium", trend >= 0 ? "text-green-400" : "text-red-400")}>
                        {trend >= 0 ? "+" : ""}{trend}%
                    </span>
                    <span className="text-gray-500 text-sm ml-2">vs last period</span>
                </div>
            )}
        </div>
    );
};
