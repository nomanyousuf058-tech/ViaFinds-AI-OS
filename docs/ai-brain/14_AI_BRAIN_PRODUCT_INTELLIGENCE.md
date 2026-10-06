# 14 AI BRAIN PRODUCT INTELLIGENCE

## Purpose
The Brain must deeply understand the products it is promoting, whether they are third-party affiliate links or owned digital products.

## Unified Product Understanding
The Brain evaluates products across multiple dimensions:

### Core Fields Required
- `product_name`, `slug`, `description`, `category`
- `product_type` (Owned vs Affiliate)
- `price`, `currency`, `margin_percentage`
- `target_audience`, `problem_solved`
- `checkout_url` / `affiliate_url`

### Competitor & Market Understanding
When a product is added (by Admin or autonomous discovery), the Product Intelligence module triggers a workflow:
1. **Market Research**: Identifies the product's primary competitors.
2. **Audience Research**: Determines who buys this (e.g., "Beginners" vs "Enterprise").
3. **Content Opportunities**: Maps out the required content cluster (e.g., "Review", "Alternatives to X", "X vs Y").

## Affiliate vs Owned Logic
The Brain must actively compare owned vs affiliate offerings.
- **Scenario**: A user searches "How to organize my life."
- **Affiliate Option**: Notion template ($10 commission).
- **Owned Option**: ViaFinds Productivity OS ($50 profit).
- **Brain Decision**: Prioritize the owned product because margin is higher and fulfillment is controlled, but mention the affiliate product as an alternative to maintain editorial objectivity.
