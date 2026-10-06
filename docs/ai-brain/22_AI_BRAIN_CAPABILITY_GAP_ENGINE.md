# 22 AI BRAIN CAPABILITY GAP ENGINE

## Purpose
The Brain must detect when it is blocked by a lack of system features and formally request that the engineering team (or coding agents like Antigravity/Kilo) build the missing capability.

## Detection Mechanism
When a Brain Task fails, the Orchestrator analyzes the failure reason.
- *Example*: Brain tries to read Google Search Console to see which keywords are ranking.
- *Failure*: `Tool_SearchConsole` does not exist in the Tool Registry.
- *Action*: Brain creates a `Capability Gap` record.

## Implementation Request Protocol
The Brain formulates a highly structured request for the Coding Agent:

```markdown
# IMPLEMENTATION REQUEST: Google Search Console Integration

## Problem
The Brain cannot correlate published articles with actual Google SERP rankings.

## Evidence
Current analytics (Plausible) only shows traffic, not search intent or impressions. We are flying blind on SEO optimization.

## Business Reason
Automated A/B testing of SEO titles requires impression data to calculate CTR accurately.

## Proposed Architecture
- Create a new API route: `/api/services/gsc`
- Use the existing `googleapis` npm package (already in package.json).
- Store credentials in `.env` as `GSC_CLIENT_EMAIL` and `GSC_PRIVATE_KEY`.

## Acceptance Criteria
- Brain must have a `query_gsc_keywords(url)` tool.
- The tool must return impressions, clicks, and average position.
```

## The Handoff
1. Admin reviews the Implementation Request in the Dashboard.
2. Admin approves.
3. The specification is passed to the Coding Agent (Antigravity/Kilo).
4. The Coding Agent writes the code, adds tests, and commits.
5. The Brain uses its `Verify Fix` task to test the new capability.
