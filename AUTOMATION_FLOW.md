# ViaFinds AI OS — Automation Flow

**Version:** 2.0 (Simplified)
**Last Updated:** 2026-08-21

---

## Daily Automation Pipeline

```
TREND DISCOVERY
    ↓
Discover trending topics in Luxury Beauty + Digital Products
Sources: Google Trends, SerpAPI, Digistore24
    ↓

OPPORTUNITY SCORING
    ↓
Score each opportunity based on:
- Search demand
- Trend direction
- Affiliate availability
- Commercial intent
- Conversion potential
Select top 10 opportunities per day
    ↓

AFFILIATE MATCHING
    ↓
For each selected opportunity:
- Search Digistore24 for matching products
- Validate affiliate availability
- Extract product details
- Assign to correct niche category
    ↓

ARTICLE STRATEGY
    ↓
For each matched opportunity:
- Determine article type (Review, Guide, Discovery)
- Create outline
- Plan affiliate link placement
- Assign to category
    ↓

CONTENT GENERATION
    ↓
Generate article using ContentIntelligenceAgent:
- Human-style editorial voice
- Conversational, storytelling-first
- No robotic AI phrasing
- Natural affiliate link embedding
- Minimum 8-12 content blocks
    ↓

SEO + IMAGE CHECK
    ↓
- Generate SEO metadata (title, description, keywords)
- Check/select featured image
- Validate image relevance
- Ensure no broken images
    ↓

DRAFT REVIEW
    ↓
- Create draft in Sanity
- Run quality checks
- Validate category assignment
- Check for duplicates
- Verify affiliate links
    ↓

PUBLISH
    ↓
- If quality score passes: publish immediately
- If quality score fails: keep as draft for review
- Update publish metrics
    ↓

SOCIAL DISTRIBUTION
    ↓
For each connected social platform:
- Generate platform-specific content
- Pinterest: SEO title, pin description, image concept
- Schedule distribution
    ↓

TRACK PERFORMANCE
    ↓
- Record publication metrics
- Log automation run
- Update trend scores based on performance
- Feed data back into opportunity scoring
```

---

## Scheduling

### Daily Automation
- **Trigger:** Vercel Cron (daily at 06:00 UTC)
- **Endpoint:** `/api/cron/sync`
- **Secret:** `CRON_SECRET` environment variable
- **Quota:** Maximum 10 articles per day
- **Window:** 06:00-22:00 UTC

### Article Distribution
- 10 articles spread across 16 active hours
- ~1 article every 1.5 hours
- Pauses outside active window
- Pauses when daily quota reached

---

## Quality Gates

Before publishing, verify:
- [ ] Title is compelling and editorial
- [ ] Content is 1000+ words of substantive prose
- [ ] No generic AI phrases ("In today's fast-paced world...")
- [ ] No star ratings or comparison tables
- [ ] Affiliate links are contextual and useful
- [ ] Category is Luxury Beauty or High-Ticket Digital Products
- [ ] SEO metadata is complete
- [ ] Featured image exists
- [ ] No duplicate content

If any check fails → **DRAFT ONLY**, do not publish.

---

## Error Handling

| Failure | Action |
|---------|--------|
| AI provider fails | Try fallback provider |
| Sanity write fails | Log error, retry once |
| Image generation fails | Use placeholder, flag for review |
| Affiliate API fails | Skip affiliate links, publish without |
| Daily quota reached | Pause until next day |
| Outside publish window | Sleep 5 minutes, check again |

---

*Automation flow documented by Kilo — ViaFinds AI OS Principal System Architect*
