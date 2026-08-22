'use client';

import React, { useState, useEffect } from 'react';
import './audit.css';

export default function AuditDashboard() {
  const [isRunning, setIsRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('Idle');
  const [stats, setStats] = useState({
    issuesFound: 0,
    issuesFixed: 0,
    approvalsRequired: 0,
  });
  const [logs, setLogs] = useState<{type: string, message: string}[]>([]);

  // Poll status if running
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && runId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/audit/${runId}`);
          if (res.ok) {
            const data = await res.json();
            setProgress(data.progressPercentage || 0);
            setCurrentTask(data.currentTask || 'Working...');
            setStats({
              issuesFound: data.issuesFound || 0,
              issuesFixed: data.issuesFixed || 0,
              approvalsRequired: data.approvalsRequired?.length || 0,
            });
            if (data.logs) {
              setLogs(data.logs);
            }
            if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
              setIsRunning(false);
            }
          }
        } catch (err) {
          console.error("Failed to fetch audit status", err);
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, runId]);

  // Attempt to recover active run on mount
  useEffect(() => {
    async function checkActiveRun() {
      try {
        const res = await fetch('/api/audit/active');
        if (res.ok) {
          const data = await res.json();
          if (data && data._id && data.status === 'executing') {
            setRunId(data._id);
            setIsRunning(true);
            setProgress(data.progressPercentage || 0);
            setCurrentTask(data.currentTask || 'Recovered active run...');
          }
        }
      } catch {
        // ignore
      }
    }
    checkActiveRun();
  }, []);

  const handleStartRun = async () => {
    setIsRunning(true);
    setProgress(0);
    setCurrentTask('Initializing Audit...');
    setLogs([]);
    
    try {
      const res = await fetch('/api/audit/start', { method: 'POST' });
      const data = await res.json();
      if (data.runId) {
        setRunId(data.runId);
      } else {
        setIsRunning(false);
        setCurrentTask('Failed to start run');
      }
    } catch (err) {
      console.error(err);
      setIsRunning(false);
    }
  };

  const handleStopRun = async () => {
    if (window.confirm("Are you sure you want to stop this audit? Current progress may be incomplete.")) {
      try {
        await fetch(`/api/audit/${runId}/stop`, { method: 'POST' });
        setIsRunning(false);
        setCurrentTask('Audit Cancelled');
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="audit-dashboard">
      <h1>Website & Platform Audit</h1>
      
      <div className="audit-controls">
        <button 
          className="btn-run-audit" 
          onClick={handleStartRun} 
          disabled={isRunning}
        >
          {isRunning ? 'Audit Running...' : 'Run Website & Platform Audit'}
        </button>
        {isRunning && (
          <button className="btn-stop-audit" onClick={handleStopRun}>
            Stop Run
          </button>
        )}
      </div>

      {(runId || isRunning) && (
        <div className="audit-status-panel">
          <div className="audit-header">
            <div>
              <h3>Run ID: {runId}</h3>
              <p>Status: {isRunning ? 'Executing' : 'Finished'}</p>
            </div>
            <div>
              <h3>{progress}% Complete</h3>
            </div>
          </div>

          <div className="audit-progress-container">
            <div className="progress-bar-bg">
              <div 
                className={`progress-bar-fill ${isRunning ? 'running' : ''}`}
                style={{ width: `${progress}%` }}
              >
                {progress}%
              </div>
            </div>
            <p style={{ marginTop: '10px', fontStyle: 'italic' }}>
              Currently: <strong>{currentTask}</strong>
            </p>
          </div>

          <div className="audit-stats">
            <div className="stat-card">
              <h4>Issues Found</h4>
              <p>{stats.issuesFound}</p>
            </div>
            <div className="stat-card">
              <h4>Issues Fixed</h4>
              <p>{stats.issuesFixed}</p>
            </div>
            <div className="stat-card">
              <h4>Approvals Required</h4>
              <p style={{ color: stats.approvalsRequired > 0 ? '#d97706' : 'inherit' }}>
                {stats.approvalsRequired}
              </p>
            </div>
          </div>

          <div className="audit-logs">
            {logs.map((log, i) => (
              <div key={i} className={`log-entry ${log.type}`}>
                {log.message}
              </div>
            ))}
            {logs.length === 0 && <div className="log-entry info">Awaiting logs...</div>}
          </div>
        </div>
      )}
    </div>
  );
}
