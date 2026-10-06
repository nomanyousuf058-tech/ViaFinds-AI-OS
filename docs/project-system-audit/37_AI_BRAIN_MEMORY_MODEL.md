# 37 AI BRAIN MEMORY MODEL

*How the proposed AI Brain will remember and learn.*

## The Gap
Currently, the pipeline is stateless. If it generates a bad article today, and an admin rejects it, the pipeline might generate the exact same bad article tomorrow because it has no memory of the rejection.

## Short-Term Memory (Context Window)
- Used during active job execution.
- Managed by passing the `AgentContext` and `job.input`/`job.result` through the pipeline.
- Forgotten once the job is completed or failed.

## Long-Term Memory (The Knowledge Graph)
**Requirement**: A new vector database (e.g., Pinecone, or Supabase pgvector) or a specialized relational schema.

**What must be stored:**
1. **Brand Voice Guidelines**: "The admin previously corrected my use of the word 'delve'. I must remember to add 'delve' to the banned words list."
2. **Performance Memory**: "Article X generated 1,000 clicks but 0 conversions. The CTA placement might be poor."
3. **Market Memory**: "Product Y was rejected because it had terrible customer reviews on Reddit. Do not suggest Product Y again."

## Implementation Strategy
- Extend the `audit_logs` table to include a `feedback` column.
- When an Admin rejects a draft in the Dashboard, they provide a reason.
- A "Reflection Agent" runs nightly, summarizing the Admin feedback and appending it to the Brain's persistent `System Prompt` or vector store.
