'use client'

import React, { useEffect, useState } from 'react'

type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying'

type JobRecord = {
  id: string
  type: string
  stage: string
  content_type?: string
  status: JobStatus
  provider?: string
  model?: string
  error?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/automation/queue').then((res) => res.json()),
      fetch('/api/admin/optimization', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentId: 'warmup' }) }).catch(() => ({})),
    ])
      .then(([queueData]) => {
        setJobs(queueData.items || queueData || [])
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const statusCounts = jobs.reduce(
    (acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
          <div className="max-w-6xl">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">Jobs</h1>
        <p className="font-ui-body text-ui-body text-on-surface-variant mb-8">Monitor all automation and optimization jobs.</p>

        {error && <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded text-red-400 font-ui-body text-sm">{error}</div>}

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          {['queued', 'running', 'completed', 'failed', 'cancelled', 'retrying'].map((status) => (
            <div key={status} className="bg-obsidian-deep border border-slate-border rounded p-4">
              <div className="font-mono-data text-mono-data text-xs text-on-surface-variant uppercase mb-1">{status}</div>
              <div className="font-headline-lg text-headline-lg-mobile text-on-background">{statusCounts[status] || 0}</div>
            </div>
          ))}
        </div>

        <div className="bg-obsidian-deep border border-slate-border rounded">
          <div className="px-4 py-3 border-b border-slate-border">
            <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold">All Jobs</h2>
          </div>
          {loading ? (
            <div className="p-4 text-on-surface-variant font-ui-body">Loading...</div>
          ) : jobs.length === 0 ? (
            <div className="p-4 text-on-surface-variant font-ui-body">No jobs available.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-border">
                  <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">ID</th>
                  <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Type</th>
                  <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Stage</th>
                  <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Status</th>
                  <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Provider</th>
                  <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Created</th>
                </tr>
              </thead>
              <tbody>
                {jobs.slice(0, 100).map((job) => (
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
      )
}
