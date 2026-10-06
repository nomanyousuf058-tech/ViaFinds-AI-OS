# 41 AI BRAIN VERSIONING ROLLBACK

## Purpose
AI prompts and strategic weights are essentially code. A bad prompt update can cause the Brain to hallucinate across the entire site. Versioning and rollback are critical.

## Versioned Entities
1. **Prompts**: Managed in `core/ai/prompts/PromptLibrary.ts`. Every Brain prompt must be suffixed (e.g., `strategy_evaluator_v1`, `strategy_evaluator_v2`).
2. **Strategies**: Stored in `brain_strategies`. A Strategy is immutable once active. To change it, the Brain creates a new record and changes the `active` pointer.
3. **Memory Schemas**: If the JSON structure of `brain_memory` changes, a migration script must convert old memories, or a fallback parser must be used.

## Rollback Procedure
If the Evaluation Engine detects a massive drop in Quality Gate passes after a new Brain update:
1. The Admin clicks "Rollback Strategy" in the Dashboard.
2. The database updates `brain_strategies` to mark the previous version as active.
3. The Prompt Library reverts to `v1` strings.
4. Any `brain_tasks` spawned by the faulty `v2` strategy are marked `CANCELLED`.
