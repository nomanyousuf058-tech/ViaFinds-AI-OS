'use client';

import { RevenueLog } from '@/lib/supabase';

export default function RevenueCards({ logs }: { logs: RevenueLog[] }) {
  const displayAdRevenue = logs
    .filter((log) => log.source_type === 'Display Ad')
    .reduce((sum, log) => sum + (log.amount || 0), 0);

  const affiliateRevenue = logs
    .filter((log) => log.source_type === 'Affiliate')
    .reduce((sum, log) => sum + (log.amount || 0), 0);

  const totalRevenue = displayAdRevenue + affiliateRevenue;

  const recentLogs = logs.slice(0, 10);

  return (
    <div className="space-y-12">
      <section className="xl:col-span-2 bg-charcoal border border-slate-border rounded-lg p-6">
        <h3 className="font-ui-body text-ui-body font-semibold text-on-surface mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-gold-leaf text-[20px]">account_balance</span> Financial Command Center
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Revenue */}
          <div className="bg-surface-container-lowest border border-slate-border rounded-DEFAULT p-4 flex flex-col">
            <span className="font-label-caps text-label-caps text-on-surface-variant mb-2">Total Collective Revenue</span>
            <span className="font-headline-lg text-headline-lg text-on-surface mb-1">${totalRevenue.toFixed(2)}</span>
            <div className="flex items-center gap-1 text-green-500 font-mono-data text-[12px]">
              <span className="material-symbols-outlined text-[14px]">trending_up</span> Active
            </div>
          </div>
          {/* Ad Revenue */}
          <div className="bg-surface-container-lowest border border-slate-border rounded-DEFAULT p-4 flex flex-col">
            <span className="font-label-caps text-label-caps text-on-surface-variant mb-2">Display Ad Revenue</span>
            <span className="font-headline-lg text-headline-lg text-primary mb-1">${displayAdRevenue.toFixed(2)}</span>
            <div className="font-mono-data text-[12px] text-on-surface-variant mt-auto">Google AdSense</div>
          </div>
          {/* Affiliate Revenue */}
          <div className="bg-surface-container-lowest border border-slate-border rounded-DEFAULT p-4 flex flex-col">
            <span className="font-label-caps text-label-caps text-on-surface-variant mb-2">Affiliate Revenue</span>
            <span className="font-headline-lg text-headline-lg text-secondary mb-1">${affiliateRevenue.toFixed(2)}</span>
            <div className="font-mono-data text-[12px] text-on-surface-variant mt-auto">D24, Impact, CJ</div>
          </div>
        </div>

        {/* Trend Chart Placeholder */}
        <div className="h-48 bg-surface-container-lowest border border-slate-border rounded-DEFAULT flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, #434657 25%, #434657 26%, transparent 27%, transparent 74%, #434657 75%, #434657 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #434657 25%, #434657 26%, transparent 27%, transparent 74%, #434657 75%, #434657 76%, transparent 77%, transparent)', backgroundSize: '50px 50px' }}></div>
          <svg className="w-full h-full p-4" preserveAspectRatio="none" viewBox="0 0 100 100">
            <polyline fill="none" points="0,80 20,75 40,60 60,70 80,40 100,20" stroke="#0047FF" strokeWidth="2"></polyline>
            <polyline fill="none" points="0,90 20,85 40,75 60,80 80,60 100,50" stroke="#e9c349" strokeWidth="2"></polyline>
          </svg>
          <div className="absolute bottom-2 left-4 flex gap-4">
            <div className="flex items-center gap-1 font-mono-data text-[11px] text-on-surface-variant"><div className="w-2 h-2 bg-electric-indigo rounded-full"></div> Display Ads</div>
            <div className="flex items-center gap-1 font-mono-data text-[11px] text-on-surface-variant"><div className="w-2 h-2 bg-secondary rounded-full"></div> Affiliate</div>
          </div>
        </div>
      </section>

      <section className="bg-charcoal border border-slate-border rounded-lg overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-border flex justify-between items-center bg-surface-container-lowest">
          <h3 className="font-ui-body text-ui-body font-semibold text-on-surface">Recent Revenue Logs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-border bg-surface-container-lowest">
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 font-normal">Source</th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-4 py-4 font-normal">Network</th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-4 py-4 font-normal text-right">Amount</th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 font-normal text-right">Date</th>
              </tr>
            </thead>
            <tbody className="font-mono-data text-mono-data divide-y divide-slate-border/50">
              {recentLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#1A1A1A] transition-colors group cursor-pointer bg-surface-container-low border-l-4 border-transparent hover:border-gold-leaf">
                  <td className="px-6 py-3 font-ui-body text-ui-body font-medium">{log.source_type}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{log.network_name}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-green-500 font-bold">+${log.amount.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-3 text-right text-on-surface-variant">
                    {new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              ))}
              {recentLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-on-surface-variant font-ui-body">
                    No revenue logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
