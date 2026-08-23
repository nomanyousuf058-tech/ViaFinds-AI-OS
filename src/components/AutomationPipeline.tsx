'use client';

import { useState } from 'react';
import { AutomationLog } from '@/lib/supabase';

const DEFAULT_STEPS = [
  'Research & Keyword Discovery',
  'Competitor Gap Analysis',
  'AI Content Structuring',
  'Google E-E-A-T Quality Gate',
  'Smart Link Insertion'
];

export default function AutomationPipeline({ initialLogs }: { initialLogs: AutomationLog[] }) {
  // Map logs to steps
  const initialSteps = DEFAULT_STEPS.map(stepName => {
    const log = initialLogs.find(l => l.step_name === stepName);
    let status: 'completed' | 'active' | 'pending' = 'pending';
    if (log) {
      status = log.status as any;
    }
    return { name: stepName, status };
  });

  const [steps, setSteps] = useState(initialSteps);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runWorkflow = async () => {
    setRunning(true);
    setProgress(0);
    setResult(null);
    setError(null);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setRunning(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    try {
      const res = await fetch('/api/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepName: 'AI Content Structuring',
          contentDraft: 'Sample draft content for optimization via Gemini API.',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Workflow failed');
      }

      setResult(data.improvedContent || 'Workflow completed successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setRunning(false);
      clearInterval(interval);
    }
  };

  return (
    <div className="space-y-8">
      <section className="bg-charcoal border border-slate-border rounded-lg p-8 flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#2E2E2E 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <div className="relative z-10 flex justify-between items-center mb-16">
          <h3 className="font-ui-body text-ui-body font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-electric-indigo">account_tree</span> Active Pipeline
          </h3>
          <button
            onClick={runWorkflow}
            disabled={running}
            className="px-6 py-2 rounded-DEFAULT font-label-caps text-label-caps bg-electric-indigo text-paper-white hover:bg-inverse-primary transition-colors flex items-center gap-2 font-bold disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">{running ? 'sync' : 'play_arrow'}</span> 
            {running ? 'Running...' : 'Run Workflow'}
          </button>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center mb-8">
          <div className="relative flex justify-between items-start w-full max-w-4xl mx-auto">
            {/* Connecting Line */}
            <div className="absolute top-[4px] left-0 w-full h-[1px] bg-slate-border -z-10">
              <div className="h-full bg-electric-indigo transition-all duration-1000" style={{ width: `${progress}%` }}></div>
            </div>

            {steps.map((step, index) => {
              const isCompleted = step.status === 'completed';
              const isActive = step.status === 'active';
              
              return (
                <div key={index} className={`flex flex-col items-center gap-3 w-1/5 ${isCompleted || isActive ? '' : 'opacity-50'}`}>
                  <div className={`w-[9px] h-[9px] rounded-full ring-4 ring-charcoal ${
                    isActive ? 'bg-electric-indigo animate-pulse' : isCompleted ? 'bg-electric-indigo' : 'bg-slate-border'
                  }`}></div>
                  <div className="text-center">
                    <div className={`font-label-caps text-label-caps mb-1 ${isCompleted || isActive ? (isActive ? 'text-on-surface font-bold' : 'text-primary') : 'text-on-surface-variant'}`}>
                      {step.name.split(' ')[0]}
                    </div>
                    <div className={`font-mono-data text-mono-data max-w-[120px] mx-auto leading-tight ${isCompleted ? 'text-on-surface-variant opacity-80' : isActive ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                      {step.name.substring(step.name.indexOf(' ') + 1)}
                    </div>
                    
                    <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${isCompleted ? 'bg-surface-container-high border border-slate-border' : isActive ? '' : 'border border-slate-border'}`}>
                      {isCompleted ? (
                        <>
                          <span className="material-symbols-outlined text-[14px] text-green-400">check_circle</span>
                          <span className="font-mono-data text-[11px] font-bold text-on-surface">Done</span>
                        </>
                      ) : isActive ? (
                        <>
                          <span className="material-symbols-outlined text-[14px] text-electric-indigo animate-spin">sync</span>
                          <span className="font-mono-data text-[11px] text-on-surface-variant">Processing...</span>
                        </>
                      ) : (
                        <span className="font-mono-data text-[11px] text-on-surface-variant">Pending</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {result && (
          <div className="relative z-10 mt-8 bg-surface-container-lowest border border-slate-border rounded-lg p-4">
            <p className="text-[10px] font-label-caps text-green-400 mb-1">Workflow Result:</p>
            <p className="text-sm font-ui-body text-on-surface mt-1">{result}</p>
          </div>
        )}

        {error && (
          <div className="relative z-10 mt-8 bg-surface-container-lowest border border-error-container rounded-lg p-4">
            <p className="text-[10px] font-label-caps text-error mb-1">Error:</p>
            <p className="text-sm font-ui-body text-on-surface mt-1">{error}</p>
          </div>
        )}
      </section>
    </div>
  );
}
