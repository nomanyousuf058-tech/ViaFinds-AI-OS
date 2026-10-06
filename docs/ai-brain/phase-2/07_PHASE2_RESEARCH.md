# 07 PHASE 2 RESEARCH

## Overview
The Brain relies on the Admin to define research parameters via Tasks.

## Implementation
- Tasks are created with a `goal` (e.g., "Research competitor gaps in the productivity space").
- Currently, research is simulated via the LLM's internal knowledge base and the system's `BrainContext`.
- Future integration will pass these tasks out to `Agent Reach` (external web search).
