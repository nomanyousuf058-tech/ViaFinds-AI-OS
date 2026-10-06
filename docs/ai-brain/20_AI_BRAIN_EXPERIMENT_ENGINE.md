# 20 AI BRAIN EXPERIMENT ENGINE

## Purpose
To systematically test hypotheses without contaminating the entire site's strategy.

## Experiment Lifecycle
1. **Hypothesis**: The Strategy Engine proposes: "Changing the CTA button from 'Check Price' to 'Get 50% Off' will increase CTR."
2. **Baseline**: The Experiment Engine queries current CTR (e.g., 2%).
3. **Execution**: The Engine queues an automation job to update 10 specific articles with the new CTA.
4. **Measurement**: The Engine sets a timer (e.g., 14 days) and monitors `PostHog` analytics specifically for those 10 URLs.
5. **Result**: Calculates statistical significance. If the new CTA yields 4% CTR, it declares success.
6. **Decision & Memory**: Writes the winning result to `brain_memory`.
7. **Rollout**: The Orchestrator queues jobs to update ALL applicable articles with the winning CTA.

## Statistical Rigor
The Brain must be programmed to understand when an experiment lacks sufficient data. If an article only gets 5 clicks, the Brain must NOT declare a winning A/B test. It must extend the measurement period or flag it as "Inconclusive".
