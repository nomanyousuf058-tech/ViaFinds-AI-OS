'use client';
import React, { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/automation/settings')
      .then(res => res.json())
      .then(data => setSettings(data));
  }, []);

  const handleChange = (section: string, key: string, value: unknown) => {
    setSettings((prev: Record<string, unknown>) => {
      const newSettings = { ...prev };
      ;(newSettings[section] as Record<string, unknown>)[key] = value;
      return newSettings;
    });
  };

  const handleModeChange = (mode: string) => {
    setSettings((prev: Record<string, unknown>) => ({ ...prev, mode }));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await fetch('/api/automation/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      console.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings.stages) return <div className="p-12 text-center">Loading settings...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="font-bold text-[36px] leading-[44px] tracking-[-0.02em] text-[#131b2e]">Settings</h1>
          <p className="text-[16px] text-[#444655] mt-1">Configure global automation behaviors.</p>
        </div>
        <button 
          onClick={saveSettings} 
          disabled={isSaving}
          className="h-10 px-6 bg-[#0426be] text-white rounded font-semibold tracking-[0.05em] transition-colors disabled:opacity-50"
        >
          {isSaving ? 'SAVING...' : saveSuccess ? 'SAVED!' : 'SAVE CHANGES'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="md:col-span-8 space-y-8">
          
          {/* Automation Mode */}
          <section className="bg-white border border-[#c5c5d7] rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#c5c5d7] bg-[#faf8ff]">
              <h2 className="text-[18px] font-semibold text-[#131b2e]">Automation Mode</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['FULL AUTOMATION', 'DISCOVERY ONLY', 'RESEARCH ONLY', 'LIST ONLY', 'MANUAL PROCESSING'].map((mode) => (
                  <label key={mode} className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${settings.mode === mode ? 'border-[#0426be] bg-[#f2f3ff]' : 'border-[#c5c5d7] hover:bg-[#faf8ff]'}`}>
                    <input type="radio" name="mode" className="mt-1 mr-3 w-4 h-4 text-[#0426be]" checked={settings.mode === mode} onChange={() => handleModeChange(mode)} />
                    <div>
                      <span className="block font-medium text-[#131b2e]">{mode}</span>
                      <span className="block text-[12px] text-[#757686] mt-1">
                        {mode === 'FULL AUTOMATION' && 'Run entire end-to-end pipeline.'}
                        {mode === 'DISCOVERY ONLY' && 'Find trends, do not process products.'}
                        {mode === 'RESEARCH ONLY' && 'Research products, do not generate content.'}
                        {mode === 'LIST ONLY' && 'Export raw trend lists only.'}
                        {mode === 'MANUAL PROCESSING' && 'Require manual approval per step.'}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Workflow Stages */}
          <section className="bg-white border border-[#c5c5d7] rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#c5c5d7] bg-[#faf8ff]">
              <h2 className="text-[18px] font-semibold text-[#131b2e]">Workflow Stages</h2>
            </div>
            <div className="p-6 space-y-4">
              {Object.entries(settings.stages).map(([stage, isEnabled]) => (
                <div key={stage} className="flex items-center justify-between py-2 border-b border-[#dae2fd] last:border-0">
                  <div>
                    <span className="font-medium text-[#131b2e] capitalize">{stage.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                  <div className="relative inline-block w-12 h-6 align-middle select-none transition duration-200 ease-in">
                    <input type="checkbox" className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 border-[#757686] appearance-none cursor-pointer checked:bg-white checked:border-[#0426be]" checked={!!isEnabled} onChange={(e) => handleChange('stages', stage, e.target.checked)} />
                    <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${isEnabled ? 'bg-[#0426be]' : 'bg-[#757686]'}`}></label>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Right Column */}
        <div className="md:col-span-4 space-y-8">
          
          {/* Social Platforms */}
          <section className="bg-white border border-[#c5c5d7] rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#c5c5d7] bg-[#faf8ff]">
              <h2 className="text-[18px] font-semibold text-[#131b2e]">Social Platforms</h2>
            </div>
            <div className="p-6 space-y-4">
              {Object.entries(settings.socialPlatforms || {}).map(([platform, status]) => (
                <div key={platform} className="flex items-center justify-between py-2 border-b border-[#dae2fd] last:border-0">
                  <span className="font-medium text-[#131b2e] capitalize">{platform}</span>
                  <select 
                    className="border border-[#c5c5d7] rounded px-2 py-1 text-sm bg-white"
                    value={status as string}
                    onChange={(e) => handleChange('socialPlatforms', platform, e.target.value)}
                  >
                    <option value="ON">ON</option>
                    <option value="OFF">OFF</option>
                  </select>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
