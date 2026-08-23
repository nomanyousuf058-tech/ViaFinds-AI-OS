'use client';

import { useState } from 'react';
import { ApiIntegration, supabase } from '@/lib/supabase';

export default function IntegrationCards({ initialIntegrations }: { initialIntegrations: ApiIntegration[] }) {
  const [integrations, setIntegrations] = useState<ApiIntegration[]>(initialIntegrations);

  const toggleMode = async (id: string, currentMode: 'Manual' | 'Automated') => {
    const newMode = currentMode === 'Manual' ? 'Automated' : 'Manual';
    
    // Optimistic update
    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === id
          ? { ...int, mode: newMode }
          : int
      )
    );

    // Update in Supabase
    const { error } = await supabase
      .from('api_integrations')
      .update({ mode: newMode })
      .eq('id', id);

    if (error) {
      console.error('Failed to update mode:', error);
      // Revert on error
      setIntegrations((prev) =>
        prev.map((int) =>
          int.id === id
            ? { ...int, mode: currentMode }
            : int
        )
      );
    }
  };

  return (
    <section className="xl:col-span-1 bg-charcoal border border-slate-border rounded-lg p-6 flex flex-col">
      <h3 className="font-ui-body text-ui-body font-semibold text-on-surface mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-electric-indigo text-[20px]">hub</span> Integration Hub
      </h3>
      <div className="grid grid-cols-1 gap-6">
        {integrations.map((integration) => {
          const isActive = integration.status === 'Active';
          return (
            <div
              key={integration.id}
              className={`border border-slate-border rounded-DEFAULT p-4 flex flex-col gap-4 bg-surface-container-lowest ${isActive ? '' : 'opacity-60 grayscale'}`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded bg-surface-container-high border border-slate-border flex items-center justify-center font-bold font-mono-data text-[10px] ${isActive ? 'text-primary' : ''}`}>
                    {integration.provider_name.substring(0, 3).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-ui-body text-[13px] font-semibold text-on-surface">{integration.provider_name}</div>
                    <div className={`font-mono-data text-[11px] flex items-center gap-1 mt-0.5 ${isActive ? 'text-green-500' : 'text-on-surface-variant'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-on-surface-variant'}`}></div>
                      {isActive ? 'Connected' : 'Offline'}
                    </div>
                  </div>
                </div>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input 
                      className="sr-only toggle-checkbox" 
                      type="checkbox" 
                      checked={isActive} 
                      onChange={() => {}} // Typically would toggle connection status
                    />
                    <div className={`block w-10 h-5 rounded-full border transition-colors duration-200 ease-in-out toggle-label relative ${isActive ? 'bg-electric-indigo border-electric-indigo' : 'bg-surface-container-high border-slate-border'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${isActive ? 'left-0.5 translate-x-4 bg-paper-white' : 'left-0.5 bg-on-surface-variant'}`}></div>
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex flex-col gap-2 pt-3 border-t border-slate-border">
                <span className="font-label-caps text-label-caps text-on-surface-variant">Integration Mode</span>
                <div className="flex p-1 bg-surface-container-high rounded border border-slate-border">
                  <button
                    onClick={() => toggleMode(integration.id, integration.mode)}
                    className={`flex-1 py-1 px-2 text-center font-mono-data text-[11px] rounded transition-colors ${
                      integration.mode === 'Automated'
                        ? 'mode-switch-active border border-outline-variant'
                        : 'mode-switch-inactive border border-transparent'
                    }`}
                  >
                    Fully Automated
                  </button>
                  <button
                    onClick={() => toggleMode(integration.id, integration.mode)}
                    className={`flex-1 py-1 px-2 text-center font-mono-data text-[11px] rounded transition-colors ${
                      integration.mode === 'Manual'
                        ? 'mode-switch-active border border-outline-variant'
                        : 'mode-switch-inactive border border-transparent'
                    }`}
                  >
                    Manual Discovery
                  </button>
                </div>
                <div className="font-mono-data text-[10px] text-on-surface-variant mt-1">
                  {integration.mode === 'Automated' ? 'Automatic link retrieval & API injection active.' : 'Scanning for product data, commission rates & conv. quality.'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
