# 31 AI BRAIN REVENUE INTELLIGENCE

## Purpose
The Brain must optimize for profit, not just pageviews. Revenue Intelligence tracks the financial performance of content and strategies.

## The Tracking Gap
Currently, ViaFinds tracks affiliate links using standard hop-links. To grant the Brain true revenue visibility:
1. **Sub-ID Tracking**: The Brain must automatically inject a unique Sub-ID into every affiliate link it generates (e.g., `?subid=article_123_cta_1`).
2. **Postback / API Ingestion**: The Brain must have a Tool to read the Digistore24/ClickBank API to correlate sales back to that specific Sub-ID.

## Profitability Analysis
The Brain calculates Earnings Per Click (EPC) and Earnings Per Article. 

**Logic Flow**:
1. Brain queries Analytics: Article X had 1000 visitors and 100 CTA clicks.
2. Brain queries Revenue API: Sub-ID `article_X` generated $50.
3. Brain calculates: EPC = $0.50. RPM (Revenue per Mille) = $50.
4. Brain stores this in the Knowledge Graph.

## Actionable Strategy
If an article has high traffic but low EPC, the Brain flags it as an Opportunity. It spawns an Experiment Task to swap the affiliate product for a higher-converting alternative.
