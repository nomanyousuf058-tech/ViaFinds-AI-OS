# 12 AI BRAIN BUSINESS INTELLIGENCE

## Purpose
The Business Intelligence (BI) module connects the Brain to reality. Without it, the Brain is just a text generator. With it, the Brain understands the business funnel.

## The Business Funnel
The BI module must synthesize data across this exact funnel:
`Traffic` $\rightarrow$ `Audience` $\rightarrow$ `Intent` $\rightarrow$ `Content` $\rightarrow$ `Offer` $\rightarrow$ `CTA Click` $\rightarrow$ `Conversion` $\rightarrow$ `Revenue`

## Diagnostic Capabilities
When revenue or traffic drops, the Brain must diagnose the bottleneck:
- **Technical**: Is the site down? (Check `Sentry` / Health API).
- **Traffic**: Did rankings drop? (Check Search Console / Plausible).
- **Content**: Are users bouncing? (Check Plausible time-on-page).
- **Offer**: Are users clicking the CTA but not buying? (Check Digistore24 conversion rates vs PostHog CTA clicks).

## Anti-Patterns to Avoid
- **Blind Optimization**: Do not let the Brain optimize *only* for highest commission percentage. A 50% commission product with a 0.1% conversion rate is worse than a 10% commission product with a 5% conversion rate. The BI module must calculate *Earnings Per Click (EPC)*.
