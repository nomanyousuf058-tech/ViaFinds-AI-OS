# 13 AI BRAIN OPPORTUNITY ENGINE

## Purpose
Translates high-level Strategy into specific execution targets.

## Workflow
1. **Input**: Strategy Engine outputs: "Focus on AI Video Editors."
2. **Scan Internal Database**: Checks `products` table for known AI Video Editors.
3. **Scan Content Gaps**: Checks `articles` table to see if we have reviewed them.
4. **Agent Reach**: If internal data is sparse, dispatches a research task: "Find trending AI Video affiliate programs."
5. **Scoring**: Ranks the discovered opportunities based on:
   - Search Volume / Demand (from Search Console / Trends)
   - Competition (from SERP analysis)
   - Margin/Commission (from Product Intelligence)
6. **Output**: Passes the top 3 ranked opportunities to the Task Engine.

## Example Output
```json
{
  "opportunity_id": "opp_123",
  "type": "NEW_ARTICLE",
  "topic": "Runway Gen-3 Review",
  "reasoning": "High search velocity detected. 30% commission available. No existing content on site.",
  "expected_impact": "High"
}
```
