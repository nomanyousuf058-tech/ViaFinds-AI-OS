# 29 AI BRAIN EVENTS

## Purpose
To reduce reliance on constant cron polling, the Brain should react to critical system events asynchronously.

## Event System Architecture
Currently, ViaFinds lacks a dedicated event bus (like Kafka or RabbitMQ). We will implement a lightweight Event Engine using PostgreSQL Triggers and Supabase Webhooks.

### Key Events
- `article_published`: Triggers Brain to update the Knowledge Graph and begin tracking analytics.
- `automation_failed`: Wakes the Brain's Self-Healing module immediately to attempt recovery or notify the Admin.
- `quality_gate_failed`: Triggers the Learning Engine to analyze why the AI failed to generate acceptable content.
- `user_requested_audit`: Triggered via the UI; wakes the Task Engine to perform an immediate system review.

## Implementation (Free-First)
- Use Supabase Database Webhooks.
- When an `INSERT` or `UPDATE` happens on key tables, Supabase sends an HTTP POST to a Next.js API route (`/api/brain/events`).
- The API route parses the payload and dispatches the relevant Brain Module.
