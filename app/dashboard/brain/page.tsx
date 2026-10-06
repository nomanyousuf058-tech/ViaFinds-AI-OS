'use client'

import React, { useEffect, useState, useCallback } from 'react'

const TASK_TYPES = [
  'Content Strategy Research',
  'Competitor Research',
  'Market Research',
  'SEO Audit',
  'Product Opportunity Research',
  'Owned Product Research',
  'Affiliate Product Research',
  'Technology Watch',
  'Website Audit',
  'Revenue Audit',
  'Business Model Review',
  'Find Missing Features',
  'Find Improvement Opportunities',
  'Strategy Review',
]

type Tab = 'overview' | 'tasks' | 'strategies' | 'opportunities' | 'research' | 'executions' | 'quality' | 'approvals' | 'decisions' | 'requests' | 'memory' | 'activity'

export default function BrainPage() {
  const [tab, setTab] = useState<Tab>('overview')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [status, setStatus] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reports, setReports] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tasks, setTasks] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [strategies, setStrategies] = useState<any[]>([])
  const [strategiesV2, setStrategiesV2] = useState<any[]>([])
  const [opportunities, setOpportunities] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [implRequests, setImplRequests] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [executions, setExecutions] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [memory, setMemory] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activity, setActivity] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [decisions, setDecisions] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [waking, setWaking] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [runningTask, setRunningTask] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [executionPlan, setExecutionPlan] = useState<any>(null)
  const [executingPlan, setExecutingPlan] = useState(false)

  // New task form
  const [newTaskType, setNewTaskType] = useState(TASK_TYPES[0])
  const [newTaskGoal, setNewTaskGoal] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState('normal')
  const [creatingTask, setCreatingTask] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, reportsRes, tasksRes, strategiesRes, oppsRes, irRes, execsRes, memRes, actRes, decRes, strategiesV2Res] = await Promise.all([
        fetch('/api/brain/status'),
        fetch('/api/brain/reports'),
        fetch('/api/brain/tasks'),
        fetch('/api/brain/strategies'),
        fetch('/api/brain/opportunities'),
        fetch('/api/brain/implementation-requests'),
        fetch('/api/brain/executions'),
        fetch('/api/brain/memory'),
        fetch('/api/brain/activity'),
        fetch('/api/brain/decisions'),
        fetch('/api/brain/strategies?v2=true'),
      ])
      const [statusJ, reportsJ, tasksJ, strategiesJ, oppsJ, irJ, execsJ, memJ, actJ, decJ, strategiesV2J] = await Promise.all([
        statusRes.json(), reportsRes.json(), tasksRes.json(), strategiesRes.json(), oppsRes.json(), irRes.json(), execsRes.json(), memRes.json(), actRes.json(), decRes.json(), strategiesV2Res.json(),
      ])
      if (statusJ.success) setStatus(statusJ.status)
      if (reportsJ.success) setReports(reportsJ.reports)
      if (tasksJ.success) setTasks(tasksJ.tasks)
      if (strategiesJ.success) setStrategies(strategiesJ.strategies)
      if (strategiesV2J.success) setStrategiesV2(strategiesV2J.strategies || [])
      if (oppsJ.success) setOpportunities(oppsJ.opportunities)
      if (irJ.success) setImplRequests(irJ.requests)
      if (execsJ.success) setExecutions(execsJ.executions)
      if (memJ.success) setMemory(memJ.memory)
      if (actJ.success) setActivity(actJ.activity)
      if (decJ.success) setDecisions(decJ.decisions || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleWakeBrain = async () => {
    setWaking(true)
    try {
      await fetch('/api/brain/wake', { method: 'POST' })
      await fetchAll()
    } catch { /* ignore */ } finally { setWaking(false) }
  }

  const handleCreateTask = async () => {
    if (!newTaskGoal.trim()) return
    setCreatingTask(true)
    try {
      await fetch('/api/brain/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newTaskType, title: newTaskType, goal: newTaskGoal, priority: newTaskPriority }),
      })
      setNewTaskGoal('')
      await fetchAll()
    } catch { /* ignore */ } finally { setCreatingTask(false) }
  }

  const handleRunTask = async (taskId: string) => {
    setRunningTask(taskId)
    try {
      const res = await fetch(`/api/brain/tasks/${taskId}`, { method: 'POST' })
      const json = await res.json()
      if (json.success) setSelectedTask(json)
      await fetchAll()
    } catch { /* ignore */ } finally { setRunningTask(null) }
  }

  const handleStrategyAction = async (strategyId: string, action: 'approve' | 'reject') => {
    try {
      await fetch(`/api/brain/strategies/${strategyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      await fetchAll()
    } catch { /* ignore */ }
  }

  const handleGeneratePlan = async (taskId: string) => {
    try {
      const res = await fetch(`/api/brain/tasks/${taskId}/execute`)
      const json = await res.json()
      if (json.success) setExecutionPlan(json.plan)
    } catch { /* ignore */ }
  }

  const handleExecutePlan = async (taskId: string) => {
    setExecutingPlan(true)
    try {
      await fetch(`/api/brain/tasks/${taskId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: executionPlan }),
      })
      setExecutionPlan(null)
      setSelectedTask(null)
      await fetchAll()
    } catch { /* ignore */ } finally { setExecutingPlan(false) }
  }

  const latestReport = reports[0]

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: 'dashboard' },
    { id: 'tasks' as Tab, label: 'Tasks', icon: 'task_alt' },
    { id: 'strategies' as Tab, label: 'Strategies', icon: 'strategy' },
    { id: 'opportunities' as Tab, label: 'Opportunities', icon: 'tips_and_updates' },
    { id: 'research' as Tab, label: 'Research', icon: 'search' },
    { id: 'executions' as Tab, label: 'Executions', icon: 'play_arrow' },
    { id: 'quality' as Tab, label: 'Quality', icon: 'verified' },
    { id: 'approvals' as Tab, label: 'Approvals', icon: 'how_to_reg' },
    { id: 'decisions' as Tab, label: 'Decisions', icon: 'gavel' },
    { id: 'requests' as Tab, label: 'Implementation', icon: 'build' },
    { id: 'memory' as Tab, label: 'Memory', icon: 'memory' },
    { id: 'activity' as Tab, label: 'Activity', icon: 'history' },
  ]

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">AI BRAIN</h1>
        <p className="font-ui-body text-ui-body text-on-surface-variant">
          Strategic Intelligence — Observe, Analyze, Propose
        </p>
      </div>

      {/* Tabs */}
      <div className="flex mb-6 border-b border-slate-border">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-3 font-ui-body text-sm font-medium uppercase tracking-wider transition-colors relative ${tab === t.id ? 'text-primary' : 'text-on-surface-variant hover:text-on-background'}`}>
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">{t.icon}</span>
              {t.label}
            </span>
            {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        ))}
      </div>

      {/* ═══════════ OVERVIEW TAB ═══════════ */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status */}
            <div className="bg-obsidian-deep border border-slate-border rounded-lg p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-3xl">psychology</span>
                </div>
                <div>
                  <h2 className="font-headline-lg text-lg text-on-background font-bold">Brain Status</h2>
                  <p className="font-mono-data text-xs text-green-400">● {status?.mode || 'Loading...'}</p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between"><span className="text-xs text-on-surface-variant">Version</span><span className="text-xs text-on-background font-medium">{status?.version}</span></div>
                <div className="flex justify-between"><span className="text-xs text-on-surface-variant">Active Strategies</span><span className="text-xs text-on-background font-medium">{status?.activeStrategies ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-xs text-on-surface-variant">Open Opportunities</span><span className="text-xs text-on-background font-medium">{status?.openOpportunities ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-xs text-on-surface-variant">Active Tasks</span><span className="text-xs text-on-background font-medium">{status?.activeTasks ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-xs text-on-surface-variant">Pending Approvals</span><span className="text-xs text-primary font-medium">{status?.pendingApprovals ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-xs text-on-surface-variant">AI Providers</span><span className="text-xs text-on-background font-medium">{status?.providersConfigured ?? 0} configured</span></div>
              </div>
              <button onClick={handleWakeBrain} disabled={waking}
                className="w-full py-3 bg-primary text-deep-navy font-bold text-sm uppercase tracking-wider rounded shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {waking ? <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-lg">bolt</span>}
                WAKE BRAIN
              </button>
            </div>

            {/* Data Sources & Providers */}
            <div className="bg-obsidian-deep border border-slate-border rounded-lg p-6 lg:col-span-2">
              <h2 className="font-headline-lg text-lg text-on-background font-bold mb-4">Data Sources & AI Providers</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {status?.dataSources && Object.entries(status.dataSources).map(([key, value]) => {
                  const isConnected = value === 'CONNECTED' || value === 'CONFIGURED'
                  return (
                    <div key={key} className={`p-3 rounded border ${isConnected ? 'border-primary/50 bg-primary/10' : 'border-slate-border bg-surface-container/30'}`}>
                      <p className="font-mono-data text-[10px] text-on-surface-variant uppercase mb-1">{key}</p>
                      <p className={`font-ui-body text-xs font-medium ${isConnected ? 'text-primary' : 'text-slate-500'}`}>{value as React.ReactNode}</p>
                    </div>
                  )
                })}
              </div>
              <h3 className="font-mono-data text-xs text-on-surface-variant uppercase mb-3">Limitations</h3>
              <ul className="space-y-1">
                {status?.limitations?.map((lim: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2 text-[11px] text-red-400/80">
                    <span className="material-symbols-outlined text-[12px]">block</span>{lim}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Data Provenance */}
          <div className="bg-obsidian-deep border border-slate-border rounded-lg p-6">
            <h2 className="font-headline-lg text-lg text-on-background font-bold mb-2">Data Provenance</h2>
            <p className="text-xs text-on-surface-variant mb-4">
              {status?.provenanceNote ||
                'REAL means produced by a live, traceable execution. TEST means produced by a test run. FIXTURE means seeded sample data. UNKNOWN means historical rows with no provable provenance. Only REAL counts as a production achievement.'}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-on-surface-variant uppercase font-mono-data text-[10px]">
                    <th className="text-left py-2 pr-3">Record type</th>
                    <th className="text-right py-2 px-2 text-green-400">REAL</th>
                    <th className="text-right py-2 px-2 text-yellow-400">TEST</th>
                    <th className="text-right py-2 px-2 text-orange-400">FIXTURE</th>
                    <th className="text-right py-2 px-2 text-slate-400">UNKNOWN</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(status?.provenanceBreakdown || {}).map(([key, counts]) => {
                    const c = (counts || {}) as Record<string, number>
                    return (
                      <tr key={key} className="border-t border-slate-border/60">
                        <td className="py-2 pr-3 text-on-background capitalize">{key}</td>
                        <td className="py-2 px-2 text-right font-mono-data text-green-400 font-medium">{c.REAL ?? 0}</td>
                        <td className="py-2 px-2 text-right font-mono-data text-yellow-400">{c.TEST ?? 0}</td>
                        <td className="py-2 px-2 text-right font-mono-data text-orange-400">{c.FIXTURE ?? 0}</td>
                        <td className="py-2 px-2 text-right font-mono-data text-slate-400">{c.UNKNOWN ?? 0}</td>
                      </tr>
                    )
                  })}
                  {Object.keys(status?.provenanceBreakdown || {}).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-3 text-on-surface-variant">No provenance data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Latest Report */}
          {latestReport && (
            <div className="bg-obsidian-deep border border-slate-border rounded-lg p-6">
              <h3 className="font-headline-lg text-lg text-on-background font-bold mb-4">Latest Report</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="p-3 bg-surface-container/30 rounded border border-slate-border">
                  <p className="font-mono-data text-[10px] text-on-surface-variant uppercase mb-1">Articles</p>
                  <p className="font-ui-body text-sm text-on-background">{latestReport.context?.content?.publishedArticles ?? 0} Published</p>
                </div>
                <div className="p-3 bg-surface-container/30 rounded border border-slate-border">
                  <p className="font-mono-data text-[10px] text-on-surface-variant uppercase mb-1">Products</p>
                  <p className="font-ui-body text-sm text-on-background">{latestReport.context?.products?.totalProducts ?? 0} Tracked</p>
                </div>
                <div className="p-3 bg-surface-container/30 rounded border border-slate-border">
                  <p className="font-mono-data text-[10px] text-on-surface-variant uppercase mb-1">Jobs</p>
                  <p className="font-ui-body text-sm text-on-background">{latestReport.context?.automation?.totalJobs ?? 0} Total</p>
                </div>
                <div className="p-3 bg-surface-container/30 rounded border border-slate-border">
                  <p className="font-mono-data text-[10px] text-on-surface-variant uppercase mb-1">Business Model</p>
                  <p className="font-ui-body text-xs text-on-background">{latestReport.context?.business?.model ?? 'Unknown'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-mono-data text-xs text-on-surface-variant uppercase mb-2">Key Observations</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(latestReport.observations || []).slice(0, 5).map((obs: { fact: string; confidence: string }, idx: number) => (
                      <div key={idx} className="p-3 bg-surface-container/20 rounded border border-slate-border text-xs">
                        <p className="text-on-background">{obs.fact}</p>
                        <span className={`text-[10px] font-bold ${obs.confidence === 'High' ? 'text-green-400' : obs.confidence === 'Medium' ? 'text-yellow-400' : 'text-red-400'}`}>{obs.confidence}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-mono-data text-xs text-on-surface-variant uppercase mb-2">Recommendations</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(latestReport.recommendations || []).slice(0, 5).map((rec: { recommendation: string }, idx: number) => (
                      <div key={idx} className="p-3 bg-primary/5 rounded border border-primary/20 text-xs text-on-background">{rec.recommendation}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ TASKS TAB ═══════════ */}
      {tab === 'tasks' && (
        <div className="space-y-6">
          {/* New Task Form */}
          <div className="bg-obsidian-deep border border-slate-border rounded-lg p-6">
            <h2 className="font-headline-lg text-lg text-on-background font-bold mb-4">New Brain Task</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block font-mono-data text-xs text-on-surface-variant uppercase mb-2">Task Type</label>
                <select value={newTaskType} onChange={e => setNewTaskType(e.target.value)}
                  className="w-full bg-surface-container border border-slate-border rounded px-3 py-2.5 text-sm text-on-background focus:outline-none focus:border-primary">
                  {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block font-mono-data text-xs text-on-surface-variant uppercase mb-2">Goal</label>
                <input type="text" value={newTaskGoal} onChange={e => setNewTaskGoal(e.target.value)} placeholder="What should the Brain investigate?"
                  className="w-full bg-surface-container border border-slate-border rounded px-3 py-2.5 text-sm text-on-background placeholder:text-slate-500 focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block font-mono-data text-xs text-on-surface-variant uppercase mb-2">Priority</label>
                <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)}
                  className="w-full bg-surface-container border border-slate-border rounded px-3 py-2.5 text-sm text-on-background focus:outline-none focus:border-primary">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <button onClick={handleCreateTask} disabled={creatingTask || !newTaskGoal.trim()}
              className="px-6 py-2.5 bg-primary text-deep-navy font-bold text-sm uppercase tracking-wider rounded hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2">
              {creatingTask ? <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-lg">add_task</span>}
              CREATE TASK
            </button>
          </div>

          {/* Task List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-mono-data text-xs text-on-surface-variant uppercase mb-3">Active & Queued Tasks</h3>
              <div className="space-y-3">
                {tasks.filter(t => ['queued', 'running', 'waiting_approval'].includes(t.status)).map(task => (
                  <div key={task.id} className="bg-obsidian-deep border border-slate-border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-ui-body text-sm text-on-background font-medium">{task.title}</h4>
                        <p className="font-mono-data text-xs text-on-surface-variant">{task.goal}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${task.status === 'waiting_approval' ? 'bg-yellow-500/20 text-yellow-400' : task.status === 'running' ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-300'}`}>{task.status}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`px-2 py-0.5 text-[10px] rounded ${task.priority === 'critical' ? 'bg-red-500/20 text-red-400' : task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-400'}`}>{task.priority}</span>
                      {task.status === 'queued' && (
                        <button onClick={() => handleRunTask(task.id)} disabled={runningTask === task.id}
                          className="ml-auto px-4 py-1.5 bg-primary text-deep-navy font-bold text-xs rounded hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1">
                          {runningTask === task.id ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-sm">play_arrow</span>}
                          ANALYZE
                        </button>
                      )}
                    </div>
                    {task.recommendation && (
                      <div className="mt-3 pt-3 border-t border-slate-border/50">
                        <p className="font-mono-data text-xs text-on-surface-variant uppercase mb-1">Recommendation</p>
                        <p className="text-xs text-on-background">{task.recommendation}</p>
                      </div>
                    )}
                  </div>
                ))}
                {tasks.filter(t => ['queued', 'running', 'waiting_approval'].includes(t.status)).length === 0 && (
                  <p className="text-sm text-on-surface-variant p-4 text-center">No active tasks. Create one above.</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-mono-data text-xs text-on-surface-variant uppercase mb-3">Completed Tasks</h3>
              <div className="space-y-3">
                {tasks.filter(t => t.status === 'completed' || t.status === 'failed').slice(0, 10).map(task => (
                  <div key={task.id} className={`bg-obsidian-deep border rounded-lg p-4 ${task.status === 'failed' ? 'border-red-500/30' : 'border-slate-border'}`}>
                    <div className="flex items-start justify-between">
                      <h4 className="font-ui-body text-sm text-on-background font-medium">{task.title}</h4>
                      <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${task.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{task.status}</span>
                    </div>
                    {task.recommendation && <p className="text-xs text-on-surface-variant mt-2">{task.recommendation}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Task Detail */}
          {selectedTask?.analysis && (
            <div className="bg-obsidian-deep border border-primary/30 rounded-lg p-6">
              <h3 className="font-headline-lg text-lg text-on-background font-bold mb-4">Task Analysis Result</h3>
              <p className="text-sm text-on-background mb-4">{selectedTask.analysis.recommendation}</p>
              
              {/* Approve & Execute Section */}
              <div className="mb-6 p-4 bg-surface-container/50 border border-primary/20 rounded">
                {!executionPlan ? (
                  <button onClick={() => handleGeneratePlan(selectedTask.task.id)}
                    className="px-5 py-2 bg-primary text-deep-navy font-bold text-xs uppercase tracking-wider rounded hover:bg-primary/90 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">play_circle</span>
                    Approve & Generate Execution Plan
                  </button>
                ) : (
                  <div className="space-y-4">
                    <h4 className="font-mono-data text-xs text-on-surface-variant uppercase text-yellow-400 font-bold">Execution Confirmation Required</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div><span className="text-on-surface-variant">Execution Type:</span> <span className="text-on-background">{executionPlan.execution_type}</span></div>
                      <div><span className="text-on-surface-variant">Target:</span> <span className="text-on-background">{executionPlan.target}</span></div>
                      <div><span className="text-on-surface-variant">Risk:</span> <span className="text-red-400 font-bold">{executionPlan.risk}</span></div>
                      <div><span className="text-on-surface-variant">Expected Output:</span> <span className="text-on-background">{executionPlan.expected_output}</span></div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => handleExecutePlan(selectedTask.task.id)} disabled={executingPlan}
                        className="px-5 py-2 bg-red-600 text-white font-bold text-xs uppercase rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                        {executingPlan ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-sm">warning</span>}
                        Confirm Execution
                      </button>
                      <button onClick={() => setExecutionPlan(null)} disabled={executingPlan}
                        className="px-5 py-2 bg-slate-700 text-white font-bold text-xs uppercase rounded hover:bg-slate-600 disabled:opacity-50">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-mono-data text-xs text-on-surface-variant uppercase mb-2">Findings ({selectedTask.analysis.findings?.length || 0})</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedTask.analysis.findings?.map((f: { fact: string; inference: string; confidence: string }, i: number) => (
                      <div key={i} className="p-3 bg-surface-container/20 rounded border border-slate-border text-xs">
                        <p className="text-on-background font-medium">{f.fact}</p>
                        <p className="text-on-surface-variant mt-1">{f.inference}</p>
                        <span className={`text-[10px] font-bold ${f.confidence === 'High' ? 'text-green-400' : 'text-yellow-400'}`}>{f.confidence}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-mono-data text-xs text-on-surface-variant uppercase mb-2">Implementation Requests ({selectedTask.analysis.implementation_requests?.length || 0})</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedTask.analysis.implementation_requests?.map((ir: { title: string; capability_gap: string }, i: number) => (
                      <div key={i} className="p-3 bg-surface-container/20 rounded border border-slate-border text-xs">
                        <p className="text-on-background font-medium">{ir.title}</p>
                        <p className="text-on-surface-variant mt-1">{ir.capability_gap}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ STRATEGY CENTER TAB ═══════════ */}
      {tab === 'strategies' && strategiesV2.length > 0 && (
        <div className="space-y-6">
          <h2 className="font-headline-lg text-xl text-on-background font-bold">Strategy Center (V2)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-obsidian-deep border border-slate-border rounded-lg p-4">
              <p className="font-mono-data text-[10px] text-on-surface-variant uppercase">Total V2</p>
              <p className="text-xl font-bold text-on-background">{strategiesV2.length}</p>
            </div>
            <div className="bg-obsidian-deep border border-slate-border rounded-lg p-4">
              <p className="font-mono-data text-[10px] text-on-surface-variant uppercase">Proposed</p>
              <p className="text-xl font-bold text-amber-400">{strategiesV2.filter(s => s.status === 'PROPOSED').length}</p>
            </div>
            <div className="bg-obsidian-deep border border-slate-border rounded-lg p-4">
              <p className="font-mono-data text-[10px] text-on-surface-variant uppercase">Strong Evidence</p>
              <p className="text-xl font-bold text-emerald-400">{strategiesV2.filter(s => s.evidence_strength === 'STRONGLY_SUPPORTED').length}</p>
            </div>
            <div className="bg-obsidian-deep border border-slate-border rounded-lg p-4">
              <p className="font-mono-data text-[10px] text-on-surface-variant uppercase">Review Needed</p>
              <p className="text-xl font-bold text-red-400">{strategiesV2.filter(s => s.evidence_strength === 'INSUFFICIENT_EVIDENCE').length}</p>
            </div>
          </div>
          <div className="space-y-4">
            {strategiesV2.map(s => (
              <div key={s.id} className="bg-obsidian-deep border border-slate-border rounded-lg p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-ui-body text-on-background font-medium">{s.title}</h3>
                    <p className="text-xs text-on-surface-variant mt-1">{s.type} | {s.objective}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${s.status === 'PROPOSED' ? 'bg-amber-900/30 text-amber-400' : s.status === 'APPROVED' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>{s.status}</span>
                    <span className={`px-2 py-0.5 text-[10px] uppercase rounded ${s.evidence_strength === 'STRONGLY_SUPPORTED' ? 'bg-emerald-900/30 text-emerald-400' : s.evidence_strength === 'SUPPORTED' ? 'bg-blue-900/30 text-blue-400' : s.evidence_strength === 'LIMITED_EVIDENCE' ? 'bg-amber-900/30 text-amber-400' : 'bg-red-900/30 text-red-400'}`}>{s.evidence_strength}</span>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant mb-2">{s.rationale}</p>
                <div className="grid grid-cols-2 gap-4 text-[10px] mb-2">
                  <div><span className="text-on-surface-variant uppercase">Confidence:</span> <span className="text-on-background">{((s.confidence || 0) * 100).toFixed(0)}%</span></div>
                  <div><span className="text-on-surface-variant uppercase">Outcome:</span> <span className="text-on-background">{s.outcome_status}</span></div>
                  <div><span className="text-on-surface-variant uppercase">Version:</span> <span className="text-on-background">{s.version}</span></div>
                  <div><span className="text-on-surface-variant uppercase">Provenance:</span> <span className="text-on-background">{s.provenance}</span></div>
                </div>
                {s.unavailable_data && s.unavailable_data.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">Unavailable Data</p>
                    <ul className="text-[10px] text-gray-400 space-y-1">
                      {s.unavailable_data.map((u: string, i: number) => <li key={i}>• {u}</li>)}
                    </ul>
                  </div>
                )}
                {s.assumptions && s.assumptions.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">Assumptions</p>
                    <ul className="text-[10px] text-amber-400/80 space-y-1">
                      {s.assumptions.map((a: string, i: number) => <li key={i}>• {a}</li>)}
                    </ul>
                  </div>
                )}
                {s.conflict_flags && s.conflict_flags.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">Conflict Flags</p>
                    <ul className="text-[10px] text-red-400/80 space-y-1">
                      {s.conflict_flags.map((f: string, i: number) => <li key={i}>• {f}</li>)}
                    </ul>
                  </div>
                )}
                {s.opportunity_ids && s.opportunity_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {s.opportunity_ids.map((oid: string) => (
                      <span key={oid} className="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] uppercase rounded">Opp: {oid.slice(0, 8)}...</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ OPPORTUNITY CENTER TAB ═══════════ */}
      {tab === 'opportunities' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-lg text-xl text-on-background font-bold">Opportunity Center</h2>
            <button onClick={async () => { try { await fetch('/api/brain/opportunities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'discover', context: { snapshot: status } }) }); fetchAll() } catch {} }} className="px-4 py-2 bg-primary text-on-dark font-bold text-xs uppercase rounded hover:bg-primary/90 transition-colors">Discover</button>
          </div>
          {opportunities.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-obsidian-deep border border-dashed border-slate-border rounded-lg">
              <span className="material-symbols-outlined text-slate-600 text-5xl mb-4">tips_and_updates</span>
              <p className="text-on-surface-variant">No opportunities yet. Run Brain tasks or click Discover to generate opportunities.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {opportunities.map(o => {
                const prov = (o.provenance || '').toUpperCase()
                const isUnknown = prov === 'UNKNOWN'
                const isReal = prov === 'REAL'
                return (
                  <div key={o.id} className={`bg-obsidian-deep border rounded-lg p-5 ${isUnknown ? 'border-red-900/50' : 'border-slate-border'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-ui-body text-on-background font-medium">{o.title}</h3>
                        <p className="text-xs text-on-surface-variant mt-1">{o.opportunity_type || o.type} | {o.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${isReal ? 'bg-emerald-900/30 text-emerald-400' : isUnknown ? 'bg-red-900/30 text-red-400' : 'bg-slate-800 text-slate-400'}`}>{prov}</span>
                        <span className={`px-2 py-0.5 text-[10px] uppercase rounded ${o.evidence_strength === 'STRONGLY_SUPPORTED' ? 'bg-emerald-900/30 text-emerald-400' : o.evidence_strength === 'SUPPORTED' ? 'bg-blue-900/30 text-blue-400' : 'bg-amber-900/30 text-amber-400'}`}>{o.evidence_strength}</span>
                        {o.product_availability === 'UNAVAILABLE' && <span className="px-2 py-0.5 text-[10px] uppercase rounded bg-red-900/30 text-red-400">Product: UNAVAILABLE</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] mb-2">
                      <div><span className="text-on-surface-variant uppercase">Status:</span> <span className="text-on-background">{o.status}</span></div>
                      <div><span className="text-on-surface-variant uppercase">Confidence:</span> <span className="text-on-background">{((o.confidence || 0) * 100).toFixed(0)}%</span></div>
                      <div><span className="text-on-surface-variant uppercase">Version:</span> <span className="text-on-background">{o.version}</span></div>
                      <div><span className="text-on-surface-variant uppercase">Validation:</span> <span className="text-on-background">{o.validation_status || 'N/A'}</span></div>
                    </div>
                    {o.unavailable_data && o.unavailable_data.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">Unavailable Data</p>
                        <ul className="text-[10px] text-gray-400 space-y-1">
                          {o.unavailable_data.map((u: string, i: number) => <li key={i}>• {u}</li>)}
                        </ul>
                      </div>
                    )}
                    {o.assumptions && o.assumptions.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">Assumptions</p>
                        <ul className="text-[10px] text-amber-400/80 space-y-1">
                          {o.assumptions.map((a: any, i: number) => <li key={i}>• {typeof a === 'string' ? a : a.assumption || JSON.stringify(a)}</li>)}
                        </ul>
                      </div>
                    )}
                    {o.conflict_flags && o.conflict_flags.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">Conflict Flags</p>
                        <ul className="text-[10px] text-red-400/80 space-y-1">
                          {o.conflict_flags.map((f: any, i: number) => <li key={i}>• {typeof f === 'string' ? f : f.explanation || JSON.stringify(f)}</li>)}
                        </ul>
                      </div>
                    )}
                    {isUnknown && (
                      <div className="mt-2 p-2 bg-red-900/10 border border-red-900/30 rounded">
                        <p className="text-[10px] text-red-400 uppercase font-bold">Not Actionable</p>
                        <p className="text-[10px] text-red-400/80">This opportunity has UNKNOWN provenance and cannot drive strategy, execution, or recommendations.</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ STRATEGIES TAB (LEGACY) ═══════════ */}
      {tab === 'strategies' && (
        <div className="space-y-6">
          <h2 className="font-headline-lg text-xl text-on-background font-bold">Strategy Proposals</h2>
          {strategies.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-obsidian-deep border border-dashed border-slate-border rounded-lg">
              <span className="material-symbols-outlined text-slate-600 text-5xl mb-4">strategy</span>
              <p className="text-on-surface-variant">No strategies yet. Run a Brain Task to generate strategy proposals.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {strategies.map(s => (
                <div key={s.id} className="bg-obsidian-deep border border-slate-border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-ui-body text-on-background font-medium">{s.title}</h3>
                      <p className="text-xs text-on-surface-variant mt-1">{s.description}</p>
                    </div>
                    <span className={`px-3 py-1 text-[10px] uppercase font-bold rounded ${s.status === 'approved' ? 'bg-green-500/20 text-green-400' : s.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{s.status}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div><p className="font-mono-data text-[10px] text-on-surface-variant uppercase">Business Goal</p><p className="text-xs text-on-background">{s.business_goal || 'N/A'}</p></div>
                    <div><p className="font-mono-data text-[10px] text-on-surface-variant uppercase">Impact</p><p className="text-xs text-on-background">{s.expected_impact || 'N/A'}</p></div>
                    <div><p className="font-mono-data text-[10px] text-on-surface-variant uppercase">Confidence</p><p className={`text-xs font-bold ${s.confidence === 'High' ? 'text-green-400' : s.confidence === 'Medium' ? 'text-yellow-400' : 'text-red-400'}`}>{s.confidence || 'N/A'}</p></div>
                    <div><p className="font-mono-data text-[10px] text-on-surface-variant uppercase">Risks</p><p className="text-xs text-on-background">{s.risks || 'None identified'}</p></div>
                  </div>
                  {s.status === 'proposed' && (
                    <div className="flex gap-3 pt-4 border-t border-slate-border">
                      <button onClick={() => handleStrategyAction(s.id, 'approve')} className="px-5 py-2 bg-green-600 text-white font-bold text-xs uppercase rounded hover:bg-green-700 transition-colors flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">check</span> Approve
                      </button>
                      <button onClick={() => handleStrategyAction(s.id, 'reject')} className="px-5 py-2 bg-red-600 text-white font-bold text-xs uppercase rounded hover:bg-red-700 transition-colors flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">close</span> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ IMPLEMENTATION REQUESTS TAB ═══════════ */}
      {tab === 'requests' && (
        <div className="space-y-6">
          <h2 className="font-headline-lg text-xl text-on-background font-bold">Implementation Requests</h2>
          <p className="text-sm text-on-surface-variant">Capability gaps detected by the Brain. These are specifications to be handed to a coding agent (Antigravity/Kilo).</p>
          {implRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-obsidian-deep border border-dashed border-slate-border rounded-lg">
              <span className="material-symbols-outlined text-slate-600 text-5xl mb-4">build</span>
              <p className="text-on-surface-variant">No implementation requests yet. Run Brain tasks to discover capability gaps.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {implRequests.map(ir => (
                <div key={ir.id} className="bg-obsidian-deep border border-slate-border rounded-lg p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-ui-body text-on-background font-medium">{ir.title}</h3>
                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${ir.status === 'proposed' ? 'bg-yellow-500/20 text-yellow-400' : ir.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-300'}`}>{ir.status}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mb-2"><strong>Gap:</strong> {ir.capability_gap}</p>
                  <p className="text-xs text-on-surface-variant mb-2"><strong>Reason:</strong> {ir.reason}</p>
                  {ir.acceptance_criteria && <p className="text-xs text-primary"><strong>Acceptance:</strong> {ir.acceptance_criteria}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ EXECUTIONS TAB ═══════════ */}
      {tab === 'executions' && (
        <div className="space-y-6">
          <h2 className="font-headline-lg text-xl text-on-background font-bold">Execution Plans</h2>
          {executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-obsidian-deep border border-dashed border-slate-border rounded-lg">
              <span className="material-symbols-outlined text-slate-600 text-5xl mb-4">play_arrow</span>
              <p className="text-on-surface-variant">No execution plans. Approve and Execute a task to see it here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {executions.map(ex => (
                <div key={ex.id} className="bg-obsidian-deep border border-slate-border rounded-lg p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-ui-body text-on-background font-medium">{ex.execution_type}</h3>
                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${ex.status === 'running' ? 'bg-primary/20 text-primary' : ex.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-300'}`}>{ex.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div><span className="text-on-surface-variant uppercase">Target:</span> <span className="text-on-background">{ex.target}</span></div>
                    <div><span className="text-on-surface-variant uppercase">Job ID:</span> <span className="text-on-background font-mono">{ex.automation_job_id || 'N/A'}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ MEMORY TAB ═══════════ */}
      {tab === 'memory' && (
        <div className="space-y-6">
          <h2 className="font-headline-lg text-xl text-on-background font-bold">Brain Memory</h2>
          {memory.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-obsidian-deep border border-dashed border-slate-border rounded-lg">
              <span className="material-symbols-outlined text-slate-600 text-5xl mb-4">memory</span>
              <p className="text-on-surface-variant">Brain memory is empty.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {memory.map(m => (
                <div key={m.id} className="bg-obsidian-deep border border-slate-border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant text-[10px] uppercase rounded font-bold">{m.type}</span>
                    <span className="text-[10px] text-on-surface-variant">{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <pre className="text-[10px] text-on-background overflow-x-auto whitespace-pre-wrap">{JSON.stringify(m.content, null, 2)}</pre>
                  <p className="text-[10px] text-on-surface-variant mt-2 text-right">Source: {m.source}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ DECISIONS TAB ═══════════ */}
      {tab === 'decisions' && (
        <div className="space-y-6">
          <h2 className="font-headline-lg text-xl text-on-background font-bold">Decision Center</h2>
          {decisions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-obsidian-deep border border-dashed border-slate-border rounded-lg">
              <span className="material-symbols-outlined text-slate-600 text-5xl mb-4">gavel</span>
              <p className="text-on-surface-variant">No decisions yet. The Brain will generate evidence-based decisions when sufficient data is available.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {decisions.map((d: any) => {
                const statusColor: Record<string, string> = {
                  'PROPOSED': 'bg-amber-900/30 text-amber-400 border-amber-800',
                  'APPROVED': 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
                  'REJECTED': 'bg-red-900/30 text-red-400 border-red-800',
                  'EXECUTING': 'bg-blue-900/30 text-blue-400 border-blue-800',
                  'COMPLETED': 'bg-green-900/30 text-green-400 border-green-800',
                  'VERIFIED': 'bg-teal-900/30 text-teal-400 border-teal-800',
                  'FAILED': 'bg-red-900/30 text-red-400 border-red-800',
                  'DEFERRED': 'bg-slate-800/30 text-slate-400 border-slate-700',
                  'NOT_VERIFIABLE': 'bg-gray-800/30 text-gray-400 border-gray-700',
                }
                const provenanceColor: Record<string, string> = {
                  'REAL': 'bg-emerald-900/30 text-emerald-400',
                  'UNKNOWN': 'bg-orange-900/30 text-orange-400',
                  'UNAVAILABLE': 'bg-gray-800/30 text-gray-400',
                  'OBSERVED_ZERO': 'bg-blue-900/30 text-blue-400',
                  'NOT_VERIFIABLE': 'bg-gray-800/30 text-gray-400',
                }
                return (
                  <div key={d.id} className="bg-obsidian-deep border border-slate-border rounded-lg p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded border ${statusColor[d.status] || 'bg-slate-800 text-slate-400'}`}>{d.status}</span>
                        <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant text-[10px] uppercase rounded font-bold">{d.type}</span>
                        <span className={`px-2 py-0.5 text-[10px] uppercase rounded font-bold ${provenanceColor[d.provenance] || 'bg-slate-800 text-slate-400'}`}>{d.provenance}</span>
                      </div>
                      <span className="text-[10px] text-on-surface-variant">{new Date(d.created_at).toLocaleString()}</span>
                    </div>
                    <h3 className="text-sm font-bold text-on-background mb-2">{d.title}</h3>
                    <p className="text-xs text-on-surface-variant mb-3">{d.rationale}</p>
                    <div className="grid grid-cols-2 gap-4 text-[10px] mb-3">
                      <div>
                        <span className="text-on-surface-variant font-bold uppercase">Confidence:</span>{' '}
                        <span className={`${(d.confidence || 0) >= 0.7 ? 'text-emerald-400' : (d.confidence || 0) >= 0.4 ? 'text-amber-400' : 'text-red-400'}`}>{((d.confidence || 0) * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant font-bold uppercase">Impact:</span>{' '}
                        <span className="text-on-background">{d.expected_impact || 'N/A'}</span>
                      </div>
                    </div>
                    {d.evidence && (
                      <details className="text-[10px] mb-3">
                        <summary className="text-on-surface-variant font-bold uppercase cursor-pointer">Evidence</summary>
                        <pre className="mt-1 text-on-background overflow-x-auto whitespace-pre-wrap bg-surface-container p-2 rounded">{JSON.stringify(typeof d.evidence === 'string' ? JSON.parse(d.evidence) : d.evidence, null, 2)}</pre>
                      </details>
                    )}
                    {/* Related entities from evidence references */}
                    {d.evidence && (() => {
                      const ev = typeof d.evidence === 'string' ? JSON.parse(d.evidence) : d.evidence
                      const related: Array<{ label: string; id: string }> = []
                      if (ev?.opportunityId) related.push({ label: 'Opportunity', id: ev.opportunityId })
                      if (ev?.strategyId) related.push({ label: 'Strategy', id: ev.strategyId })
                      if (ev?.taskId || ev?.task_id) related.push({ label: 'Task', id: (ev.taskId || ev.task_id) as string })
                      if (ev?.executionPlanId || ev?.execution_plan_id) related.push({ label: 'Plan', id: (ev.executionPlanId || ev.execution_plan_id) as string })
                      if (ev?.articleId || ev?.article_id) related.push({ label: 'Article', id: (ev.articleId || ev.article_id) as string })
                      if (related.length > 0) {
                        return (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {related.map(r => (
                              <span key={r.id} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] uppercase rounded font-medium">
                                {r.label}: {r.id.slice(0, 8)}...
                              </span>
                            ))}
                          </div>
                        )
                      }
                      return null
                    })()}
                    {d.risks && d.risks.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">Risks</p>
                        <ul className="text-[10px] text-red-400/80 space-y-1">
                          {d.risks.map((r: string, i: number) => <li key={i}>• {r}</li>)}
                        </ul>
                      </div>
                    )}
                    {d.required_permissions && d.required_permissions.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">Required Permissions</p>
                        <div className="flex flex-wrap gap-1">
                          {d.required_permissions.map((p: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 bg-amber-900/20 text-amber-400 text-[9px] uppercase rounded">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {d.status === 'PROPOSED' && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={async () => { try { await fetch(`/api/brain/decisions/${d.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'APPROVED' }) }); fetchAll() } catch {} }} className="px-3 py-1 bg-emerald-900/30 text-emerald-400 border border-emerald-800 rounded text-[10px] font-bold uppercase hover:bg-emerald-900/50 transition-colors">Approve</button>
                        <button onClick={async () => { try { await fetch(`/api/brain/decisions/${d.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'REJECTED' }) }); fetchAll() } catch {} }} className="px-3 py-1 bg-red-900/30 text-red-400 border border-red-800 rounded text-[10px] font-bold uppercase hover:bg-red-900/50 transition-colors">Reject</button>
                        <button onClick={async () => { try { await fetch(`/api/brain/decisions/${d.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DEFERRED' }) }); fetchAll() } catch {} }} className="px-3 py-1 bg-slate-800/30 text-slate-400 border border-slate-700 rounded text-[10px] font-bold uppercase hover:bg-slate-800/50 transition-colors">Defer</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ ACTIVITY TAB ═══════════ */}
      {tab === 'activity' && (
        <div className="space-y-6">
          <h2 className="font-headline-lg text-xl text-on-background font-bold">Brain Activity Log</h2>
          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-obsidian-deep border border-dashed border-slate-border rounded-lg">
              <span className="material-symbols-outlined text-slate-600 text-5xl mb-4">history</span>
              <p className="text-on-surface-variant">No activity yet.</p>
            </div>
          ) : (
            <div className="bg-obsidian-deep border border-slate-border rounded-lg p-6">
              <div className="space-y-4 border-l-2 border-slate-border pl-4 ml-2">
                {activity.map(a => (
                  <div key={a.id} className="relative">
                    <div className="absolute w-3 h-3 bg-primary rounded-full -left-[23px] top-1"></div>
                    <p className="text-[10px] text-on-surface-variant mb-1">{new Date(a.created_at).toLocaleString()}</p>
                    <p className="text-xs text-on-background font-medium">{a.type}</p>
                    <p className="text-[10px] text-on-surface-variant mt-1">Source: {a.source}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex justify-center p-12">
          <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
        </div>
      )}
    </div>
  )
}
