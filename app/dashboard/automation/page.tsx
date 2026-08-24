'use client'

import React, { useEffect, useState } from 'react'
import DashboardLayout from '@/app/dashboard/layout'

type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying' | 'awaiting_approval'
type AutomationMode = 'manual' | 'auto' | 'dry_run'
type PipelineStage = 
  | 'discovered'
  | 'researching'
  | 'competitor_analysis'
  | 'content_generating'
  | 'content_refining'
  | 'seo_analysis'
  | 'geo_analysis'
  | 'aeo_analysis'
  | 'quality_gate'
  | 'affiliate_analysis'
  | 'affiliate_matching'
  | 'awaiting_approval'
  | 'publishing'
  | 'published'
  | 'monitoring'
  | 'failed'

const PIPELINE_STAGES: PipelineStage[] = [
  'discovered',
  'researching',
  'competitor_analysis',
  'content_generating',
  'content_refining',
  'seo_analysis',
  'geo_analysis',
  'aeo_analysis',
  'quality_gate',
  'affiliate_analysis',
  'affiliate_matching',
  'awaiting_approval',
  'publishing',
  'published',
  'monitoring',
]

const STAGE_LABELS: Record<PipelineStage, string> = {
  discovered: 'Discovered',
  researching: 'Research',
  competitor_analysis: 'Competitor',
  content_generating: 'Generation',
  content_refining: 'Refinement',
  seo_analysis: 'SEO',
  geo_analysis: 'GEO',
  aeo_analysis: 'AEO',
  quality_gate: 'Quality',
  affiliate_analysis: 'Affiliate',
  affiliate_matching: 'Affiliate Match',
  awaiting_approval: 'Approval',
  publishing: 'Publishing',
  published: 'Published',
  monitoring: 'Monitoring',
  failed: 'Failed',
}

type Job = {
  id: string
  type: string
  status: JobStatus
  currentStage: PipelineStage
  mode: AutomationMode
  topic?: string
  error?: string
  createdAt: string
  updatedAt: string
  result: Record<string, unknown>
}

export default function AutomationPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [topic, setTopic] = useState('')
  const [category, setCategory] = useState('')
  const [mode, setMode] = useState<AutomationMode>('manual')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/automation/run')
      const json = await res.json()
      if (json.success) setJobs(json.data || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleStart = async () => {
    if (!topic.trim()) return
    setStarting(true)
    try {
      const res = await fetch('/api/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'article_generation',
          mode,
          topic,
          category,
          dryRun: mode === 'dry_run',
        }),
      })
      const json = await res.json()
      if (json.success) {
        setTopic('')
        setCategory('')
        await fetchJobs()
      }
    } catch {
      // ignore
    } finally {
      setStarting(false)
    }
  }

  const handleJobAction = async (jobId: string, action: string) => {
    setActionLoading(jobId)
    try {
      const res = await fetch('/api/automation/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action }),
      })
      const json = await res.json()
      if (json.success) await fetchJobs()
    } catch {
      // ignore
    } finally {
      setActionLoading(null)
    }
  }

  const getStageIndex = (stage: PipelineStage) => PIPELINE_STAGES.indexOf(stage)

  const formatMode = (m: string) => {
    switch (m) {
      case 'dry_run': return 'Dry Run'
      case 'auto': return 'Auto'
      default: return 'Manual'
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">Automation Control Center</h1>
        <p className="font-ui-body text-ui-body text-on-surface-variant mb-8">Start and monitor editorial automation workflows.</p>

        <div className="bg-obsidian-deep border border-slate-border rounded p-6 mb-8">
          <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-4">Start New Automation</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block font-mono-data text-mono-data text-xs text-on-surface-variant mb-1">Topic / Keyword</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. best AI writing tools"
                className="w-full bg-surface-container border border-slate-border rounded px-3 py-2 font-ui-body text-ui-body text-sm text-on-background placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block font-mono-data text-mono-data text-xs text-on-surface-variant mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. ai-tools"
                className="w-full bg-surface-container border border-slate-border rounded px-3 py-2 font-ui-body text-ui-body text-sm text-on-background placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block font-mono-data text-mono-data text-xs text-on-surface-variant mb-1">Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as AutomationMode)}
                className="w-full bg-surface-container border border-slate-border rounded px-3 py-2 font-ui-body text-ui-body text-sm text-on-background focus:outline-none focus:border-primary"
              >
                <option value="manual">Manual Approval</option>
                <option value="dry_run">Dry Run</option>
                <option value="auto">Auto Publish</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleStart}
                disabled={starting || !topic.trim()}
                className="w-full px-4 py-2 bg-primary text-deep-navy font-ui-body text-sm font-medium rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {starting ? 'Starting...' : 'Start Automation'}
              </button>
            </div>
          </div>
          <p className="font-mono-data text-mono-data text-xs text-on-surface-variant">
            Manual: stops for approval before publishing. Dry Run: complete pipeline without publishing. Auto: publishes without approval.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-obsidian-deep border border-slate-border rounded">
              <div className="px-4 py-3 border-b border-slate-border">
                <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold">Jobs</h2>
              </div>
              {loading ? (
                <div className="p-4 text-on-surface-variant font-ui-body">Loading...</div>
              ) : jobs.length === 0 ? (
                <div className="p-4 text-on-surface-variant font-ui-body">No jobs yet. Start automation above.</div>
              ) : (
                <div className="divide-y divide-slate-border">
                  {jobs.slice(0, 20).map((job) => (
                    <div key={job.id} className="p-4 hover:bg-surface-container/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-ui-body text-ui-body text-sm text-on-background font-medium">
                            {job.topic || job.type}
                          </div>
                          <div className="font-mono-data text-mono-data text-xs text-on-surface-variant mt-1">
                            {job.id} · {formatMode(job.mode)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-mono-data ${
                            job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            job.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                            job.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                            job.status === 'awaiting_approval' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {job.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {PIPELINE_STAGES.map((stage, idx) => {
                          const currentIdx = getStageIndex(job.currentStage)
                          const isActive = stage === job.currentStage
                          const isPast = currentIdx > idx
                          const isFailed = job.status === 'failed' && isActive
                          return (
                            <div key={stage} className="flex-1 h-1.5 rounded-full bg-slate-border/50 overflow-hidden">
                              <div className={`h-full rounded-full ${
                                isFailed ? 'bg-red-500' :
                                isPast || isActive ? 'bg-primary' : 'bg-transparent'
                              }`} style={{ width: isActive ? '60%' : isPast ? '100%' : '0%' }} />
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono-data text-mono-data text-xs text-on-surface-variant">
                          {STAGE_LABELS[job.currentStage]} · {new Date(job.updatedAt).toLocaleString()}
                        </span>
                        <div className="flex gap-2">
                          {job.status === 'awaiting_approval' && (
                            <>
                              <button
                                onClick={() => handleJobAction(job.id, 'approve')}
                                disabled={actionLoading === job.id}
                                className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-ui-body rounded hover:bg-green-500/30 disabled:opacity-50 transition-colors"
                              >
                                {actionLoading === job.id ? 'Processing...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleJobAction(job.id, 'reject')}
                                disabled={actionLoading === job.id}
                                className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-ui-body rounded hover:bg-red-500/30 disabled:opacity-50 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {job.status === 'failed' && (
                            <button
                              onClick={() => handleJobAction(job.id, 'retry')}
                              disabled={actionLoading === job.id}
                              className="px-3 py-1 bg-primary/20 text-primary text-xs font-ui-body rounded hover:bg-primary/30 disabled:opacity-50 transition-colors"
                            >
                              Retry
                            </button>
                          )}
                          {(job.status === 'queued' || job.status === 'running') && (
                            <button
                              onClick={() => handleJobAction(job.id, 'cancel')}
                              disabled={actionLoading === job.id}
                              className="px-3 py-1 bg-slate-500/20 text-slate-400 text-xs font-ui-body rounded hover:bg-slate-500/30 disabled:opacity-50 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedJob(job)}
                            className="px-3 py-1 bg-surface-container text-on-background text-xs font-ui-body rounded hover:bg-surface-container/80 transition-colors"
                          >
                            View
                          </button>
                        </div>
                      </div>
                      {job.error && (
                        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs font-mono-data">
                          {job.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="bg-obsidian-deep border border-slate-border rounded p-4 mb-6">
              <h3 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-3">Pipeline Status</h3>
              <div className="space-y-2">
                {PIPELINE_STAGES.map((stage) => {
                  const activeJobs = jobs.filter(j => j.currentStage === stage && (j.status === 'running' || j.status === 'awaiting_approval'))
                  return (
                    <div key={stage} className="flex items-center justify-between">
                      <span className="font-ui-body text-ui-body text-sm text-on-surface-variant">{STAGE_LABELS[stage]}</span>
                      {activeJobs.length > 0 && (
                        <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-mono-data rounded">{activeJobs.length}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {selectedJob && (
              <div className="bg-obsidian-deep border border-slate-border rounded p-4">
                <h3 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-3">Job Details</h3>
                <div className="space-y-2 text-sm font-ui-body">
                  <div>
                    <span className="text-on-surface-variant">Topic:</span>
                    <span className="text-on-background ml-2">{selectedJob.topic || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant">Status:</span>
                    <span className="text-on-background ml-2">{selectedJob.status}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant">Stage:</span>
                    <span className="text-on-background ml-2">{STAGE_LABELS[selectedJob.currentStage]}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant">Mode:</span>
                    <span className="text-on-background ml-2">{formatMode(selectedJob.mode)}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant">Created:</span>
                    <span className="text-on-background ml-2">{new Date(selectedJob.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                {(selectedJob.result.research && typeof selectedJob.result.research === 'object') ? (
                  <div className="mt-4" key="research">
                    <h4 className="font-mono-data text-mono-data text-xs text-on-surface-variant uppercase mb-2">Research</h4>
                    <pre className="text-xs font-mono-data text-on-background bg-surface-container p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(selectedJob.result.research as unknown as Record<string, unknown>, null, 2)}
                    </pre>
                  </div>
                ) : null}
                {(selectedJob.result.draft && typeof selectedJob.result.draft === 'object') ? (
                  <div className="mt-4" key="draft">
                    <h4 className="font-mono-data text-mono-data text-xs text-on-surface-variant uppercase mb-2">Draft</h4>
                    <pre className="text-xs font-mono-data text-on-background bg-surface-container p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(selectedJob.result.draft as unknown as Record<string, unknown>, null, 2)}
                    </pre>
                  </div>
                ) : null}
                {(selectedJob.result.affiliateDecision && typeof selectedJob.result.affiliateDecision === 'object') ? (
                  <div className="mt-4" key="affiliate">
                    <h4 className="font-mono-data text-mono-data text-xs text-on-surface-variant uppercase mb-2">Affiliate Decision</h4>
                    <pre className="text-xs font-mono-data text-on-background bg-surface-container p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(selectedJob.result.affiliateDecision as unknown as Record<string, unknown>, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
