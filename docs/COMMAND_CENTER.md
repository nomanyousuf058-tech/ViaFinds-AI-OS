# ViaFinds AI OS Command Center Documentation

## Overview
The new Google Stitch-designed Command Center acts as the mission control for the entire ViaFinds AI OS ecosystem. It bridges the robust Next.js/Sanity backend architecture with a dynamic, user-friendly React frontend. 

## Key Features

### Master Automation Control
- **Run Sequence**: Triggers the entire automation engine (`/api/automation/run`). The system runs autonomously checking the active `automation-settings.json`.
- **Safe Stop**: Signals the backend to stop accepting new pipeline items gracefully. Any currently running atomic tasks (like fetching a URL or analyzing an image) finish cleanly and persist state before the system sleeps. Corruptions are avoided by not forcefully terminating the Node thread.

### Discovery & Manual Overrides
Users can instantly bypass full automation and manually initiate targeted discovery directly from the Quick Actions section:
- **Trending Products**: Discover high-velocity physical goods from major retail nodes.
- **Trending Tools**: Discover highly-searched SaaS products.
- **Affiliate Programs**: Auto-search networks for high-commission opportunities.
- **Process Product**: Manually insert an affiliate link and push it directly through the core extraction and draft engine.
- **Export / Download**: Extract metrics or queue status into localized downloadable assets.

### Modular Pipeline Toggles
The user can independently enable or disable:
- Trend Discovery
- Product Discovery
- Product Intelligence
- Category Intelligence
- Content Generation
- Image Generation
- SEO Optimization
- Social Automation
- Publishing
If a toggle is set to `off`, the underlying workflow logic inside `BaseWorkflow.ts` intercepts the execution loop and successfully bypasses that specific module while keeping the queue flowing perfectly.

### Connection Center
A unified management center located at `/dashboard/connections`. It supports configuring and storing API keys for:
- AI Providers (OpenAI, Gemini, Groq, Claude, Ollama)
- Social Platforms (Pinterest, Instagram, Facebook, X)
- Affiliate Networks (Amazon, ShareASale, CJ, ClickBank)
- System APIs (Sanity CMS, Serper.dev)
Keys are visually hidden on the frontend interface to maintain security over-the-shoulder.
