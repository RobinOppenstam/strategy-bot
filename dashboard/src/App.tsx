import { useEffect, useState, useMemo } from 'react';
import { DashboardLayout, type AssetTab } from './components/DashboardLayout';
import { PnLChart, SESSION_COLORS } from './components/PnLChart';
import { SessionCard } from './components/SessionCard';
import { OpenPositions } from './components/OpenPositions';
import { TradeHistory } from './components/TradeHistory';
import { getSessions, getStats, getOpenPositions, getTradeHistory } from './lib/api';
import type { Session, Stats, Trade } from './lib/api';

// Helper to determine if a session is gold or crypto
const isGoldSession = (session: Session) => {
  return session.symbol?.includes('XAU') || session.name?.toLowerCase().includes('gold');
};

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [openPositions, setOpenPositions] = useState<Trade[]>([]);
  const [history, setHistory] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AssetTab>('crypto');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionsData, statsData, openData, historyData] = await Promise.all([
          getSessions(),
          getStats(),
          getOpenPositions(),
          getTradeHistory()
        ]);
        setSessions(sessionsData);
        setStats(statsData);
        setOpenPositions(openData);
        setHistory(historyData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  // Filter sessions based on active tab
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      const isGold = isGoldSession(session);
      return activeTab === 'gold' ? isGold : !isGold;
    });
  }, [sessions, activeTab]);

  // Filter positions based on active tab (using session name)
  const filteredPositions = useMemo(() => {
    const sessionNames = new Set(filteredSessions.map(s => s.name));
    return openPositions.filter(trade => sessionNames.has(trade.session?.name));
  }, [openPositions, filteredSessions]);

  // Filter history based on active tab (using session name)
  const filteredHistory = useMemo(() => {
    const sessionNames = new Set(filteredSessions.map(s => s.name));
    return history.filter(trade => sessionNames.has(trade.session?.name));
  }, [history, filteredSessions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Calculate totals from filtered sessions
  const totalPnl = filteredSessions.reduce((sum, s) => sum + (Number(s.totalPnl) || 0), 0);
  const totalBalance = filteredSessions.reduce((sum, s) => sum + (Number(s.currentBalance) || 0), 0);

  // Get title based on active tab
  const tabTitle = activeTab === 'gold' ? 'Gold Trading' : 'Crypto Trading';
  const tabSubtitle = activeTab === 'gold'
    ? 'Real-time XAU/USD performance'
    : 'Real-time performance across crypto sessions';

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">{tabTitle}</h2>
            <p className="text-gray-400 mt-1">{tabSubtitle}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Total Balance</p>
            <p className="text-2xl font-bold text-white">${totalBalance.toFixed(2)}</p>
            <p className={`text-sm font-medium ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)} P&L
            </p>
          </div>
        </div>

        {/* Session Cards Grid */}
        {filteredSessions.length > 0 ? (
          <div className={`grid grid-cols-1 gap-4 ${
            activeTab === 'gold'
              ? 'md:grid-cols-1 lg:grid-cols-1 max-w-md'
              : 'md:grid-cols-2 lg:grid-cols-4'
          }`}>
            {filteredSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                color={SESSION_COLORS[session.name] || (activeTab === 'gold' ? '#F59E0B' : '#60A5FA')}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center">
            <p className="text-gray-400">
              No {activeTab === 'gold' ? 'gold' : 'crypto'} sessions found.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {activeTab === 'gold'
                ? 'Make sure TWELVEDATA_API_KEY is set and the bot is running.'
                : 'Start the bot to begin paper trading.'}
            </p>
          </div>
        )}

        {/* Chart */}
        {filteredSessions.length > 0 && (
          <PnLChart
            data={stats?.equityCurve ?? []}
            sessionNames={filteredSessions.map(s => s.name)}
            sessions={filteredSessions}
          />
        )}

        {/* Open Positions */}
        <OpenPositions trades={filteredPositions} />

        {/* Trade History */}
        <TradeHistory trades={filteredHistory} />
      </div>
    </DashboardLayout>
  );
}

export default App;
