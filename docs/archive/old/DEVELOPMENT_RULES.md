# ViaFinds AI OS
# Development Rules
Version 1.0

---

# Purpose

This document defines the mandatory development rules for every AI developer working on ViaFinds AI OS.

These rules apply to

- Antigravity
- ChatGPT
- Claude
- Gemini
- Future AI Coding Agents
- Human Developers

Violation of these rules is considered an architectural error.

MASTER_ARCHITECTURE.md always takes precedence.

---

# Rule 1

Always read

MASTER_ARCHITECTURE.md

before making any changes.

Never start coding without understanding the architecture.

---

# Rule 2

Always read

IMPLEMENTATION_PLAN.md

before writing code.

Only implement the current phase.

Never build future phases.

---

# Rule 3

Never rebuild existing features.

If functionality already exists

Improve it

Extend it

Refactor only when necessary.

Never duplicate code.

---

# Rule 4

Never change working code unless absolutely required.

Avoid unnecessary modifications.

Protect backward compatibility.

---

# Rule 5

Never hardcode

API Keys

Tokens

URLs

Secrets

Project IDs

Merchant IDs

Configuration Values

Everything belongs in configuration.

---

# Rule 6

Every module must have a single responsibility.

Examples

One Agent

One Workflow

One Utility

One Service

Avoid large multi-purpose files.

---

# Rule 7

Every file should be understandable without reading unrelated files.

Write clean

Simple

Readable

Maintainable code.

---

# Rule 8

Always validate

Input

Output

AI Responses

Affiliate Links

Images

Categories

SEO

Never trust external data.

---

# Rule 9

Every important operation must generate logs.

Log

Success

Failure

Warnings

Retries

Execution Time

Workflow ID

---

# Rule 10

Never delete production data automatically.

Never overwrite

Products

Articles

Categories

without approval.

Always preserve history.

---

# Rule 11

Never automatically publish content.

Version 1 requires

Human Approval

before publishing.

---

# Rule 12

Never create categories from a single product.

Categories should be created using

Search Console

Internal Search

Search Volume

Merchant Inventory

Product Trends

Business Growth

User Behaviour

Category creation should always improve the website.

---

# Rule 13

Never create unnecessary deep categories.

Maximum depth

5 Levels

Avoid structures like

Home

↓

Kitchen

↓

Electric Kettles

↓

1.7L Electric Kettles

↓

Black 1.7L Electric Kettles

Instead

Use filters

Attributes

Product Variants

not categories.

---

# Rule 14

Every affiliate network

API

CSV

XML

must convert products into the Universal Product Object.

Never allow merchant-specific logic inside AI Agents.

---

# Rule 15

Never let AI invent facts.

Unknown information should remain

Unknown

rather than hallucinated.

---

# Rule 16

Quality is more important than speed.

Publishing one excellent article is better than publishing ten poor articles.

---

# Rule 17

Every AI decision should include

Confidence Score

Reason

Source

where possible.

---

# Rule 18

Every workflow should be recoverable.

Failures should

Save Progress

Generate Logs

Allow Retry

Avoid restarting from the beginning.

---

# Rule 19

Every AI prompt should come from

Prompt Library

Never hardcode prompts inside

JavaScript

TypeScript

n8n

Workflows

---

# Rule 20

Every feature must be modular.

Future additions should be added as

Plugins

Extensions

Connectors

not by modifying the core architecture.

---

# Rule 21

When uncertain

Do not guess.

Search existing code.

Search architecture.

Search implementation plan.

Then implement.

---

# Rule 22

Documentation is mandatory.

Every major feature must update

MASTER_ARCHITECTURE.md

IMPLEMENTATION_PLAN.md

or related documentation.

Documentation is part of the software.

---

# Rule 23

Before completing any task verify

No errors

No duplicate code

No broken imports

No failed tests

Architecture respected

Documentation updated

---

# Rule 24

Every Git commit should represent one logical change.

Good examples

feat: add Product Intelligence Agent

fix: improve category validation

refactor: optimize AI manager

Avoid large unrelated commits.

---

# Rule 25

The final objective is not to automate everything.

The objective is to build a reliable, scalable, maintainable AI-powered affiliate business operating system that always prioritizes

User Value

Quality

Maintainability

Business Growth

Transparency

Human Control

over maximum automation.

---

# Final Instruction

When conflicts occur

Priority Order

1. DEVELOPMENT_RULES.md

2. MASTER_ARCHITECTURE.md

3. IMPLEMENTATION_PLAN.md

4. Existing Code

5. New Feature Request

If a requested change violates a higher-priority document, stop implementation and request clarification before proceeding.