# 36 AI BRAIN PERMISSION MODEL

*How the proposed AI Brain will interact safely with the system.*

## The Principle of "Bounded Autonomy"
The AI Brain should not have `root` access to blindly execute code, drop database tables, or directly publish unverified content that could damage the brand's E-E-A-T score.

## Proposed Roles & Permissions

1. **Read-Only Analytics (Global)**
   - The Brain has full, unrestricted access to read Plausible/PostHog analytics and PostgreSQL metrics to form its strategy.

2. **Drafting (Write-Restricted)**
   - The Brain can insert new rows into `articles` and `reviews` ONLY if `status = 'auto_draft'`.
   - It cannot update any article where `status = 'published'` or `status = 'manual'` without creating a "Proposed Change" job for Admin review. (The existing `protect_manual_articles` DB trigger already enforces this).

3. **Tool Execution (Sandboxed)**
   - Web Search & Scraping: Unrestricted.
   - External API Calls: Restricted to pre-approved origins (e.g., Digistore24 API, Ahrefs API).

4. **Approval Gates (Human-in-the-Loop)**
   - **Phase 1 (Safe)**: Brain suggests a strategy. Human approves. Brain writes. Human publishes.
   - **Phase 2 (Semi-Auto)**: Brain dictates strategy and writes. Human clicks publish.
   - **Phase 3 (Autonomous - Future)**: Brain publishes automatically, but ONLY for low-risk content categories. High-ticket reviews still require human sign-off.
