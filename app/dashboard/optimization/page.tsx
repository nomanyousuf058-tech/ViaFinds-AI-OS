'use client'

import React, { useState } from 'react'

type OptimizationType = 'seo' | 'geo' | 'aeo'
type JobStatus = 'idle' | 'running' | 'completed' | 'failed'

interface JobResult {
  id: string
  type: OptimizationType
  status: JobStatus
  score?: number
  findings?: Array<{
    category: string
    severity: string
    message: string
    recommendation: string
    confidence: number
  }>
  proposedChanges?: Array<{
    field: string
    currentValue?: string
    proposedValue: string
    reason: string
    autoApplicable: boolean
  }>
  summary?: string
  error?: string
}

export default function OptimizationPage() {
  const [contentId, setContentId] = useState('')
  const [job, setJob] = useState<JobResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const runOptimization = async (type: OptimizationType) => {
    if (!contentId.trim()) return
    setIsRunning(true)
    setJob({
      id: `opt_${Date.now()}`,
      type,
      status: 'running',
    })

    try {
      const response = await fetch('/api/admin/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, contentId: contentId.trim() }),
      })

      const data = await response.json()
      if (data.job) {
        setJob({
          id: data.job.id,
          type: data.job.type,
          status: data.job.status,
          score: data.job.score,
          findings: data.job.findings,
          proposedChanges: data.job.proposedChanges,
          summary: data.job.auditLog?.[data.job.auditLog.length - 1]?.details,
        })
      } else {
        setJob({
          id: `opt_${Date.now()}`,
          type,
          status: 'failed',
          error: data.error || 'Unknown error',
        })
      }
    } catch (error) {
      setJob({
        id: `opt_${Date.now()}`,
        type,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Network error',
      })
    } finally {
      setIsRunning(false)
    }
  }

  const runAll = async () => {
    if (!contentId.trim()) return
    setIsRunning(true)
    setJob({
      id: `opt_${Date.now()}`,
      type: 'seo',
      status: 'running',
    })

    try {
      const response = await fetch('/api/admin/optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: contentId.trim() }),
      })

      const data = await response.json()
      if (data.seo) {
        setJob({
          id: data.contentId,
          type: 'seo',
          status: 'completed',
          score: data.combinedScore,
          findings: [...data.seo.findings, ...data.geo.findings, ...data.aeo.findings],
          proposedChanges: [...data.seo.proposedChanges, ...data.geo.proposedChanges, ...data.aeo.proposedChanges],
          summary: `Combined score: ${data.combinedScore}/100. ${data.totalFindings} findings. ${data.totalProposedChanges} proposed changes.`,
        })
      } else {
        setJob({
          id: `opt_${Date.now()}`,
          type: 'seo',
          status: 'failed',
          error: data.error || 'Unknown error',
        })
      }
    } catch (error) {
      setJob({
        id: `opt_${Date.now()}`,
        type: 'seo',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Network error',
      })
    } finally {
      setIsRunning(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-400'
      case 'warning': return 'text-yellow-400'
      default: return 'text-blue-400'
    }
  }

  return (
          <div className="max-w-4xl">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">
          Content Optimization
        </h1>
        <p className="font-ui-body text-ui-body text-on-surface-variant mb-8">
          Run SEO, GEO, and AEO analysis on editorial content. All actions are analyze-only by default.
        </p>

        <div className="bg-obsidian-deep border border-slate-border rounded p-6 mb-8">
          <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-2">
            Content ID or Slug
          </label>
          <input
            type="text"
            value={contentId}
            onChange={(e) => setContentId(e.target.value)}
            placeholder="Enter article slug or ID..."
            className="w-full px-4 py-2.5 bg-surface-container border border-slate-border rounded font-mono-data text-mono-data text-on-background placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => runOptimization('seo')}
            disabled={isRunning || !contentId.trim()}
            className="px-5 py-2.5 bg-primary text-deep-navy font-label-caps text-label-caps font-bold rounded hover:bg-inverse-primary hover:text-white transition-colors disabled:opacity-40"
          >
            Run SEO
          </button>
          <button
            onClick={() => runOptimization('geo')}
            disabled={isRunning || !contentId.trim()}
            className="px-5 py-2.5 border border-slate-border text-on-surface font-label-caps text-label-caps font-bold rounded hover:bg-surface-container-high transition-colors disabled:opacity-40"
          >
            Run GEO
          </button>
          <button
            onClick={() => runOptimization('aeo')}
            disabled={isRunning || !contentId.trim()}
            className="px-5 py-2.5 border border-slate-border text-on-surface font-label-caps text-label-caps font-bold rounded hover:bg-surface-container-high transition-colors disabled:opacity-40"
          >
            Run AEO
          </button>
          <button
            onClick={runAll}
            disabled={isRunning || !contentId.trim()}
            className="px-5 py-2.5 bg-electric-indigo text-paper-white font-label-caps text-label-caps font-bold rounded hover:bg-opacity-90 transition-colors disabled:opacity-40"
          >
            Run All Analysis
          </button>
        </div>

        {job && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                  Job {job.id}
                </span>
                <h3 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mt-1">
                  {job.type.toUpperCase()} Analysis
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {job.score !== undefined && (
                  <span className="font-mono-data text-mono-data text-2xl font-bold text-primary">
                    {job.score}/100
                  </span>
                )}
                <span className={`px-3 py-1 rounded font-mono-data text-mono-data text-xs uppercase tracking-wider ${
                  job.status === 'completed' ? 'bg-primary/20 text-primary' :
                  job.status === 'running' ? 'bg-tertiary/20 text-tertiary' :
                  job.status === 'failed' ? 'bg-error/20 text-error' :
                  'bg-surface-container text-on-surface-variant'
                }`}>
                  {job.status}
                </span>
              </div>
            </div>

            {job.summary && (
              <p className="font-ui-body text-ui-body text-on-surface-variant">
                {job.summary}
              </p>
            )}

            {job.error && (
              <div className="bg-error/10 border border-error/30 rounded p-4">
                <p className="font-ui-body text-ui-body text-error text-sm">
                  {job.error}
                </p>
              </div>
            )}

            {job.findings && job.findings.length > 0 && (
              <div>
                <h4 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-4">
                  Findings ({job.findings.length})
                </h4>
                <div className="space-y-3">
                  {job.findings.map((finding, idx) => (
                    <div key={idx} className="bg-surface-container border border-slate-border rounded p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-mono-data text-mono-data text-xs uppercase tracking-wider ${getSeverityColor(finding.severity)}`}>
                              {finding.severity}
                            </span>
                            <span className="font-mono-data text-mono-data text-on-surface-variant text-xs">
                              {finding.category}
                            </span>
                          </div>
                          <p className="font-ui-body text-ui-body text-on-background text-sm mb-1">
                            {finding.message}
                          </p>
                          <p className="font-ui-body text-ui-body text-on-surface-variant text-xs">
                            {finding.recommendation}
                          </p>
                        </div>
                        <span className="font-mono-data text-mono-data text-on-surface-variant text-xs">
                          {Math.round(finding.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {job.proposedChanges && job.proposedChanges.length > 0 && (
              <div>
                <h4 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-4">
                  Proposed Changes ({job.proposedChanges.length})
                </h4>
                <div className="space-y-3">
                  {job.proposedChanges.map((change, idx) => (
                    <div key={idx} className="bg-surface-container border border-slate-border rounded p-4">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <span className="font-mono-data text-mono-data text-xs uppercase tracking-wider text-primary">
                          {change.field}
                        </span>
                        {change.autoApplicable && (
                          <span className="px-2 py-0.5 bg-primary/20 text-primary font-mono-data text-mono-data text-[10px] rounded">
                            Auto-Applicable
                          </span>
                        )}
                      </div>
                      <p className="font-ui-body text-ui-body text-on-background text-sm mb-1">
                        {change.reason}
                      </p>
                      {change.currentValue && (
                        <p className="font-ui-body text-ui-body text-on-surface-variant text-xs">
                          Current: {change.currentValue}
                        </p>
                      )}
                      <p className="font-ui-body text-ui-body text-primary text-xs mt-1">
                        Proposed: {change.proposedValue}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      )
}
