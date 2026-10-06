# 04 AI BRAIN MEMORY ARCHITECTURE

## Concept
Memory is structured and categorized. The Brain does NOT just append massive conversation logs. It distills interactions into discrete, manageable records.

## Memory Types
1. **System Facts**: Immutable or slowly changing technical truths (e.g., "The site runs on Next.js").
2. **Business Facts**: Verified data (e.g., "Digistore24 pays out on net-30 terms").
3. **Audience Knowledge**: (e.g., "Our demographic prefers short-form content over 5000-word guides").
4. **Competitor Knowledge**: (e.g., "Competitor X dominates the 'AI SaaS' keyword cluster").
5. **Lessons Learned**: (e.g., "Attempting to scrape site Y results in an IP ban. Use API instead").
6. **Policies**: Admin-enforced rules (e.g., "Never promote products rated under 3 stars").

## Schema Details (`brain_memory` table)
- `id`: UUID
- `type`: Enum (as listed above)
- `content`: JSONB (The actual memory payload)
- `source`: String (e.g., 'EvaluationEngine', 'AdminOverride')
- `source_reference`: String (e.g., `automation_job_id` that generated the lesson)
- `created_at`: Timestamp
- `updated_at`: Timestamp
- `confidence`: Float (0.0 - 1.0). (Memory decays if proven wrong, strengthens if proven right).
- `status`: Enum (active, deprecated, forgotten)
- `importance`: Integer (1-10) used for context window prioritization.
- `valid_from` / `expires_at`: Timestamps for temporal memory (e.g., "Current pricing is $50" expires in 30 days).
- `superseded_by`: UUID (Self-referential link for updated facts).

## Memory Lifecycle
1. **Ingestion**: Evaluation Engine notes that an article format failed to convert.
2. **Distillation**: A background LLM task summarizes this into a concise Rule: "Avoid Listicle format for High-Ticket B2B software."
3. **Storage**: Rule inserted into `brain_memory` with Confidence 0.6.
4. **Retrieval**: Context Builder queries `brain_memory` where `type = 'Policy' OR type = 'Lesson'` when crafting a prompt for the next SaaS article.
5. **Reinforcement**: If the new format succeeds, Confidence is boosted to 0.8.
