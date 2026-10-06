# 04 PHASE 2 OPPORTUNITY ENGINE

## Overview
While Strategies are massive overarching plans, Opportunities are specific, actionable items (e.g., "Write a comparison article for Product A vs B").

## Implementation
- **Data Model**: `brain_opportunities`
- **Types**: Content, Product, Technical, Revenue.
- **Fields**: `title`, `type`, `description`, `evidence`, `confidence`, `potential_impact`, `effort`, `risk`, `recommended_action`.

## Auto-Creation
When the Brain Task Engine runs, it generates an array of specific opportunities based on its findings. The API automatically inserts these into the `brain_opportunities` table, where they appear in the Admin Dashboard for review.
