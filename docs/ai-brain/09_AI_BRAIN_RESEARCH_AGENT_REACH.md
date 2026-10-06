# 09 AI BRAIN RESEARCH AGENT REACH

## Separation of Concerns
The Brain is for reasoning, strategy, and memory. **Agent Reach** is the sensory organ for external investigation. Agent Reach must NEVER directly modify the ViaFinds database or production environment.

## Agent Reach Capabilities
- Web Browsing & Scraping
- Competitor Analysis
- Trend Discovery (Google Trends, Social Media APIs)
- Affiliate Network Scanning
- Evidence Collection

## The Research Protocol
1. **Request**: Brain sends a structured JSON request to Agent Reach.
   - *Example*: "Find the top 3 alternatives to Product X, including pricing and key features."
2. **Execution**: Agent Reach uses standard web-search tools to build a dossier.
3. **Response**: Agent Reach returns structured evidence.
   - `sources`: Array of URLs visited.
   - `evidence`: Extracted facts.
   - `confidence`: Assessment of data reliability.
4. **Decision**: The Brain ingests this evidence and decides how to update the Strategy or Memory.

## Evidence Retention
Every external recommendation imported into the Brain must retain its `source_reference`. If the Brain recommends writing an article because "Trend X is up 500%", the exact URL or API response that proved this must be linked in the database for human auditability.
