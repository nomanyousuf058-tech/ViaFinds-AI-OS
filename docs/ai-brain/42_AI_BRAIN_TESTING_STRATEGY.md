# 42 AI BRAIN TESTING STRATEGY

## The Non-Deterministic Testing Problem
Standard unit tests (Jest) fail when testing LLMs because the output varies. 

## The Dual Testing Approach

### 1. Deterministic Unit Tests (Mocked LLM)
- The Tool Registry, Database Adapters, and Orchestration logic must be 100% unit tested.
- **Method**: Set `DEV_MOCK_AI=true`. Verify that if the Orchestrator receives task `X`, it calls tool `Y`. Do not test the text generated.

### 2. Probabilistic Integration Tests (Live LLM)
- The Strategy Engine and Quality Gate must be tested against live models.
- **Method**: Use a specialized script (e.g., `scripts/qa-brain.js`).
- Provide the Brain with 10 historical analytics snapshots.
- Measure how many times the Brain makes the "correct" strategic choice based on a human-defined rubric. 
- *Acceptance Criteria*: The Brain must score > 85% on the rubric to pass CI.
