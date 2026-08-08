# AI Agent 12 — Trend Intelligence Manager

## Purpose

The Trend Intelligence Manager is the brain that discovers what people currently want.

It continuously monitors the internet to find:

- Trending products
- Trending problems
- Trending search topics
- Trending keywords
- Trending tools
- Seasonal demand
- Viral content opportunities

This agent runs before Product Automation and Tool Automation.

---

# Responsibilities

## Discover Product Trends

Platforms:

- Google Trends
- Google Search
- Google Shopping
- Amazon Best Sellers
- Amazon Movers & Shakers
- Etsy Trending
- CJ
- Impact
- ShareASale
- Rakuten
- ClickBank
- PartnerStack

Output:

Trending products ranked by opportunity score.

---

## Discover Tool Opportunities

Monitor:

- Reddit
- StackOverflow
- Quora
- Google Search
- Google Autocomplete
- People Also Ask
- Facebook Groups
- Twitter/X
- GitHub Issues
- Product Hunt

Example:

People search

"Image to PDF"

Automation suggests

Build Image to PDF Tool.

---

## Discover Blog Topics

Monitor:

- Google Trends
- Reddit
- Pinterest
- X
- Facebook
- Instagram
- YouTube
- News

Output:

High demand article ideas.

---

## Discover Seasonal Trends

Examples

Back to School

Ramadan

Black Friday

Cyber Monday

Christmas

Eid

Halloween

Valentine

Summer

Winter

etc.

---

## Discover Viral Products

Monitor

Pinterest

Instagram

TikTok

Facebook

Twitter/X

Reddit

YouTube

Product Hunt

Google Discover

Output:

Viral score.

---

# Opportunity Score

Every opportunity receives

Trend Score

Competition Score

Affiliate Availability

Estimated EPC

Estimated RPM

Search Volume

Social Mentions

Growth %

Commercial Intent

Profit Score

Overall Opportunity Score

---

# Dashboard

Trend Dashboard

Today's Trends

Products

Blogs

Tools

Viral Topics

Seasonal Topics

Emerging Topics

Recently Declining Topics

---

# Manual Mode

Admin clicks

Run Trend Scan

Agent scans internet.

Returns fresh opportunities.

---

# Automatic Mode

Runs every:

1 hour

6 hours

12 hours

24 hours

depending on settings.

---

# Filters

Only show

Affiliate available

High EPC

High RPM

Low competition

High search volume

Minimum trend score

Language

Country

Category

---

# Duplicate Detection

Never recommend existing:

Products

Blogs

Tools

Videos

Campaigns

Landing Pages

---

# Category Suggestions

If many trends belong to one niche

Suggest:

New Parent Category

New Child Category

New Tool Category

---

# AI Switching

Supports:

Gemini

ChatGPT

Claude

OpenRouter

DeepSeek

Qwen

Mistral

Grok

Nano Banana

If one reaches free-tier limit

Automatically switches.

No interruption.

---

# Output

Returns structured JSON

{
  trendType,
  title,
  opportunityScore,
  category,
  suggestedCategory,
  searchVolume,
  socialMentions,
  affiliatePrograms,
  estimatedRevenue,
  recommendedAction
}

---

# Success Criteria

✓ Finds fresh opportunities

✓ Avoids duplicates

✓ Scores opportunities

✓ Supports Products

✓ Supports Blogs

✓ Supports Tools

✓ Supports Videos

✓ Supports Social Campaigns

✓ Supports Affiliate Marketing

✓ Runs independently

✓ Can be triggered manually

✓ Can run automatically