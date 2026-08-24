'use client'

import React, { useEffect, useState } from 'react'
import DashboardLayout from '@/app/dashboard/layout'

type AutomationStage = 'research' | 'content' | 'seo' | 'geo' | 'aeo' | 'quality' | 'affiliate' | 'publishing'
type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying'

type JobRecord = {
  id: string
  type: string
  stage: AutomationStage
  status: JobStatus
  provider?: string
  model?: string
  error?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
}

export default function AutomationPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/automation/queue')
      .then((res) => res.json())
      .then((data) => {
        setJobs(data.items || data || [])
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const stages: AutomationStage[] = ['research', 'content', 'seo', 'geo', 'aeo', 'quality', 'affiliate', 'publishing']

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">Automation Control Center</h1>
        <p className="font-ui-body text-ui-body text-on-surface-variant mb-8">Monitor and control editorial automation workflows.</p>

        {error && <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded text-red-400 font-ui-body text-sm">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {stages.map((stage) => {
            const stageJobs = jobs.filter((j) => j.stage === stage)
            const running = stageJobs.filter((j) => j.status === 'running').length
            const failed = stageJobs.filter((j) => j.status === 'failed').length
            const completed = stageJobs.filter((j) => j.status === 'completed').length

            return (
              <div key={stage} className="bg-obsidian-deep border border-slate-border rounded p-4">
                <div className="font-mono-data text-mono-data text-xs text-on-surface-variant uppercase mb-2">{stage}</div>
                <div className="flex gap-4 text-sm font-ui-body">
                  <span className="text-green-400">{completed} done</span>
                  <span className="text-blue-400">{running} running</span>
                  {failed > 0 && <span className="text-red-400">{failed} failed</span>}
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-obsidian-deep border border-slate-border rounded">
          <div className="px-4 py-3 border-b border-slate-border">
            <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold">Recent Jobs</h2>
          </div>
          {loading ? (
            <div className="p-4 text-on-surface-variant font-ui-body">Loading...</div>
          ) : jobs.length === 0 ? (
            <div className="p-4 text-on-surface-variant font-ui-body">No jobs available. Jobs will appear here when automation runs.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-border">
                  <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">ID</th>
                  <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Type</th>
                  <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Stage</th>
                  <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Status</th>
                  <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Provider</th>
                  <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Error</th>
                  <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Created</th>
                </tr>
              </thead>
              <tbody>
                {jobs.slice(0, 50).map((job) => (
                  <tr key={job.id} className="border-b border-slate-border last:border-b-0">
                    <td className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant">{job.id}</td>
                    <td className="px-4 py-3 font-ui-body text-ui-body text-sm text-on-background">{job.type}</td>
                    <td className="px-4 py-3 font-ui-body text-ui-body text-sm text-on-background">{job.stage}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono-data text-mono-data text-xs ${
                        job.status === 'completed' ? 'text-green-400' :
                        job.status === 'running' ? 'text-blue-400' :
                        job.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {job.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-ui-body text-ui-body text-sm text-on-background">{job.provider || '-'}</td>
                    <td className="px-4 py-3 font-ui-body text-ui-body text-sm text-red-400">{job.error || '-'}</td>
                    <td className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
