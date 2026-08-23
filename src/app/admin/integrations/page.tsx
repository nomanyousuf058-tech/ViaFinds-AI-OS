import { supabase } from '@/lib/supabase';
import { ApiIntegration } from '@/lib/supabase';
import IntegrationCards from '@/components/IntegrationCards';

async function getIntegrations(): Promise<ApiIntegration[]> {
  const { data, error } = await supabase
    .from('api_integrations')
    .select('*')
    .order('provider_name', { ascending: true });

  if (error) {
    console.error('Error fetching integrations:', error);
    return [];
  }

  return data || [];
}

export default async function IntegrationsPage() {
  const integrations = await getIntegrations();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-viafinds-text mb-8">API Integrations</h1>
      <IntegrationCards initialIntegrations={integrations} />
    </div>
  );
}
