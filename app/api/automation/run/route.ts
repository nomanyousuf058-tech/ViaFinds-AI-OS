/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';
import { workflowRegistry } from '@/workflows/core/WorkflowRegistry';
import { WorkflowType } from '@/workflows/core/types';
import { ProviderLoader } from '@/providers/ProviderLoader';
import { AgentLoader } from '@/agents/core/AgentLoader';
import { WorkflowLoader } from '@/workflows/core/WorkflowLoader';
import { PipelineRunner } from '@/core/automation/PipelineRunner';
import { adminOnly } from '@/lib/auth';
import { createClient } from '@sanity/client';
import fs from 'fs';
import path from 'path';

const getStopSignal = () => { try { const p = path.join(process.cwd(), 'data', 'stop-signal.json'); if (fs.existsSync(p)) { const d = JSON.parse(fs.readFileSync(p, 'utf8')); return d.stopRequested === true; } } catch (e) {} return false; };

const setStopSignal = (val: boolean) => { try { const p = path.join(process.cwd(), 'data', 'stop-signal.json'); fs.writeFileSync(p, JSON.stringify({ stopRequested: val, timestamp: Date.now() })); } catch (e) {} };

const updateRunStatus = (runStatus: string, data: Record<string, unknown> = {}) => { 
  try { 
    const p = path.join(process.cwd(), 'data', 'run-status.json'); 
    const existing = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {}; 
    fs.writeFileSync(p, JSON.stringify({ ...existing, status: runStatus, ...data, updatedAt: new Date().toISOString() }, null, 2)); 
  } catch (e) {} 
};

const clearRunStatus = () => { try { const p = path.join(process.cwd(), 'data', 'run-status.json'); if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {} };

const getSettings = () => {
  try {
    const p = path.join(process.cwd(), 'data', 'automation-settings.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {}
  return { master: false, mode: 'FULL AUTOMATION', stages: {} };
};

const isRunning = () => {
  try {
    const p = path.join(process.cwd(), 'data', 'run-status.json');
    if (fs.existsSync(p)) {
      const status = JSON.parse(fs.readFileSync(p, 'utf8'));
      return status.status === 'running';
    }
  } catch (e) {}
  return false;
};

export async function POST() {
  try { await adminOnly(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  
  const settings = getSettings();
  
  if (!settings.master) {
    return NextResponse.json({ error: 'Master automation is disabled. Enable it in settings first.' }, { status: 400 });
  }

  if (isRunning()) { return NextResponse.json({ error: 'Sequence already running' }, { status: 400 }); }

  try {
    await ProviderLoader.loadProviders();
    await AgentLoader.loadAgents();
    await WorkflowLoader.loadWorkflows();

    const writeClient = createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'e44z7hta',
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
      apiVersion: '2024-01-01',
      token: process.env.SANITY_API_TOKEN,
      useCdn: false,
    });

    const runId = `run-${Date.now()}`;
    
    updateRunStatus('running', { 
      runId,
      startedAt: new Date().toISOString(),
      totalItems: 0, 
      itemsProcessed: 0, 
      itemsFailed: 0, 
      itemsSkipped: 0, 
      currentItem: null, 
      currentStage: 'Initializing',
      mode: settings.mode,
      progress: '0%'
    });

    const context = {
      workflowId: runId,
      dryRun: false,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      settings,
      sanityProjectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      sanityDataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
      sanityToken: process.env.SANITY_API_TOKEN,
      credentials: {},
      partnerLimits: new Map(),
    };

    const runner = new PipelineRunner(context);
    const stopSignal = () => getStopSignal();

    process.nextTick(async () => {
      try {
        const pipelineResult = await runner.run(stopSignal);
        
        let itemsProcessed = 0;
        let itemsFailed = 0;
        
        for (const stepResult of pipelineResult.results) {
          if (stepResult.status === 'success') {
            itemsProcessed++;
          } else {
            itemsFailed++;
          }
        }

        const finalStatus = getStopSignal() ? 'STOPPED' : (itemsFailed > 0 && itemsProcessed === 0 ? 'FAILED' : 'COMPLETED');
        updateRunStatus(finalStatus.toLowerCase(), { 
          completedAt: new Date().toISOString(), 
          status: finalStatus.toLowerCase(), 
          currentItem: null, 
          currentStage: null,
          progress: '100%',
          results: pipelineResult.results.map(r => ({ status: r.status, errors: r.errors }))
        });

        if (getStopSignal()) { setStopSignal(false); }
      } catch (err) {
        updateRunStatus('failed', { error: (err as Error).message, completedAt: new Date().toISOString() });
        if (getStopSignal()) { setStopSignal(false); }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Pipeline started. Check dashboard for live progress.',
      runId,
      status: 'running'
    });
  } catch (err) {
    updateRunStatus('failed', { error: (err as Error).message });
    return NextResponse.json({ error: 'Failed to start pipeline', details: (err as Error).message }, { status: 500 });
  }
}
