import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Stats } from '../lib/api';
import type { Session } from '../lib/api';

interface PnLChartProps {
    data: Stats['equityCurve'];
    sessionNames: string[];
    sessions?: Session[];
}

// Session colors matching the cards
export const SESSION_COLORS: Record<string, string> = {
    // Crypto
    'BTC 5m': '#22C55E',   // Green
    'BTC 15m': '#3B82F6',  // Blue
    'ETH 5m': '#EAB308',   // Yellow
    'ETH 15m': '#EF4444',  // Red
    // Gold
    'Gold 15m': '#F59E0B', // Amber/Gold
    'Gold 5m': '#D97706',  // Darker Amber
};

type TimeFilter = '1D' | '1W' | '1M' | 'ALL';

export const PnLChart: React.FC<PnLChartProps> = ({ data, sessionNames, sessions }) => {
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('1D');

    // Format large numbers for Y axis
    const formatYAxis = (value: number) => {
        if (Math.abs(value) >= 1000) {
            return `${value >= 0 ? '' : '-'}${Math.abs(value / 1000).toFixed(0)}k`;
        }
        return value.toString();
    };

    // Generate chart data with time points throughout the day
    const chartData = useMemo(() => {
        const now = new Date();
        const points: Array<Record<string, number | string>> = [];

        // Determine time range based on filter
        let hoursBack = 24;
        if (timeFilter === '1W') hoursBack = 24 * 7;
        else if (timeFilter === '1M') hoursBack = 24 * 30;
        else if (timeFilter === 'ALL') hoursBack = 24 * 90;

        const startTime = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);

        // Generate hourly points for the time range
        const interval = timeFilter === '1D' ? 1 : timeFilter === '1W' ? 6 : timeFilter === '1M' ? 24 : 24;
        const numPoints = Math.ceil(hoursBack / interval);

        for (let i = 0; i <= numPoints; i++) {
            const time = new Date(startTime.getTime() + i * interval * 60 * 60 * 1000);
            const point: Record<string, number | string> = {
                time: time.toISOString(),
            };

            // For each session, find the balance at this time point
            sessionNames.forEach(name => {
                const key = name.replace(/\s+/g, '');
                // Find the session's initial balance
                const session = sessions?.find(s => s.name === name);
                const initialBalance = session ? Number(session.initialBalance) || 10000 : 10000;

                // Find the last data point before or at this time
                const relevantData = data.filter(d => new Date(d.time as string) <= time);
                if (relevantData.length > 0) {
                    const lastPoint = relevantData[relevantData.length - 1];
                    point[key] = Number(lastPoint[key]) || initialBalance;
                } else {
                    point[key] = initialBalance;
                }
            });

            points.push(point);
        }

        return points;
    }, [data, sessionNames, sessions, timeFilter]);

    // Format time for X axis based on filter
    const formatXAxis = (time: string) => {
        if (!time) return '';
        const date = new Date(time);
        if (timeFilter === '1D') {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const filterButtons: TimeFilter[] = ['1D', '1W', '1M', 'ALL'];

    // Calculate Y-axis domain to center around initial balance
    const yDomain = useMemo(() => {
        // Get the initial balance (default 10000)
        const initialBalance = sessions?.[0] ? Number(sessions[0].initialBalance) || 10000 : 10000;
        // Set range to show +/- 20% from initial balance
        const range = initialBalance * 0.2;
        return [initialBalance - range, initialBalance + range];
    }, [sessions]);

    return (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-lg font-semibold text-white">Performance Comparison</h3>
                    <p className="text-sm text-gray-400">Relative PNL growth across {timeFilter === '1D' ? '24h' : timeFilter === '1W' ? '7 day' : timeFilter === '1M' ? '30 day' : 'all time'} cycle</p>
                </div>
                <div className="flex gap-1 bg-gray-700 rounded-lg p-1">
                    {filterButtons.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setTimeFilter(filter)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${timeFilter === filter
                                    ? 'bg-gray-900 text-white'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            <div className="h-[350px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis
                            dataKey="time"
                            stroke="#9CA3AF"
                            tickFormatter={formatXAxis}
                            fontSize={12}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="#9CA3AF"
                            tickFormatter={formatYAxis}
                            fontSize={12}
                            axisLine={false}
                            tickLine={false}
                            dx={-10}
                            domain={yDomain}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1F2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#fff'
                            }}
                            labelFormatter={(label) => label ? new Date(label).toLocaleString() : ''}
                            formatter={(value, name) => [
                                value != null ? `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00',
                                name
                            ]}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            formatter={(value) => <span className="text-gray-400 text-sm">{value}</span>}
                        />
                        {sessionNames.map((name, index) => {
                            const key = name.replace(/\s+/g, '');
                            const color = SESSION_COLORS[name] || ['#22C55E', '#3B82F6', '#EAB308', '#EF4444'][index % 4];
                            return (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    name={name}
                                    stroke={color}
                                    strokeWidth={2.5}
                                    dot={false}
                                    connectNulls
                                />
                            );
                        })}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
