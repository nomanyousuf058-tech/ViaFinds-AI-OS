# 24 DATA FLOW

## The Article Lifecycle (Discovery to Publish)

```mermaid
sequenceDiagram
    participant Admin
    participant Dashboard
    participant API
    participant DB
    participant Automation
    participant AI
    participant Web

    Admin->>Dashboard: Paste Affiliate URL
    Dashboard->>API: POST /api/automation
    API->>DB: Insert automation_job (status: queued)
    
    Note over API,Automation: Background Cron or Immediate Async Trigger
    
    Automation->>DB: Update job (status: running)
    Automation->>Web: Scrape Affiliate URL (Title, Meta, Body)
    Web-->>Automation: HTML Snippet
    
    Automation->>AI: Determine Article Strategy
    AI-->>Automation: JSON (Strategy)
    
    Automation->>AI: ContentIntelligenceAgent (Write Article)
    AI-->>Automation: JSON (UCO Blocks)
    
    Automation->>AI: SEO/GEO/AEO Analysis
    AI-->>Automation: JSON (Metadata)
    
    Automation->>DB: Insert article (status: draft, JSONB content)
    Automation->>DB: Update job (status: awaiting_approval)
    
    Admin->>Dashboard: Review Draft in ArticleEditor
    Admin->>Dashboard: Click Publish
    Dashboard->>DB: Update article (status: published)
    
    Note over DB,Web: Next.js Frontend immediately serves article via /slug
```

## Failure Recovery Data Flow
1. **AI Failure**: If the AI returns malformed JSON, `cleanJsonResponse` attempts regex cleanup.
2. **Provider Failure**: If Gemini times out, `AIRouter` catches the error, logs it, and immediately requests Groq with the exact same prompt.
3. **Pipeline Failure**: If all providers fail or web scraping fails, the job transitions to `status: failed`.
4. **Admin Intervention**: Admin sees failed job in `/dashboard/jobs`, fixes the issue (e.g., bad URL), and clicks "Retry", setting status back to `queued`.
