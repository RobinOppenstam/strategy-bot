import React from 'react';
import { LayoutDashboard, BarChart3, History, Settings } from 'lucide-react';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
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
                    <a href="#" className="flex items-center space-x-3 px-4 py-3 bg-gray-700/50 text-blue-400 rounded-lg">
                        <LayoutDashboard size={20} />
                        <span className="font-medium">Overview</span>
                    </a>
                    <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:bg-gray-700/30 hover:text-gray-200 rounded-lg transition-colors">
                        <BarChart3 size={20} />
                        <span className="font-medium">Analytics</span>
                    </a>
                    <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:bg-gray-700/30 hover:text-gray-200 rounded-lg transition-colors">
                        <History size={20} />
                        <span className="font-medium">History</span>
                    </a>
                    <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:bg-gray-700/30 hover:text-gray-200 rounded-lg transition-colors">
                        <Settings size={20} />
                        <span className="font-medium">Settings</span>
                    </a>
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
