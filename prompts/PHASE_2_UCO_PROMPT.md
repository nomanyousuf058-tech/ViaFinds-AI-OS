# ViaFinds AI OS
# Phase 2
## Universal Content Object (UCO)

Read first:

- docs/MASTER_ARCHITECTURE.md
- docs/IMPLEMENTATION_PLAN.md
- docs/PROJECT_STRUCTURE.md
- docs/DEVELOPMENT_RULES.md

Do NOT skip this step.

--------------------------------------------------

OBJECTIVE

Build the Universal Content Object (UCO).

This becomes the single data model used everywhere in ViaFinds AI OS.

Everything must be built around it.

Do NOT build AI.

Do NOT build Sanity schemas.

Do NOT build n8n workflows.

Do NOT build business logic.

Only build reusable TypeScript models.

--------------------------------------------------

Create new folder

core/uco/

--------------------------------------------------

Create

UniversalContent.ts

ContentType.ts

Metadata.ts

SeoMetadata.ts

AiMetadata.ts

AffiliateMetadata.ts

PublishingMetadata.ts

Relationship.ts

Validation.ts

Quality.ts

Lifecycle.ts

Source.ts

Status.ts

index.ts

--------------------------------------------------

Universal Content Object must support

Products

Categories

Articles

Brands

Merchants

Collections

Affiliate Offers

Tools

AI Knowledge

Future Content Types

--------------------------------------------------

Every object must have

UUID

Content Type

Title

Slug

Description

Summary

Tags

Language

Created Date

Updated Date

Version

--------------------------------------------------

SEO Metadata

Meta Title

Meta Description

Canonical URL

OpenGraph

Twitter Card

Robots

Structured Data Placeholder

Primary Keyword

Secondary Keywords

Search Intent

--------------------------------------------------

AI Metadata

AI Confidence

AI Quality Score

AI Source

AI Model

Prompt Version

Generated Time

Validation Status

Human Approval

--------------------------------------------------

Affiliate Metadata

Merchant

Network

Affiliate URL

Original URL

Commission

Currency

Availability

Price

Price History Placeholder

--------------------------------------------------

Publishing Metadata

Draft

Pending AI

Pending Review

Approved

Published

Archived

Deleted

--------------------------------------------------

Relationship Metadata

Parent

Children

Related

Similar

Cross References

Collections

--------------------------------------------------

Validation Metadata

Required Fields

Slug Validation

Duplicate Check Placeholder

Reference Validation

Publishing Validation

--------------------------------------------------

Quality Metadata

Content Score

SEO Score

Affiliate Score

Completeness Score

Overall Score

--------------------------------------------------

Lifecycle Metadata

Created

Modified

Reviewed

Published

Archived

--------------------------------------------------

Source Metadata

Manual

API

Merchant Feed

AI

Import

Search Console

Future Sources

--------------------------------------------------

Requirements

Use interfaces where appropriate.

Use enums where appropriate.

Everything must be reusable.

Everything must be documented.

No duplicated code.

No business logic.

No database code.

No Sanity code.

No AI execution.

No n8n code.

--------------------------------------------------

Architecture Rules

Everything must import from

core/uco

Never redefine metadata elsewhere.

Future AI Agents must reuse these models.

Future Sanity Schemas must reuse these models.

Future Plugins must reuse these models.

Future Workflows must reuse these models.

--------------------------------------------------

Validation

Run

npx tsc --noEmit

Fix every error.

--------------------------------------------------

STOP

Do not continue to Phase 3.

Generate completion report.

Wait for approval.