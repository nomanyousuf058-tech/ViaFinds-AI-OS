# 16 AI BRAIN AUTOMATION INTEGRATION

## CRITICAL RULE
**DO NOT replace `pipeline.ts`.** The Automation Pipeline is the Execution Engine. The Brain acts as the dispatcher.

## The Automation Adapter
The Brain interfaces with Automation via an Adapter module. When the Brain decides to write an article, it creates a payload and inserts it into the existing `automation_jobs` table.

## Contract / Payload
The Brain passes specific contextual parameters that the current `pipeline.ts` switch statements can process.

```json
{
  "type": "ARTICLE_GENERATION",
  "status": "queued",
  "input": {
    "strategy_id": "strat_v2_101",
    "task_id": "task_999",
    "goal": "Write a comparative review of X vs Y",
    "content_type": "comparison",
    "product_id": "prod_123",
    "partner_id": "digistore24",
    "research_context": "Product Y recently increased prices to $99/mo.",
    "target_audience": "Small Business Owners",
    "search_intent": "Transactional",
    "required_sources": ["url1", "url2"],
    "quality_requirements": "Strict E-E-A-T, no passive voice",
    "priority": "high",
    "approval_state": "requires_admin"
  }
}
```

## Feedback Loop
Once the pipeline finishes and sets the job to `completed` or `failed`, the Brain reads the `automation_jobs` table (via the Event Engine) and processes the result.
