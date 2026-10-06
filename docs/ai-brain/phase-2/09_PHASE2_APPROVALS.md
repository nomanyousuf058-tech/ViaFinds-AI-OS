# 09 PHASE 2 APPROVALS

## Overview
Phase 2 stops strictly at PROPOSAL + APPROVAL. 

## Implementation
- **Strategies**: Include a state machine (`proposed` -> `approved` | `rejected`).
- **UI**: The Strategies tab features explicit "Approve" and "Reject" action buttons.
- **Memory**: Clicking either button writes a `strategy_decision` record to `brain_memory` so the Brain learns what the Admin prefers over time.
- **Execution Barrier**: Approving a strategy currently only updates its status. It does NOT trigger `pipeline.ts`. This represents the hard boundary between Phase 2 and Phase 3.
