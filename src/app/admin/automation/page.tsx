import { supabase } from '@/lib/supabase';
import AutomationPipeline from '@/components/AutomationPipeline';

async function getAutomationLogs() {
  const { data, error } = await supabase
    .from('automation_logs')
    .select('*')
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Error fetching automation logs:', error);
    return [];
  }
  return data || [];
}

export default async function AutomationPage() {
  const logs = await getAutomationLogs();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-viafinds-text mb-8">Automation Workflow</h1>
      <AutomationPipeline initialLogs={logs} />
    </div>
  );
}
