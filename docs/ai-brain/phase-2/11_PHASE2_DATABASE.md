# 11 PHASE 2 DATABASE

## Overview
Added Phase 2 tables seamlessly via migrations without altering existing Phase 1 or core system tables.

## Changes (`schema.sql` / `migrations.ts`)
- `brain_strategies`: Overarching business plans.
- `brain_opportunities`: Actionable ideas.
- `brain_tasks`: Directives given to the Brain.
- `brain_implementation_requests`: Feature specs.
- RLS enabled on all tables.
- Foreign keys set up safely (e.g., `strategy_id UUID REFERENCES brain_strategies(id) ON DELETE SET NULL`).

## Access Pattern
- Defined `BrainRepository` utilizing the project's native `Pool` connection pattern instead of direct frontend Supabase client usage, fixing a Phase 1 oversight.
