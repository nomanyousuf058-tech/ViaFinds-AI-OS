import { supabase } from '@/lib/supabase';
import { RevenueLog } from '@/lib/supabase';
import RevenueCards from '@/components/RevenueCards';

async function getRevenueLogs(): Promise<RevenueLog[]> {
  const { data, error } = await supabase
    .from('revenue_logs')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching revenue logs:', error);
    return [];
  }

  return data || [];
}

export default async function RevenuePage() {
  const logs = await getRevenueLogs();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-viafinds-text mb-8">Revenue & Analytics</h1>
      <RevenueCards logs={logs} />
    </div>
  );
}
