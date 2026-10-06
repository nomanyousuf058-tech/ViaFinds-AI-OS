# 03 PHASE 2 STRATEGY ENGINE

## Overview
The Strategy Engine generates overarching game plans for the business, moving beyond simple article ideas to full strategic shifts (e.g., moving from pure affiliate to an owned-product model).

## Implementation
- **Data Model**: `brain_strategies`
- **Fields**: `title`, `description`, `business_goal`, `evidence`, `expected_impact`, `confidence`, `risks`, `status`.
- **Status Lifecycle**: `proposed` -> `approved` or `rejected`.

## Capabilities
When a Task runs and finds a major shift is required (e.g., "We have enough traffic to justify an owned digital product"), the LLM returns a structured Strategy Proposal.
The UI exposes this in the "Strategies" tab, allowing the Admin to review the evidence and formally Approve or Reject the pivot.
This ensures human oversight over major business direction changes.
