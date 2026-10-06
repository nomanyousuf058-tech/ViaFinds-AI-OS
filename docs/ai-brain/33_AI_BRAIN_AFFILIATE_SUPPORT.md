# 33 AI BRAIN AFFILIATE SUPPORT

## Purpose
Affiliate marketing remains the core engine. The Brain must manage this expertly, handling link rot, API changes, and product deprecations autonomously.

## Link Rot & Validation
Affiliate links break frequently when merchants pause campaigns. 
- **The Validation Tool**: `validate_affiliate_link(url)`
- **The Task**: A weekly background task scans all active `affiliate_references` in the database. It pings the URLs. 
- **The Healing**: If a link returns 404, the Brain searches the Affiliate Network API for the updated link. If the product is dead, it replaces the CTA with the next best competitor and logs the change.

## Network Diversification
The Brain should not be locked to Digistore24. 
- The Opportunity Engine must be capable of scanning ClickBank, ShareASale, and CJ Affiliate (via Agent Reach scraping or APIs).
- It compares the same product across networks to find the highest commission rate and dynamically updates the site's links.
