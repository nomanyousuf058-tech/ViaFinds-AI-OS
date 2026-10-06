# 34 PROPOSED AI BRAIN ARCHITECTURE

*Conceptual Architecture ONLY. This represents the future state.*

## The Conceptual Stack

```text
========================================================================
                      [ THE USER / OWNER ]
                             | (Approves / Guides)
========================================================================
                          THE AI BRAIN
========================================================================
[ Memory & Context ]   [ Strategy Engine ]   [ Business Intelligence ]
(Vector DB / Graph)    (Goal Setting)        (Reads Analytics APIs)
          |                    |                       |
          +--------------------+-----------------------+
                               |
                      [ Master Orchestrator ]
             (Translates Strategy into actionable Tasks)
                               |
========================================================================
                      THE AGENTIC LAYER
========================================================================
  [ Research Agent ]   [ Writing Agent ]   [ QA / Critic Agent ]
  (Browses web/APIs)   (Drafts content)    (Evaluates Output)
          \                    |                    /
========================================================================
                 THE EXECUTION PIPELINE (Current viafinds code)
========================================================================
          [ Tool: Scrape URL ]   [ Tool: Format JSONB ]
          [ Tool: Generate Image ] [ Tool: Save to DB ]
                               |
========================================================================
                        THE DATABASE & UI
========================================================================
             [ Supabase ] <------> [ Next.js Frontend ]
```

## How It Works Together
1. **Strategy Engine** wakes up (cron or continuous loop).
2. It queries **Business Intelligence** (e.g., Plausible API): "Traffic for 'SEO tools' dropped 20% this week."
3. **Master Orchestrator** decides: "We need an updated guide on SEO tools."
4. **Research Agent** is dispatched to find the top 3 current SEO tools on Digistore24/ClickBank.
5. **Writing Agent** is dispatched (reusing `ContentIntelligenceAgent`) to draft the post.
6. **QA Agent** reviews the draft against the Brain's guidelines.
7. Execution Pipeline saves it to the Database as `awaiting_approval`.
8. User logs into Admin Dashboard and clicks Publish.
9. **Memory** stores: "Updated SEO tools guide published on [Date]. Awaiting analytics."
