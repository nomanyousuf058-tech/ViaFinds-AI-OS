# 17 AI BRAIN QUALITY GATE

## Purpose
A unified checkpoint that evaluates content *before* it is presented to the Admin for publishing, or before autonomous publishing occurs.

## Evaluation Criteria
The Quality Gate (Critic Agent) checks:
1. **Originality/Value**: Is this just regurgitated text, or does it offer a unique angle?
2. **Evidence**: Are claims supported by the `research_context` provided by the Brain?
3. **Affiliate Accuracy**: Are the hop-links correctly formatted and returning 200 OK?
4. **JSON Schema**: Does the output perfectly match the Universal Content Object (UCO) block structure?
5. **SEO/GEO/AEO**: Are keywords present? Are headings structured for AI overviews?
6. **E-E-A-T**: Does the text project Experience and Trust?
7. **Banned Words**: Are cliché AI phrases ("delve", "in conclusion") absent?

## Failure Workflow
If the Quality Gate fails the content:
1. **Diagnose**: "The JSON is valid, but the CTA block is missing the affiliate URL."
2. **Find Solution**: Extract the URL from the initial Brain Task.
3. **Execute Fix**: Pass the draft back to the `AIRouter` with instructions to inject the CTA.
4. **Retry**: Run Quality Gate again.
5. **Learn**: If this specific failure happens 3 times, log a Capability Gap or Memory Rule ("The Writing prompt must explicitly demand the CTA block").
