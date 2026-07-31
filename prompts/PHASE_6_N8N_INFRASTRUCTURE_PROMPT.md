# ViaFinds AI OS
# Phase 6
## n8n Workflow Infrastructure

Before writing code

Review

- docs/MASTER_ARCHITECTURE.md
- docs/IMPLEMENTATION_PLAN.md
- docs/PROJECT_STRUCTURE.md
- docs/DEVELOPMENT_RULES.md

Review the existing codebase.

Never duplicate functionality.

Only extend the architecture.

--------------------------------------------------

OBJECTIVE

Build the reusable n8n workflow infrastructure.

Do NOT automate the business.

Do NOT scrape products.

Do NOT publish products.

Do NOT publish articles.

Do NOT generate Pinterest content.

Everything must remain manually triggered.

--------------------------------------------------

Create the workflow architecture.

Build reusable workflow modules.

--------------------------------------------------

Create

1. Master Workflow

2. Product Workflow

3. Category Workflow

4. Content Workflow

5. Search Intelligence Workflow

6. Quality Workflow

7. Publisher Workflow

8. Logging Workflow

--------------------------------------------------

Every workflow must be modular.

Each workflow must expose

Input

↓

Validation

↓

Execution

↓

Result

↓

Logging

--------------------------------------------------

Workflow Responsibilities

Master Workflow

- Receive manual request
- Validate request
- Dispatch to the correct workflow

--------------------------------------------------

Product Workflow

- Receive Product URL
OR

- Receive Affiliate Link

Validate input only.

No scraping.

No AI generation.

--------------------------------------------------

Category Workflow

Receive validated product object.

No AI decisions.

--------------------------------------------------

Content Workflow

Receive validated content request.

No content generation.

Only workflow skeleton.

--------------------------------------------------

Search Intelligence Workflow

Receive generated content.

Prepare future SEO/AEO/GEO optimization pipeline.

No optimization logic.

--------------------------------------------------

Quality Workflow

Prepare future quality validation pipeline.

No quality logic.

--------------------------------------------------

Publisher Workflow

Receive approved draft.

Save draft only.

Never publish automatically.

--------------------------------------------------

Logging Workflow

Log

Workflow

Execution Time

Status

Errors

Warnings

AI Usage

Provider Used

--------------------------------------------------

Architecture

Manual Trigger

↓

Master Workflow

↓

Workflow Router

↓

Workflow Module

↓

AI Agent

↓

AI Manager

↓

Sanity

↓

Draft

--------------------------------------------------

Build reusable

Workflow Types

Workflow Interfaces

Workflow Registry

Workflow Loader

Workflow Configuration

Workflow Validator

Workflow Result Objects

--------------------------------------------------

The workflows must never directly call

Ollama

Gemini

OpenAI

Claude

Providers

Only AI Agents may communicate with AIManager.

--------------------------------------------------

The workflows must support

Future Scheduling

Future Queue

Future Retry

Future Events

Future Notifications

Future Human Approval

--------------------------------------------------

No business logic.

No AI prompts.

No content generation.

No publishing.

No scraping.

Only infrastructure.

--------------------------------------------------

Run

npx tsc --noEmit

Fix every error.

--------------------------------------------------

Update

docs/PROJECT_STRUCTURE.md

if required.

--------------------------------------------------

STOP

Generate a completion report.

Wait for approval.