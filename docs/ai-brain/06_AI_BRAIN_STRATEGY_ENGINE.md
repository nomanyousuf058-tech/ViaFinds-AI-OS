# 06 AI BRAIN STRATEGY ENGINE

## Purpose
The Strategy Engine is the highest-level cognitive loop. It answers "Why are we doing this?" and dictates the direction for the Opportunity and Task engines.

## Core Questions Handled
- What changed? (e.g., Traffic dropped 20%)
- Why did it change? (e.g., Google Core Update, Competitor outranked us)
- What opportunity does it create? (e.g., We need to update existing content with better E-E-A-T)
- What strategy should be considered? (e.g., "Content Refresh Strategy v1")

## Strategy Versioning
Strategies are explicit, versioned database records (`brain_strategies`).
- **Strategy V1**: Affiliate content engine (Current implementation).
- **Strategy V2**: Affiliate + Owned digital products.
- **Strategy V3**: Custom.

The Brain must NEVER assume V2 is the final model. It must operate under whichever Strategy is currently marked `status = 'active'`.

## The Strategy Loop
1. **Ingest**: Read Business Intelligence (Analytics) + Research Findings.
2. **Synthesize**: Use LLM to detect patterns ("We have 50 articles on AI tools, but the only ones converting are about Video AI").
3. **Formulate**: Generate a `Strategy_Document` (JSON).
4. **Approve**: If the strategy represents a major shift (e.g., stop writing about beauty, focus only on software), it pauses and flags the Admin for approval.
5. **Enact**: Pass the active Strategy to the Opportunity Engine.
