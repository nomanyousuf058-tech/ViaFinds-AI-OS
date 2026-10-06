# 30 AI BRAIN ANALYTICS FEEDBACK

## Purpose
The Strategy Engine requires raw data to make decisions. The Analytics Feedback module is responsible for ingesting, normalizing, and storing performance data.

## Integration Points
ViaFinds `.env` supports PostHog, Plausible, and Mixpanel.

### The Normalization Layer
Because the user might switch from Plausible to PostHog, the Brain must NOT depend on provider-specific data shapes.

**Concept: `NormalizedMetrics`**
```typescript
interface NormalizedMetrics {
  url: string;
  date_range: [Date, Date];
  pageviews: number;
  unique_visitors: number;
  bounce_rate: number;
  avg_time_on_page: number;
  events: {
    cta_clicks: number;
    newsletter_signups: number;
  }
}
```

## The Feedback Loop
1. **Fetch**: The `query_analytics` Tool hits the active provider's API.
2. **Normalize**: Converts the response to `NormalizedMetrics`.
3. **Correlate**: Maps the metrics back to the specific `article_id` and `strategy_id` that generated the content.
4. **Evaluate**: Passes the correlated data to the Evaluation Engine ("Did Strategy V2 meet the 5% CTR goal?").
