# 08 AI BRAIN AGENT ORCHESTRATION

## Purpose
The Orchestrator is the manager. Once the Task Engine creates a task, the Orchestrator assigns it to the correct internal system, external agent, or tool.

## Delegation Targets
1. **Tools**: Simple, deterministic functions (e.g., `ReadDatabase`, `QueryAnalytics`).
2. **Agent Reach**: External web-browsing agents for complex research.
3. **Automation Pipeline**: The existing `pipeline.ts` for actual content generation and publishing.
4. **Antigravity / Kilo**: Coding agents for system modifications (via Implementation Requests).

## Orchestration Logic
```javascript
function orchestrate(task) {
  if (task.type === 'RESEARCH') {
     return AgentReach.dispatch(task);
  } 
  if (task.type === 'WRITE_CONTENT') {
     return AutomationAdapter.queueJob(task);
  }
  if (task.type === 'SYSTEM_UPDATE') {
     return CapabilityGapEngine.createImplementationRequest(task);
  }
  // ... fallback to internal tool loop
}
```

## Error Handling & Deadlocks
- The Orchestrator monitors timeouts. If `AgentReach` takes more than 15 minutes to research a topic, the Orchestrator cancels the sub-task and logs a failure in `brain_tasks`.
- Prevents infinite loops by enforcing a strict `max_steps` limit on any agentic execution sequence.
