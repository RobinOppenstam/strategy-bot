import React, { useEffect, useState, useCallback } from 'react';
import { BacktestList } from './BacktestList';
import { BacktestForm } from './BacktestForm';
import { BacktestResults } from './BacktestResults';
import {
    getDataAvailability,
    getBacktests,
    getBacktest,
    createBacktest,
    deleteBacktest,
    type DataAvailability,
    type BacktestSummary,
    type BacktestDetail,
    type CreateBacktestInput,
} from '../../lib/api';

export const BacktestsPage: React.FC = () => {
    const [dataAvailability, setDataAvailability] = useState<DataAvailability[]>([]);
    const [backtests, setBacktests] = useState<BacktestSummary[]>([]);
    const [selectedBacktest, setSelectedBacktest] = useState<BacktestDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [availability, btList] = await Promise.all([
                getDataAvailability(),
                getBacktests(),
            ]);
            setDataAvailability(availability);
            setBacktests(btList);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError('Failed to load data. Make sure the API server is running.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Poll for updates while any backtest is running
        const interval = setInterval(() => {
            if (backtests.some(bt => bt.status === 'RUNNING' || bt.status === 'PENDING')) {
                fetchData();
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [fetchData, backtests]);

    const handleSelect = async (id: string) => {
        try {
            const bt = await getBacktest(id);
            setSelectedBacktest(bt);
        } catch (err) {
            console.error('Failed to fetch backtest:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this backtest?')) return;

        try {
            await deleteBacktest(id);
            setBacktests(prev => prev.filter(bt => bt.id !== id));
            if (selectedBacktest?.id === id) {
                setSelectedBacktest(null);
            }
        } catch (err) {
            console.error('Failed to delete backtest:', err);
        }
    };

    const handleSubmit = async (input: CreateBacktestInput) => {
        setIsSubmitting(true);
        try {
            const result = await createBacktest(input);
            // Refresh list
            await fetchData();
            // Select the new backtest
            handleSelect(result.id);
        } catch (err) {
            console.error('Failed to create backtest:', err);
            alert('Failed to create backtest. Check the console for details.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/20 border border-red-500 rounded-xl p-6 text-center">
                <p className="text-red-400">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white">Backtesting</h2>
                <p className="text-gray-400 mt-1">
                    Test your strategy on historical data
                </p>
            </div>

            {/* No data available */}
            {dataAvailability.length === 0 ? (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
                    <h3 className="text-lg font-semibold text-white mb-2">No Historical Data</h3>
                    <p className="text-gray-400 mb-4">
                        Import MT5 CSV data to start backtesting.
                    </p>
                    <div className="bg-gray-700/50 rounded-lg p-4 text-left max-w-lg mx-auto">
                        <p className="text-sm text-gray-300 font-mono">
                            npx ts-node src/backtest/csv-import.ts ./data/BTCUSD_M15.csv BTC_USDT Min15
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left column - Form & List */}
                    <div className="lg:col-span-1 space-y-6">
                        <BacktestForm
                            dataAvailability={dataAvailability}
                            onSubmit={handleSubmit}
                            isSubmitting={isSubmitting}
                        />
                        <BacktestList
                            backtests={backtests}
                            onSelect={handleSelect}
                            onDelete={handleDelete}
                            selectedId={selectedBacktest?.id}
                        />
                    </div>

                    {/* Right column - Results */}
                    <div className="lg:col-span-2">
                        {selectedBacktest ? (
                            <BacktestResults backtest={selectedBacktest} />
                        ) : (
                            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center h-full flex items-center justify-center">
                                <div>
                                    <p className="text-gray-400">Select a backtest to view results</p>
                                    <p className="text-gray-500 text-sm mt-2">
                                        Or create a new one using the form
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
