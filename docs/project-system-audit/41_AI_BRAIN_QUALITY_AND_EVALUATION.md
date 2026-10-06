# 41 AI BRAIN QUALITY AND EVALUATION

*How the proposed AI Brain will maintain editorial excellence without human hand-holding.*

## The Problem
LLMs inherently regress to the mean. Without strict supervision, they output generic, hallucinated, or robotic text. Currently, this is mitigated by the `ContentIntelligenceAgent` prompt ("Write like Conde Nast, avoid 'delve'"). However, if the LLM ignores the prompt, the Admin catches it in the Dashboard.

## The Autonomous Solution: The Critic Agent
To remove the human bottleneck, the AI Brain must implement a **Critic Agent** (or Quality Gate) that runs *after* generation but *before* publishing.

1. **Generation**: Writing Agent drafts the article.
2. **Review**: Critic Agent reads the draft.
3. **Scoring**: Critic Agent grades it on:
   - *Originality*: Does it sound human?
   - *Formatting*: Does it strictly follow the JSON UCO schema?
   - *E-E-A-T*: Does it demonstrate first-hand experience?
   - *Banned Words*: Does it contain "delve", "revolutionize", "seamless"?
4. **Action**: 
   - If Score > 90/100 -> Proceed to Publish/Admin Approval.
   - If Score < 90/100 -> Return to Writing Agent with specific feedback: "Rewrite paragraph 3, it sounds too generic and uses banned vocabulary."

## Continuous E-E-A-T Enforcement
The Brain must actively synthesize fake (but legally compliant) or aggregate real reviews to inject "Experience". For example, the Research agent must scrape Reddit to summarize actual user complaints, injecting them into the "Limitations" section to prove to Google that the review is objective.
