# 28 AI BRAIN SCHEDULING

## Purpose
The Brain is not a daemon that runs continuously in a `while(true)` loop. That would be prohibitively expensive and incompatible with serverless environments (Vercel).

## The Tick Architecture
The Brain operates on a "Tick" system, driven by external cron schedulers.

### 1. The Strategy Tick (Daily/Weekly)
- **Trigger**: Vercel Cron hits `/api/brain/tick-strategy`.
- **Action**: Brain wakes up, reads analytics for the past 24 hours, evaluates active experiments, and updates the Strategy.

### 2. The Task Tick (Hourly)
- **Trigger**: Vercel Cron hits `/api/brain/tick-tasks`.
- **Action**: Brain checks the `brain_tasks` table for pending tasks. The Orchestrator processes the next step in the task DAG.

### 3. The Automation Sync Tick (Every 15 mins)
- **Trigger**: Vercel Cron hits `/api/brain/sync-automation`.
- **Action**: Brain checks the `automation_jobs` table. If a job the Brain requested has `status = 'completed'`, the Brain ingests the result and moves its internal Task to the Verification phase.

## Manual Wake
The Admin can manually wake the Brain from the Dashboard via a "Run Analysis Now" button, immediately triggering the Strategy Tick.
