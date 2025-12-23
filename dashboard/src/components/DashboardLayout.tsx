import React, { useState } from 'react';
import { Bitcoin, Coins, Menu, X, History } from 'lucide-react';

export type AssetTab = 'crypto' | 'gold' | 'backtests';

interface DashboardLayoutProps {
    children: React.ReactNode;
    activeTab: AssetTab;
    onTabChange: (tab: AssetTab) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activeTab, onTabChange }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleTabChange = (tab: AssetTab) => {
        onTabChange(tab);
        setSidebarOpen(false); // Close sidebar on mobile after selection
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex">
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-50
                w-64 bg-gray-800 border-r border-gray-700 flex flex-col
                transform transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Bot Dashboard
                    </h1>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden text-gray-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <button
                        onClick={() => handleTabChange('crypto')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                            activeTab === 'crypto'
                                ? 'bg-gray-700/50 text-blue-400'
                                : 'text-gray-400 hover:bg-gray-700/30 hover:text-gray-200'
                        }`}
                    >
                        <Bitcoin size={20} />
                        <span className="font-medium">Crypto</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('gold')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                            activeTab === 'gold'
                                ? 'bg-gray-700/50 text-yellow-400'
                                : 'text-gray-400 hover:bg-gray-700/30 hover:text-gray-200'
                        }`}
                    >
                        <Coins size={20} />
                        <span className="font-medium">Gold</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('backtests')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                            activeTab === 'backtests'
                                ? 'bg-gray-700/50 text-purple-400'
                                : 'text-gray-400 hover:bg-gray-700/30 hover:text-gray-200'
                        }`}
                    >
                        <History size={20} />
                        <span className="font-medium">Backtests</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-gray-700">
                    <div className="flex items-center space-x-3 px-4 py-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500" />
                        <div>
                            <p className="text-sm font-medium text-white">Admin User</p>
                            <p className="text-xs text-gray-500">Online</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto min-w-0">
                {/* Mobile Header */}
                <div className="lg:hidden sticky top-0 z-30 bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="text-gray-400 hover:text-white"
                    >
                        <Menu size={24} />
                    </button>
                    <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Bot Dashboard
                    </h1>
                    <div className="w-6" /> {/* Spacer for centering */}
                </div>

                <div className="p-4 sm:p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};
