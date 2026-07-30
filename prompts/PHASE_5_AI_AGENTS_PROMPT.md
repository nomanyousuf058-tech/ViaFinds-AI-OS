# ViaFinds AI OS
# Phase 5
## Core AI Agent Framework

Before writing code

Review

- docs/MASTER_ARCHITECTURE.md
- docs/IMPLEMENTATION_PLAN.md
- docs/PROJECT_STRUCTURE.md
- docs/DEVELOPMENT_RULES.md

Review the current codebase.

Never rebuild functionality.

Only extend.

--------------------------------------------------

OBJECTIVE

Build the reusable AI Agent Framework.

Do NOT implement business logic.

Do NOT implement workflows.

Do NOT implement product generation.

Do NOT implement publishing.

--------------------------------------------------

Create the following agents

1. Product Intelligence Agent

2. Category Intelligence Agent

3. Content Intelligence Agent

4. Search Intelligence Agent

5. Image Intelligence Agent

6. Affiliate Intelligence Agent

7. Quality Intelligence Agent

8. Publisher Agent

--------------------------------------------------

Every Agent must inherit from BaseAgent.

Never duplicate logic.

--------------------------------------------------

Each Agent must contain

Identity

Configuration

Capabilities

Supported Tasks

Execution Pipeline

Validation Hooks

Logging

Metrics

Health Status

--------------------------------------------------

Every Agent must communicate ONLY with

AIManager

Never call providers directly.

Never call Ollama directly.

Never call Gemini directly.

--------------------------------------------------

Every Agent should expose

initialize()

execute()

validate()

health()

shutdown()

--------------------------------------------------

Create

Agent Registry

Agent Factory

Agent Configuration

Agent Loader

Agent Lifecycle Manager

--------------------------------------------------

Agents must support

Versioning

Health Checks

Capability Discovery

Metrics

Future Plugins

Future Memory

Future Event System

--------------------------------------------------

No business logic.

No prompts.

No workflows.

No SEO implementation.

No content generation.

Only the reusable framework.

--------------------------------------------------

Run

npx tsc --noEmit

Fix every error.

--------------------------------------------------

Update

PROJECT_STRUCTURE.md

if necessary.

--------------------------------------------------

STOP

Generate completion report.

Wait for approval.