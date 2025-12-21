import { useEffect, useState } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { PnLChart, SESSION_COLORS } from './components/PnLChart';
import { SessionCard } from './components/SessionCard';
import { OpenPositions } from './components/OpenPositions';
import { TradeHistory } from './components/TradeHistory';
import { getSessions, getStats, getOpenPositions, getTradeHistory } from './lib/api';
import type { Session, Stats, Trade } from './lib/api';

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [openPositions, setOpenPositions] = useState<Trade[]>([]);
  const [history, setHistory] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Calculate totals from sessions
  const totalPnl = sessions.reduce((sum, s) => sum + (Number(s.totalPnl) || 0), 0);
  const totalBalance = sessions.reduce((sum, s) => sum + (Number(s.currentBalance) || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Trading Dashboard</h2>
            <p className="text-gray-400 mt-1">Real-time performance across all sessions</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              color={SESSION_COLORS[session.name] || '#60A5FA'}
            />
          ))}
        </div>

        {/* Chart */}
        <PnLChart
          data={stats?.equityCurve ?? []}
          sessionNames={stats?.sessionNames ?? sessions.map(s => s.name)}
          sessions={sessions}
        />

        {/* Open Positions */}
        <OpenPositions trades={openPositions} />

        {/* Trade History */}
        <TradeHistory trades={history} />
      </div>
    </DashboardLayout>
  );
}

export default App;
