# ViaFinds AI OS
# Project Structure
Version: 1.0

---

# Purpose

This document defines the official folder and file structure for ViaFinds AI OS.

Every developer, AI coding assistant, and automation tool must follow this structure.

New folders should not be created unless absolutely necessary.

---

# Root Directory

```
ViaFinds-AI-OS/
```

Contains the complete AI Operating System.

---

# Folder Structure

```
ViaFinds-AI-OS
│
├── app/
│
├── studio/
│
├── public/
│
├── docs/
│
├── docker/
│
├── workflows/
│
├── prompts/
│
├── config/
│
├── core/
│
├── scripts/
│
├── lib/
│
├── shared/
│
├── types/
│
├── agents/
│
├── providers/
│
├── plugins/
│
├── memory/
│
├── events/
│
├── logs/
│
├── data/
│
├── backups/
│
└── images/
```

---

# app/

Contains

- Next.js Application
- API Routes
- Dashboard
- Admin Pages
- Website UI

Do NOT place AI business logic here.

---

# studio/

Contains

Sanity Studio

Only CMS functionality.

Sub-directories

- schemas/core/ — Shared UCO field definitions (universalFields.ts)
- schemas/objects/ — Reusable object schemas (seoMetadata, aiMetadata, affiliateMetadata, publishingMetadata, qualityMetadata, relationshipMetadata, validationMetadata, imageMetadata, searchMetadata)
- schemas/documents/ — Document type schemas (product, article, category, brand, merchant, manufacturer, collection, affiliateOffer, tool, aiKnowledge, review, author, siteSettings, navigation, redirect)

---

# public/

Contains

- Static Images
- Icons
- Logos
- Fonts

---

# docs/

Contains

Project documentation.

Examples

- MASTER_ARCHITECTURE.md
- IMPLEMENTATION_PLAN.md
- DEVELOPMENT_RULES.md
- PROJECT_STRUCTURE.md

---

# docker/

Contains

Docker configuration.

Examples

- docker-compose.yml
- Dockerfiles
- Docker scripts

---

# workflows/

Contains

n8n workflow infrastructure and modular workflow modules.

Structure

- core/ (BaseWorkflow, WorkflowRegistry, WorkflowValidator, WorkflowLoader, types)
- master/ (Master Workflow — request dispatch)
- product/ (Product Workflow — URL/link validation)
- category/ (Category Workflow — category assignment pipeline)
- content/ (Content Workflow — content generation pipeline)
- search-intelligence/ (Search Intelligence Workflow — SEO/AEO/GEO pipeline)
- quality/ (Quality Workflow — quality validation pipeline)
- publisher/ (Publisher Workflow — draft saving, never auto-publish)
- logging/ (Logging Workflow — execution telemetry)

One folder per workflow module.

Only workflows belong here.

---

# prompts/

Contains

AI Prompt Templates.

Examples

- Product Prompt
- SEO Prompt
- Article Prompt
- Category Prompt

Never hardcode prompts into JavaScript or TypeScript.

---

# config/

Contains

Configuration files.

Examples

- AI Config
- Plugin Config
- Merchant Config
- Website Config

No business logic.

---

# scripts/

Contains

Maintenance scripts.

Examples

- Backup
- Migration
- Import
- Export
- Utilities

---

# core/

Contains

Core data models and domain entities.

Examples

- Universal Content Object (UCO)
- Domain Enums
- Core Types
- AI Engine Infrastructure (core/ai)
  - Prompts (core/ai/prompts)
  - Caching (core/ai/cache)
  - Telemetry (core/ai/telemetry)
  - Resilience (core/ai/resilience)

No business logic. Only domain models.

---

# lib/

Contains

Reusable helper libraries.

Examples

- API Clients
- Database Helpers
- Shared Utilities

Keep business logic out of lib whenever possible.

---

# shared/

Contains

Resources shared across the entire project.

Examples

- Constants
- Validators
- Enums
- Common Models

---

# types/

Contains

TypeScript interfaces.

Examples

- Product
- Category
- Merchant
- Workflow
- AI Response

No implementation.

Only types.

---

# agents/

Contains

AI Agents and the Core Agent Framework.

Examples

- core/ (AgentRegistry, AgentFactory, BaseAgent)
- product-intelligence/ (Product Intelligence Agent)
- category-intelligence/ (Category Intelligence Agent)
- search-intelligence/ (Search Intelligence Agent)
- publisher/ (Publisher Agent)

One folder per agent.

Each agent should remain independent and inherit from core/BaseAgent.

---

# providers/

Contains

AI providers.

Examples

- Ollama
- OpenAI
- Gemini
- Anthropic
- OpenRouter

The AI Manager selects providers.

---

# plugins/

Contains

Extension modules.

Examples

- Amazon Plugin
- Impact Plugin
- CJ Plugin
- Pinterest Plugin
- Analytics Plugin

Plugins should never modify the core system.

---

# memory/

Contains

Business memory.

Examples

- Knowledge Memory
- Learning Memory
- Prompt Memory
- Category Memory

Only memory management.

---

# events/

Contains

Universal Event System.

Examples

- Event Types
- Event Dispatcher
- Event Subscribers

Every important action should generate an event.

---

# logs/

Contains

Application logs.

Examples

- Workflow Logs
- AI Logs
- Error Logs
- Plugin Logs

Generated automatically.

---

# data/

Contains

Runtime data.

Examples

- PostgreSQL
- n8n Database
- Runtime Storage

Do not store source code here.

---

# backups/

Contains

Project backups.

Examples

- Database Backups
- Workflow Backups
- Configuration Backups

---

# images/

Contains

Generated assets.

Examples

- AI Images
- Prompt Images
- Documentation Images

---

# File Naming Standards

Use

PascalCase

Examples

ProductAgent.ts

AIManager.ts

CategoryValidator.ts

---

Configuration

Use

camelCase

Examples

aiConfig.ts

pluginConfig.ts

---

Markdown

Use

UPPER_SNAKE_CASE

Examples

MASTER_ARCHITECTURE.md

IMPLEMENTATION_PLAN.md

PROJECT_STRUCTURE.md

---

# Folder Rules

Every folder must have one responsibility.

Avoid generic folders.

Avoid duplicated functionality.

Never create folders such as

utils2

helpers_new

common_final

shared_old

core2

Use existing architecture.

---

# Architecture Rules

Every new module should belong to one existing folder.

If a new folder appears necessary

Update

PROJECT_STRUCTURE.md

before implementation.

---

# AI Developer Instructions

Before creating any file

Determine

- Which folder owns the feature.
- Whether an existing module already exists.
- Whether the feature belongs to a plugin.
- Whether the feature belongs to an AI Agent.

Never guess folder locations.

Always follow this document.

---

# Final Principle

A clean folder structure produces a maintainable project.

Every file should have one obvious location.

Every folder should have one clear responsibility.

Organization is part of the architecture.