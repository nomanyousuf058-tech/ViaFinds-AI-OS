import { supabase } from '@/lib/supabase';
import { Article, RevenueLog } from '@/lib/supabase';

async function getStats() {
  const [{ count: articleCount }, { data: revenueData }] = await Promise.all([
    supabase.from('articles').select('*', { count: 'exact', head: true }),
    supabase.from('revenue_logs').select('amount'),
  ]);

  const totalRevenue = revenueData?.reduce((sum, log) => sum + (log.amount || 0), 0) || 0;

  return {
    articleCount: articleCount || 0,
    totalRevenue,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <div className="p-margin-desktop h-full overflow-y-auto">
      <h1 className="font-headline-xl text-headline-xl font-bold text-on-surface tracking-tight mb-8">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-charcoal border border-slate-border rounded-lg p-6 flex flex-col justify-between">
          <span className="font-label-caps text-label-caps text-on-surface-variant mb-4">Total Articles</span>
          <span className="font-headline-lg text-headline-lg text-primary">{stats.articleCount}</span>
          <div className="mt-4 pt-4 border-t border-slate-border font-mono-data text-[12px] text-green-500 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">trending_up</span> Database Synced
          </div>
        </div>
        <div className="bg-charcoal border border-slate-border rounded-lg p-6 flex flex-col justify-between">
          <span className="font-label-caps text-label-caps text-on-surface-variant mb-4">Total Revenue</span>
          <span className="font-headline-lg text-headline-lg text-secondary">${stats.totalRevenue.toFixed(2)}</span>
          <div className="mt-4 pt-4 border-t border-slate-border font-mono-data text-[12px] text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">account_balance</span> Aggregated
          </div>
        </div>
        <div className="bg-charcoal border border-slate-border rounded-lg p-6 flex flex-col justify-between">
          <span className="font-label-caps text-label-caps text-on-surface-variant mb-4">System Status</span>
          <span className="font-headline-lg text-headline-lg text-electric-indigo">Optimal</span>
          <div className="mt-4 pt-4 border-t border-slate-border font-mono-data text-[12px] text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">bolt</span> Services Online
          </div>
        </div>
      </div>
    </div>
  );
}
