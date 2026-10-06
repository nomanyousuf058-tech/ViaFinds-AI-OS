# 01 PROJECT EXECUTIVE SUMMARY

## Overview
ViaFinds is an AI-powered editorial publication platform specializing in High-Ticket Digital Products and Luxury Beauty. Built on Next.js 16.3 and React 19, the application features a public-facing magazine-style frontend and a sophisticated admin dashboard that orchestrates an AI "Automation Pipeline".

## Core Functionality (Verified from Code)
The system is fundamentally an **Automated Affiliate Content Engine**. 
1. **Discovery**: Identifies trending products across affiliate networks (e.g., Digistore24).
2. **Analysis**: Uses AI to perform competitor research and determine article strategy.
3. **Generation**: Employs multiple LLMs (routed dynamically) to write high-quality, editorial-style content rather than generic SEO spam.
4. **Optimization**: Applies multi-stage checks (E-E-A-T, SEO, GEO, AEO) before finalizing content.
5. **Publishing**: Saves content into a Supabase PostgreSQL database for the Next.js frontend to render.

## The Automation Engine
Instead of just static content management, ViaFinds runs a `pipeline.ts` that acts as a state machine. It manages jobs (`AutomationJob`) transitioning from `queued` -> `running` -> `awaiting_approval` -> `completed`. It uses an `AIRouter` that smartly falls back through different providers (Gemini, Groq, Mistral, OpenAI, Claude) if rate limits or errors occur.

## AI Brain Readiness
The current system is heavily automated but **not autonomous**. It follows rigid pipelines defined in code. 
- **Current State**: Executes tasks sequentially. Lacks memory, strategic pivot capabilities, and business performance feedback loops.
- **Future State (AI Brain)**: A true AI Brain will require a "Strategy Engine" to sit above the Automation Pipeline. The Brain will monitor analytics, decide *what* needs to be written (or what products should be created/promoted), and dispatch jobs to the Automation Pipeline. 

## Architectural Foundation
The foundation is extremely solid for scaling:
- **Framework**: Next.js App Router allows for React Server Components, keeping the frontend fast.
- **Database**: PostgreSQL with `pg` wire protocol is robust; the schema is well-normalized with full-text search capabilities built-in.
- **AI Infrastructure**: The `AIRouter` and `ProviderRegistry` offer extreme resilience against single-provider failure.
- **Agents**: The foundation for an Agentic Framework (`BaseAgent`) exists but is currently underutilized compared to the procedural `pipeline.ts`.

## Next Steps
To evolve into an autonomous system, the immediate next phase should focus on establishing the **Memory (Knowledge Graph)** and **Strategy Engine** components without disrupting the existing Automation Pipeline.
