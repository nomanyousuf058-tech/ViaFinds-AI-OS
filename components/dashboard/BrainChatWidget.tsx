'use client'

import React, { useState, useEffect, useCallback } from 'react'

export default function BrainChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<any>(null)
  
  const fetchData = useCallback(async () => {
    try {
      const [reportsRes, statusRes] = await Promise.all([
        fetch('/api/brain/reports'),
        fetch('/api/brain/status')
      ])
      const reports = await reportsRes.json()
      const status = await statusRes.json()
      
      setData({
        reports: reports.success ? reports.reports : [],
        status: status.success ? status.status : null
      })
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (isOpen && !data) {
      fetchData()
    }
  }, [isOpen, data, fetchData])

  const latestReport = data?.reports?.[0]
  const status = data?.status

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-deep-navy rounded-full shadow-xl flex items-center justify-center hover:bg-primary/90 transition-all z-50 hover:scale-105 active:scale-95 border-2 border-slate-900"
      >
        <span className="material-symbols-outlined text-2xl">{isOpen ? 'close' : 'forum'}</span>
        {/* Unread dot simulation */}
        {!isOpen && <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-error rounded-full border-2 border-deep-navy"></span>}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] max-h-[calc(100vh-8rem)] bg-surface-container border border-slate-border rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50">
          {/* Header */}
          <div className="bg-obsidian-deep p-4 border-b border-slate-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary">psychology</span>
            </div>
            <div>
              <h3 className="font-headline-lg font-bold text-on-background">AI Brain</h3>
              <p className="text-xs text-brand-green font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green block"></span> Active & Monitoring
              </p>
            </div>
          </div>

          {/* Chat Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-ui-body">
            {!data ? (
              <div className="flex justify-center py-8">
                <span className="material-symbols-outlined animate-spin text-primary text-2xl">progress_activity</span>
              </div>
            ) : (
              <>
                {/* Greeting / Briefing */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <span className="material-symbols-outlined text-primary text-[18px]">psychology</span>
                  </div>
                  <div className="bg-surface-container-high rounded-2xl rounded-tl-sm p-4 text-sm text-on-background border border-slate-border/50">
                    <p className="mb-2">Hello! Here is your proactive briefing.</p>
                    <p className="mb-2">
                      I've monitored the system. Currently, there are <strong className="text-primary">{status?.activeStrategies || 0} active strategies</strong> and <strong className="text-primary">{status?.pendingApprovals || 0} actions</strong> awaiting your approval.
                    </p>
                  </div>
                </div>

                {/* Top Recommendations */}
                {latestReport?.recommendations && latestReport.recommendations.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <span className="material-symbols-outlined text-primary text-[18px]">tips_and_updates</span>
                    </div>
                    <div className="bg-primary/5 rounded-2xl rounded-tl-sm p-4 text-sm text-on-background border border-primary/20 w-full">
                      <p className="font-bold text-primary mb-2 text-xs uppercase tracking-wider">Top Priority Actions</p>
                      <ul className="space-y-2">
                        {latestReport.recommendations.slice(0, 2).map((rec: any, idx: number) => (
                          <li key={idx} className="flex gap-2 text-[13px]">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{rec.recommendation}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 pt-3 border-t border-primary/20">
                        <a href="/dashboard/actions" className="text-xs font-bold text-primary hover:underline">
                          Review in My Actions →
                        </a>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Limitations Note */}
                {status?.limitations && status.limitations.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center shrink-0 mt-1">
                      <span className="material-symbols-outlined text-error text-[18px]">warning</span>
                    </div>
                    <div className="bg-error/5 rounded-2xl rounded-tl-sm p-4 text-sm text-on-background border border-error/20">
                      <p className="font-bold text-error mb-1 text-xs uppercase tracking-wider">Configuration Notice</p>
                      <p className="text-[13px]">{status.limitations[0]}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-slate-border bg-obsidian-deep">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Ask me anything..." 
                className="w-full bg-surface-container border border-slate-border rounded-full py-2.5 pl-4 pr-10 text-sm focus:outline-none focus:border-primary text-on-background placeholder:text-on-surface-variant"
                disabled
              />
              <button disabled className="absolute right-2 top-1/2 -translate-y-1/2 text-primary opacity-50">
                <span className="material-symbols-outlined text-xl">send</span>
              </button>
            </div>
            <p className="text-[10px] text-center text-on-surface-variant mt-2">Chat input is temporarily disabled.</p>
          </div>
        </div>
      )}
    </>
  )
}
