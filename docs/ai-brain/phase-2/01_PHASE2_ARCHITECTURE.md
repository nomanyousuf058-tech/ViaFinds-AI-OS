# 01 PHASE 2 ARCHITECTURE

## Overview
Phase 2 transforms the Brain from a passive observer to an active strategic intelligence layer capable of reasoning, researching, proposing opportunities, generating strategies, and requesting implementations. 

## Flow
1. **Trigger**: Admin selects a specific strategic Task in the new Brain Task Center (e.g., "Competitor Research" or "Market Analysis").
2. **Context + Request**: The `wakeBrain` logic from Phase 1 is expanded. A Task sends both the global `BrainContext` and the specific Task goals to the LLM via `AIRouter`.
3. **Analysis Loop**: The LLM acts as the Task Engine, Opportunity Engine, and Strategy Engine simultaneously based on its prompt structure.
4. **Auto-Extraction**:
   - The API extracts structured `findings` (Evidence).
   - Extracts `opportunities` (Opportunity Engine).
   - Extracts a `strategy_proposal` (Strategy Engine).
   - Extracts `implementation_requests` (Code generation requests).
5. **Storage**: All objects are stored in dedicated PostgreSQL tables (`brain_tasks`, `brain_opportunities`, `brain_strategies`, `brain_implementation_requests`).
6. **Approval Workflow**: Admin reviews Proposals and can Approve or Reject them. Execution is NOT permitted yet.
