import React, { useState } from 'react';
import { Play } from 'lucide-react';
import type { DataAvailability, CreateBacktestInput } from '../../lib/api';

interface BacktestFormProps {
    dataAvailability: DataAvailability[];
    onSubmit: (input: CreateBacktestInput) => Promise<void>;
    isSubmitting: boolean;
}

const TIMEFRAME_LABELS: Record<string, string> = {
    Min1: '1m',
    Min5: '5m',
    Min15: '15m',
    Min30: '30m',
    Min60: '1h',
    Hour4: '4h',
    Day1: '1d',
};

export const BacktestForm: React.FC<BacktestFormProps> = ({
    dataAvailability,
    onSubmit,
    isSubmitting,
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [symbol, setSymbol] = useState('');
    const [timeframe, setTimeframe] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Advanced settings
    const [bankrollUsd, setBankrollUsd] = useState(10000);
    const [riskPercent, setRiskPercent] = useState(2);
    const [leverage, setLeverage] = useState(20);
    const [riskRewardRatio, setRiskRewardRatio] = useState(2);
    const [swingLength, setSwingLength] = useState(5);
    const [slDistance, setSlDistance] = useState(0.001);
    const [fastMAPeriod, setFastMAPeriod] = useState(9);
    const [slowMAPeriod, setSlowMAPeriod] = useState(21);
    const [allowTrendContinuation, setAllowTrendContinuation] = useState(false);
    const [exitOnZoneChange, setExitOnZoneChange] = useState(true);

    // Get unique symbols
    const symbols = [...new Set(dataAvailability.map(d => d.symbol))];

    // Get timeframes for selected symbol
    const timeframes = dataAvailability
        .filter(d => d.symbol === symbol)
        .map(d => d.timeframe);

    // Get date range for selected symbol/timeframe
    const selectedData = dataAvailability.find(
        d => d.symbol === symbol && d.timeframe === timeframe
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        await onSubmit({
            name,
            description: description || undefined,
            symbol,
            timeframe,
            startDate,
            endDate,
            bankrollUsd,
            riskPercent: riskPercent / 100,
            leverage,
            riskRewardRatio,
            swingLength,
            slDistance,
            fastMAPeriod,
            slowMAPeriod,
            allowTrendContinuation,
            exitOnZoneChange,
        });

        // Reset form
        setName('');
        setDescription('');
    };

    return (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">New Backtest</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                        Name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., BTC 15m Strategy Test"
                        required
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                        Description (optional)
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Notes about this backtest"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Symbol & Timeframe */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Symbol
                        </label>
                        <select
                            value={symbol}
                            onChange={(e) => {
                                setSymbol(e.target.value);
                                setTimeframe('');
                                setStartDate('');
                                setEndDate('');
                            }}
                            required
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select...</option>
                            {symbols.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Timeframe
                        </label>
                        <select
                            value={timeframe}
                            onChange={(e) => {
                                setTimeframe(e.target.value);
                                // Auto-set date range based on available data
                                const data = dataAvailability.find(
                                    d => d.symbol === symbol && d.timeframe === e.target.value
                                );
                                if (data) {
                                    setStartDate(data.earliestCandle.split('T')[0]);
                                    setEndDate(data.latestCandle.split('T')[0]);
                                }
                            }}
                            required
                            disabled={!symbol}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            <option value="">Select...</option>
                            {timeframes.map(tf => (
                                <option key={tf} value={tf}>{TIMEFRAME_LABELS[tf] || tf}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                            disabled={!timeframe}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            End Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            required
                            disabled={!timeframe}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        />
                    </div>
                </div>

                {/* Data Info */}
                {selectedData && (
                    <div className="bg-gray-700/50 rounded-lg p-3 text-sm">
                        <p className="text-gray-300">
                            <span className="text-gray-400">Available data: </span>
                            {selectedData.candleCount.toLocaleString()} candles
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                            {new Date(selectedData.earliestCandle).toLocaleDateString()} - {new Date(selectedData.latestCandle).toLocaleDateString()}
                        </p>
                    </div>
                )}

                {/* Advanced Settings Toggle */}
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm text-blue-400 hover:text-blue-300"
                >
                    {showAdvanced ? '- Hide' : '+ Show'} Advanced Settings
                </button>

                {/* Advanced Settings */}
                {showAdvanced && (
                    <div className="space-y-4 border-t border-gray-700 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Bankroll (USD)
                                </label>
                                <input
                                    type="number"
                                    value={bankrollUsd}
                                    onChange={(e) => setBankrollUsd(Number(e.target.value))}
                                    min={100}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Risk %
                                </label>
                                <input
                                    type="number"
                                    value={riskPercent}
                                    onChange={(e) => setRiskPercent(Number(e.target.value))}
                                    min={0.1}
                                    max={10}
                                    step={0.1}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Leverage
                                </label>
                                <input
                                    type="number"
                                    value={leverage}
                                    onChange={(e) => setLeverage(Number(e.target.value))}
                                    min={1}
                                    max={100}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    R:R Ratio
                                </label>
                                <input
                                    type="number"
                                    value={riskRewardRatio}
                                    onChange={(e) => setRiskRewardRatio(Number(e.target.value))}
                                    min={0.5}
                                    max={10}
                                    step={0.5}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Swing Length
                                </label>
                                <input
                                    type="number"
                                    value={swingLength}
                                    onChange={(e) => setSwingLength(Number(e.target.value))}
                                    min={2}
                                    max={20}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    SL Distance
                                </label>
                                <input
                                    type="number"
                                    value={slDistance}
                                    onChange={(e) => setSlDistance(Number(e.target.value))}
                                    min={0}
                                    step={0.0001}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Fast MA Period
                                </label>
                                <input
                                    type="number"
                                    value={fastMAPeriod}
                                    onChange={(e) => setFastMAPeriod(Number(e.target.value))}
                                    min={2}
                                    max={50}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Slow MA Period
                                </label>
                                <input
                                    type="number"
                                    value={slowMAPeriod}
                                    onChange={(e) => setSlowMAPeriod(Number(e.target.value))}
                                    min={5}
                                    max={200}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={allowTrendContinuation}
                                    onChange={(e) => setAllowTrendContinuation(e.target.checked)}
                                    className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                                />
                                Allow Trend Continuation
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={exitOnZoneChange}
                                    onChange={(e) => setExitOnZoneChange(e.target.checked)}
                                    className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                                />
                                Exit on Zone Change
                            </label>
                        </div>
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isSubmitting || !name || !symbol || !timeframe || !startDate || !endDate}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Starting...
                        </>
                    ) : (
                        <>
                            <Play size={16} />
                            Run Backtest
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};
