# 08 PHASE 2 EVIDENCE

## Overview
Every output must separate internal fact from AI inference.

## Implementation
- The LLM prompt enforces the schema: `{ "fact": "...", "inference": "...", "confidence": "..." }`.
- Facts are stored distinctly from the resulting Opportunities and Strategies.
- The UI exposes both Facts (Findings) and Inferences (Recommendations) side-by-side so the human operator can verify the LLM's logic before approving a strategy.
