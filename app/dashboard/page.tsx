'use client';
import React, { useState, useEffect } from 'react';

interface LogEntry {
  timestamp?: string;
  level?: string;
  message?: string;
  [key: string]: unknown;
}

interface Partner {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive';
  category: string;
}

interface DashboardStats {
  todayArticles: number;
  dailyTarget: number;
  totalArticles: number;
  todayProducts: number;
  totalProducts: number;
  weeklyData: { day: string; count: number }[];
  progressPercentage: number;
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);
  const [systemStatus, setSystemStatus] = useState('Idle');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [revenue, setRevenue] = useState({ digistore24: 0, googleAds: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, logsRes, partnersRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/automation/status'),
          fetch('/api/dashboard/partners'),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setSystemStatus(logsData.status || 'Idle');
          setLiveLogs(logsData.logs || []);
        }

        if (partnersRes.ok) {
          const partnersData = await partnersRes.json();
          setPartners(Array.isArray(partnersData) ? partnersData : []);
        }
      } catch (e) {
        console.error('Failed to fetch dashboard data:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const maxWeeklyCount = Math.max(...(stats?.weeklyData?.map(d => d.count) || [1]));

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="font-bold text-[36px] leading-[44px] tracking-[-0.02em] text-[#131b2e]">Overview</h1>
          <p className="text-[16px] text-[#444655] mt-1">ViaFinds Command Center</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${systemStatus === 'RUNNING' ? 'bg-[#10B981]' : 'bg-[#757686]'}`}></span>
          <span className="font-mono text-[13px] text-[#131b2e] font-medium">{systemStatus.toUpperCase()}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
        </div>
      ) : (
        <>
          {/* Progress Widget */}
          {stats && (
            <section className="bg-white border border-[#c5c5d7] rounded-lg p-6">
              <h2 className="text-[12px] font-semibold tracking-[0.05em] text-[#757686] mb-4 uppercase">Today&apos;s Progress</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] text-[#444655] mb-1">Articles Published</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[32px] font-semibold text-[#131b2e]">{stats.todayArticles}</span>
                    <span className="text-[14px] text-[#757686]">/ {stats.dailyTarget} daily target</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-24 h-24 relative">
                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                      <circle
                        cx="50" cy="50" r="40" fill="none" stroke="#0426be" strokeWidth="8"
                        strokeDasharray={`${2 * Math.PI * 40 * (stats.progressPercentage / 100)} ${2 * Math.PI * 40}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[18px] font-bold text-[#131b2e]">{stats.progressPercentage}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 7-Day Graph */}
          {stats && (
            <section className="bg-white border border-[#c5c5d7] rounded-lg p-6">
              <h2 className="text-[12px] font-semibold tracking-[0.05em] text-[#757686] mb-6 uppercase">7-Day Publishing History</h2>
              <div className="flex items-end justify-between gap-2 h-32">
                {stats.weeklyData.map((day, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-surface-container-high relative" style={{ height: '100px' }}>
                      <div
                        className="absolute bottom-0 w-full bg-[#0426be] transition-all duration-500"
                        style={{ height: `${(day.count / maxWeeklyCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#757686] font-mono">{day.day}</span>
                    <span className="text-[12px] font-bold text-[#131b2e]">{day.count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Revenue Cards */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#c5c5d7] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[12px] font-semibold tracking-[0.05em] text-[#757686] uppercase">Digistore24 Revenue</h2>
                <span className="material-symbols-outlined text-[#0426be] text-[18px]">payments</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[12px] text-[#444655] mb-1">Total Revenue</p>
                  <p className="text-[32px] font-semibold text-[#131b2e]">${revenue.digistore24.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[12px] text-[#444655] mb-1">Status</p>
                  <p className="text-[14px] font-semibold text-[#10B981]">Connected</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#c5c5d7] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[12px] font-semibold tracking-[0.05em] text-[#757686] uppercase">Google Ads / AdSense</h2>
                <span className="material-symbols-outlined text-[#10B981] text-[18px]">ads_click</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[12px] text-[#444655] mb-1">Estimated Revenue</p>
                  <p className="text-[32px] font-semibold text-[#131b2e]">${revenue.googleAds.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[12px] text-[#444655] mb-1">Status</p>
                  <p className="text-[14px] font-semibold text-[#757686]">Not Connected</p>
                </div>
              </div>
            </div>
          </section>

          {/* Partners Section */}
          <section className="bg-white border border-[#c5c5d7] rounded-lg p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-[20px] font-semibold text-[#131b2e]">Connected Partners</h2>
                <p className="text-[14px] text-[#444655] mt-1">Affiliate networks and social platforms</p>
              </div>
              <button
                onClick={() => alert('Add Partner modal would open here')}
                className="px-4 py-2 bg-[#0426be] text-white rounded text-[12px] font-semibold tracking-[0.05em] uppercase hover:bg-[#031a8a] transition-colors"
              >
                Add Partner
              </button>
            </div>

            {partners.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-[#c5c5d7] rounded-lg">
                <span className="material-symbols-outlined text-[48px] text-[#c5c5d7] mb-4 block">handshake</span>
                <p className="text-[14px] text-[#444655] mb-2">No partners configured yet.</p>
                <p className="text-[12px] text-[#757686]">Add your first partner to start tracking revenue.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {partners.map((partner) => (
                  <div key={partner.id} className="border border-[#c5c5d7] rounded-lg p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#f2f3ff] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[#0426be] text-[20px]">handshake</span>
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-[#131b2e]">{partner.name}</p>
                          <p className="text-[10px] text-[#757686] uppercase tracking-wider">{partner.type}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        partner.status === 'active'
                          ? 'bg-[#10B981]/10 text-[#10B981]'
                          : 'bg-[#757686]/10 text-[#757686]'
                      }`}>
                        {partner.status}
                      </span>
                    </div>
                    <div className="mt-auto pt-3 border-t border-[#c5c5d7]">
                      <p className="text-[10px] text-[#757686]">Category: {partner.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Live Activity Log */}
          <div className="bg-white border border-[#c5c5d7] rounded-lg p-0 flex flex-col h-64 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#c5c5d7] bg-[#faf8ff] flex justify-between items-center">
              <h2 className="text-[20px] font-semibold text-[#131b2e]">Live Activity Log</h2>
              <span className="material-symbols-outlined text-[#444655] text-[18px] animate-pulse">sensors</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#f8fafc] font-mono text-[13px] font-medium text-[#444655]">
              {liveLogs.length === 0 ? (
                <div className="p-2">No recent logs found.</div>
              ) : (
                liveLogs.slice().reverse().map((log, i) => (
                  <div key={i} className="flex space-x-3 py-1 border-b border-[#dae2fd] hover:bg-[#f2f3ff]">
                    <span className="text-[#3d4143]">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}</span>
                    <span className={`${log.level === 'error' ? 'text-[#ba1a1a]' : log.level === 'warn' ? 'text-yellow-600' : 'text-[#0426be]'}`}>[{String(log.level || 'LOG')}]</span>
                    <span className="text-[#131b2e] whitespace-pre-wrap">{String(log.message || JSON.stringify(log))}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
