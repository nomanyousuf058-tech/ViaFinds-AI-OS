'use client';

import React, { useState, useEffect } from 'react';

interface AutomationSettings {
  master: boolean;
  mode: string;
  stages: Record<string, boolean>;
  socialPlatforms?: Record<string, string>;
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export default function AutomationControl() {
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [systemStatus, setSystemStatus] = useState('Idle');
  const [queueStats, setQueueStats] = useState({ pending: 0, running: 0, completed: 0, failed: 0 });
  const [runStatus, setRunStatus] = useState<Record<string, any>>({}); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/automation/status');
        const data = await res.json();
        setSystemStatus(data.status);
        if (data.queueStats) setQueueStats(data.queueStats);
        if (data.runStatus) setRunStatus(data.runStatus);
        if (data.settings && !isSaving) {
          setSettings(data.settings);
        }
      } catch (e) {}
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [isSaving]);

  const saveSettings = async (newSettings: AutomationSettings) => {
    setSettings(newSettings);
    setIsSaving(true);
    try {
      await fetch('/api/automation/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
    } catch (e) {} finally {
      setIsSaving(false);
    }
  };

  const handleMasterToggle = () => {
    if (!settings) return;
    saveSettings({ ...settings, master: !settings.master });
  };

  const handleModeChange = (mode: string) => {
    if (!settings) return;
    saveSettings({ ...settings, mode });
  };

  const handleStageToggle = (stage: string) => {
    if (!settings) return;
    saveSettings({
      ...settings,
      stages: { ...settings.stages, [stage]: !settings.stages[stage] }
    });
  };

  const handleRun = async () => {
    await fetch('/api/automation/run', { method: 'POST' });
    setSystemStatus('RUNNING');
  };

  const handleStop = async () => {
    await fetch('/api/automation/stop', { method: 'POST' });
    setSystemStatus('STOPPING');
  };

  if (!settings) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MASTER AUTOMATION */}
        <div className="col-span-1 lg:col-span-2 bg-white border border-[#c5c5d7] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[20px] font-semibold text-[#131b2e]">MASTER AUTOMATION</h2>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold tracking-[0.05em] text-[#757686] uppercase">SYSTEM STATUS</span>
                <div className={`w-2 h-2 rounded-full ${systemStatus === 'RUNNING' ? 'bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.8)]' : systemStatus === 'STOPPING' ? 'bg-[#ba1a1a]' : 'bg-[#757686]'}`}></div>
              </div>
            </div>
            <p className="text-[14px] text-[#444655] mb-6">Global override controls for the entire ViaFinds intelligence and publishing pipeline.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative inline-block w-12 h-6 mr-4 align-middle select-none transition duration-200 ease-in">
              <input
                type="checkbox"
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 border-[#757686] appearance-none cursor-pointer checked:bg-white checked:border-[#0426be]"
                checked={settings.master}
                onChange={handleMasterToggle}
              />
              <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${settings.master ? 'bg-[#0426be]' : 'bg-[#757686]'}`}></label>
            </div>
            <button 
              onClick={handleRun}
              disabled={systemStatus === 'RUNNING'}
              className="bg-[#10B981] text-white text-[12px] font-semibold tracking-[0.05em] uppercase px-6 py-2 rounded flex-1 lg:flex-none shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              RUN SEQUENCE
            </button>
            <button 
              onClick={handleStop}
              className="bg-[#ba1a1a] text-white text-[12px] font-semibold tracking-[0.05em] uppercase px-6 py-2 rounded flex-1 lg:flex-none shadow-sm hover:opacity-90"
            >
              SAFE STOP
            </button>
          </div>
        </div>

        {/* AUTOMATION MODES */}
        <div className="col-span-1 bg-white border border-[#c5c5d7] rounded-xl p-6">
          <h2 className="text-[20px] font-semibold text-[#131b2e] mb-4">AUTOMATION MODES</h2>
          <div className="space-y-2">
            {['FULL AUTOMATION', 'DISCOVERY ONLY', 'RESEARCH ONLY', 'LIST ONLY', 'MANUAL PROCESSING', 'CONTENT ONLY'].map((mode) => (
              <label key={mode} className="flex items-center gap-3 p-2 rounded hover:bg-[#f2f3ff] cursor-pointer border border-transparent hover:border-[#c5c5d7] transition-colors">
                <input
                  type="radio"
                  name="mode"
                  checked={settings.mode === mode}
                  onChange={() => handleModeChange(mode)}
                  className="text-[#006a61] focus:ring-[#006a61] w-4 h-4 border-[#757686]"
                />
                <span className={`text-[14px] ${settings.mode === mode ? 'font-semibold text-[#131b2e]' : 'text-[#444655]'}`}>{mode}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* PIPELINE CONFIGURATION */}
      <div>
        <div className="mb-4">
          <h2 className="text-[20px] font-semibold text-[#131b2e]">PIPELINE CONFIGURATION</h2>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white border border-[#c5c5d7] rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f2f3ff] border-b border-[#c5c5d7]">
                  <th className="text-[12px] font-semibold tracking-[0.05em] text-[#444655] p-4 py-3 w-16 text-center">STATE</th>
                  <th className="text-[12px] font-semibold tracking-[0.05em] text-[#444655] p-4 py-3 w-48">STAGE</th>
                  <th className="text-[12px] font-semibold tracking-[0.05em] text-[#444655] p-4 py-3">STATUS</th>
                  <th className="text-[12px] font-semibold tracking-[0.05em] text-[#444655] p-4 py-3 text-right">METRICS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5c5d7]">
                {[
                  { id: 'trendDiscovery', label: 'TREND DISCOVERY' },
                  { id: 'affiliateDiscovery', label: 'AFFILIATE DISCOVERY' },
                  { id: 'productDiscovery', label: 'PRODUCT DISCOVERY' },
                  { id: 'productProcessing', label: 'PRODUCT PROCESSING' },
                  { id: 'articleGeneration', label: 'ARTICLE GENERATION' },
                  { id: 'seo', label: 'SEO' },
                  { id: 'imageGeneration', label: 'IMAGE GENERATION' },
                  { id: 'videoGeneration', label: 'VIDEO GENERATION' },
                  { id: 'socialContent', label: 'SOCIAL CONTENT' },
                  { id: 'publishing', label: 'PUBLISHING' },
                ].map((stage) => {
                  const isActive = settings.stages[stage.id] === true;
                  return (
                    <tr key={stage.id} className={`hover:bg-[#f1f5f9] transition-colors group ${!isActive ? 'opacity-75' : ''}`}>
                      <td className="p-4 text-center">
                        <div className="relative inline-block w-8 h-4 align-middle select-none">
                          <input
                            type="checkbox"
                            className="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-2 border-[#757686] appearance-none cursor-pointer checked:bg-white checked:border-[#006a61]"
                            checked={isActive}
                            onChange={() => handleStageToggle(stage.id)}
                          />
                          <label className={`block overflow-hidden h-4 rounded-full cursor-pointer ${isActive ? 'bg-[#006a61]' : 'bg-[#757686]'}`}></label>
                        </div>
                      </td>
                      <td className={`p-4 font-mono text-[13px] font-semibold ${!isActive ? 'text-[#757686] line-through' : 'text-[#131b2e]'}`}>{stage.label}</td>
                      <td className="p-4">
                        {isActive && systemStatus === 'RUNNING' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-[#e2e7ff] text-[#131b2e]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#006a61] shadow-[0_0_4px_rgba(0,106,97,0.5)]"></span> Running
                          </span>
                        ) : isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border border-[#c5c5d7] text-[#444655]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#757686]"></span> Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-[#eaedff] text-[#444655]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#757686]"></span> Disabled
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-4 font-mono text-xs text-[#444655]">
                          <span title="Queue">Q: {isActive ? queueStats.pending : 0}</span>
                          <span className="text-[#131b2e]" title="Errors">E: 0</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* SOCIAL PLATFORMS */}
          <div className="xl:col-span-1 bg-white border border-[#c5c5d7] rounded-xl p-6">
            <h2 className="text-[14px] font-semibold text-[#131b2e] mb-4">SOCIAL PLATFORMS TARGETING</h2>
            <div className="space-y-3">
              {['pinterest', 'instagram', 'facebook', 'x', 'tiktok', 'youtube'].map(platform => {
                const isEnabled = settings.socialPlatforms && settings.socialPlatforms[platform] === 'ON';
                return (
                  <div key={platform} className="flex justify-between items-center p-3 border border-[#c5c5d7] rounded-lg bg-[#faf8ff] hover:border-[#0426be] transition-colors">
                    <span className="font-semibold text-[#131b2e] capitalize">{platform}</span>
                    <div className="relative inline-block w-8 h-4 align-middle select-none">
                      <input
                        type="checkbox"
                        className="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-2 border-[#757686] appearance-none cursor-pointer checked:bg-white checked:border-[#006a61]"
                        checked={isEnabled}
                        onChange={() => {
                          const newStatus = isEnabled ? 'OFF' : 'ON';
                          saveSettings({
                            ...settings,
                            socialPlatforms: {
                              ...settings.socialPlatforms,
                              [platform]: newStatus
                            }
                          });
                        }}
                      />
                      <label className={`block overflow-hidden h-4 rounded-full cursor-pointer ${isEnabled ? 'bg-[#006a61]' : 'bg-[#757686]'}`}></label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
