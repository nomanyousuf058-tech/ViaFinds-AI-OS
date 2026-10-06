# 02 PHASE 2 TASK ENGINE

## Overview
The Task Engine allows the Brain to focus its analysis on specific strategic investigations rather than just running a generic "wake up" cycle.

## Implementation
- **Location**: `lib/brain/tasks/` (via `BrainRepository` and `app/api/brain/tasks/`)
- **Types of Tasks Supported**:
  - Content Strategy Research
  - Competitor Research
  - Market Research
  - SEO Audit
  - Product Opportunity Research
  - Owned Product Research
  - Affiliate Product Research
  - Website Audit
  - Strategy Review

## Data Model (`brain_tasks`)
- `type`, `title`, `goal`, `priority`
- `status`: queued -> running -> waiting_approval -> completed/failed
- `evidence`: JSON block capturing findings from the run.
- `recommendation`: The strategic summary.
- `approval_state`: Tracks if the resulting strategy was approved.
