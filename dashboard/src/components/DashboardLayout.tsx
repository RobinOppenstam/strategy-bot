import React from 'react';
import { Bitcoin, Coins } from 'lucide-react';

export type AssetTab = 'crypto' | 'gold';

interface DashboardLayoutProps {
    children: React.ReactNode;
    activeTab: AssetTab;
    onTabChange: (tab: AssetTab) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activeTab, onTabChange }) => {
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
                <div className="p-6 border-b border-gray-700">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Bot Dashboard
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <button
                        onClick={() => onTabChange('crypto')}
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
                        onClick={() => onTabChange('gold')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                            activeTab === 'gold'
                                ? 'bg-gray-700/50 text-yellow-400'
                                : 'text-gray-400 hover:bg-gray-700/30 hover:text-gray-200'
                        }`}
                    >
                        <Coins size={20} />
                        <span className="font-medium">Gold</span>
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
            <main className="flex-1 overflow-y-auto">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};
