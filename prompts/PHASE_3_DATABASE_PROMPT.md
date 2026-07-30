# ViaFinds AI OS
# Phase 3
## Database Layer (Sanity CMS)

Read these documents BEFORE writing any code.

- docs/MASTER_ARCHITECTURE.md
- docs/IMPLEMENTATION_PLAN.md
- docs/PROJECT_STRUCTURE.md
- docs/DEVELOPMENT_RULES.md

Also review the current codebase.

Do NOT rebuild existing functionality.

Do NOT duplicate existing models.

Only extend the architecture.

--------------------------------------------------

OBJECTIVE

Build the complete Database Layer for ViaFinds AI OS using Sanity CMS.

The database MUST implement the Universal Content Object (UCO) created in Phase 2.

The UCO is the single source of truth.

Sanity is only the storage layer.

Do NOT modify the UCO architecture.

--------------------------------------------------

DO NOT BUILD

- AI Agents
- Ollama Integration
- n8n Workflows
- Business Logic
- Automation
- API Imports
- Publisher Logic

This phase only prepares the CMS.

--------------------------------------------------

Create Sanity schemas for

Universal Content

Product

Category

Article

Brand

Merchant

Collection

Affiliate Offer

Tool

AI Knowledge

--------------------------------------------------

Create reusable object schemas

SEO Metadata

AI Metadata

Affiliate Metadata

Publishing Metadata

Quality Metadata

Relationship Metadata

Validation Metadata

Image Metadata

Search Metadata

--------------------------------------------------

Every schema must reuse existing UCO models.

Never redefine metadata.

Never duplicate fields.

--------------------------------------------------

Universal fields

UUID

Content Type

Title

Slug

Description

Summary

Language

Tags

Created Date

Updated Date

Version

--------------------------------------------------

SEO

Meta Title

Meta Description

Canonical URL

Open Graph

Twitter

Primary Keyword

Secondary Keywords

Search Intent

Robots

Structured Data Placeholder

--------------------------------------------------

Affiliate

Merchant

Affiliate Network

Affiliate URL

Original URL

Commission

Currency

Availability

Price

Priority

--------------------------------------------------

Publishing

Draft

Pending AI

Pending Review

Approved

Published

Archived

Deleted

--------------------------------------------------

AI

Confidence

Quality Score

Model

Prompt Version

Generation Time

Validation

Human Approval

--------------------------------------------------

Relationships

Parent

Children

Related

Similar

Collections

Cross References

--------------------------------------------------

Validation

Required Fields

Slug Validation

Duplicate Placeholder

Reference Validation

Publishing Validation

SEO Validation

--------------------------------------------------

Indexes

Slug

UUID

Content Type

Category

Brand

Merchant

Publishing Status

Quality Score

--------------------------------------------------

Studio

Organize the Studio cleanly.

Group schemas logically.

Use icons where appropriate.

Prepare for future scalability.

--------------------------------------------------

Requirements

Reuse existing TypeScript models whenever possible.

No duplicated schema definitions.

Clean code.

Strong typing.

Production quality.

--------------------------------------------------

Validation

Run

npx tsc --noEmit

Fix every TypeScript error.

--------------------------------------------------

Documentation

Update

docs/PROJECT_STRUCTURE.md

if new folders are created.

--------------------------------------------------

STOP

Do NOT continue to Phase 4.

Generate a completion report.

Wait for human approval.