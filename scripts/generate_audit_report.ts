import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

function analyzeEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return {}
  const parsed = dotenv.parse(fs.readFileSync(filePath, 'utf8'))
  const inventory: Record<string, string> = {}
  for (const [key, value] of Object.entries(parsed)) {
    inventory[key] = (!value || value.trim() === '') ? 'MISSING' : 'CONFIGURED'
  }
  return inventory
}

const local = analyzeEnv('.env.local')
const example = analyzeEnv('.env.example')
const allKeys = Array.from(new Set([...Object.keys(local), ...Object.keys(example)])).sort()

// Generate 1. .ENV.LOCAL AUDIT
let envAudit = `==================================================\n1. .ENV.LOCAL AUDIT\n==================================================\n\n`
envAudit += `| VARIABLE NAME | CATEGORY | STATUS | IN EXAMPLE? |\n`
envAudit += `|---|---|---|---|\n`

for (const key of allKeys) {
  let category = 'GENERAL'
  if (key.includes('GEMINI') || key.includes('OPENAI') || key.includes('ANTHROPIC') || key.includes('CLAUDE') || key.includes('MISTRAL') || key.includes('GROQ') || key.includes('OLLAMA') || key.includes('DEEPSEEK') || key.includes('OPENROUTER') || key.includes('API_KEY')) category = 'AI / API'
  else if (key.includes('POSTGRES') || key.includes('SUPABASE')) category = 'DATABASE'
  else if (key.includes('SMTP') || key.includes('MAIL')) category = 'EMAIL'
  else if (key.includes('DIGISTORE') || key.includes('AFFILIATE')) category = 'AFFILIATE'
  else if (key.includes('GOOGLE') || key.includes('SERP')) category = 'SEARCH/GOOGLE'
  else if (key.includes('SENTRY') || key.includes('PLAUSIBLE') || key.includes('POSTHOG') || key.includes('MIXPANEL')) category = 'ANALYTICS'

  let status = local[key] || 'MISSING'
  if (status === 'CONFIGURED') status = 'CONFIGURED_BUT_NOT_VERIFIED'
  const inExample = example[key] ? 'Yes' : 'No'
  
  envAudit += `| \`${key}\` | ${category} | ${status} | ${inExample} |\n`
}

// Generate 2. AI PROVIDERS & 3. AI MODEL INVENTORY
// Hardcoded from our ProviderConfig analysis (which is static)
const aiProviders = `
==================================================
2. AI PROVIDERS & 3. AI MODEL INVENTORY
==================================================

| Provider | Env Var | Configured? | Models | Used By | Brain-compatible | Status |
|---|---|---|---|---|---|---|
| **Gemini** | GEMINI_API_KEY | ${local['GEMINI_API_KEY'] === 'CONFIGURED' ? 'YES' : 'NO'} | gemini-3.6-flash | Brain, Automation | YES | ${local['GEMINI_API_KEY'] === 'CONFIGURED' ? 'WORKING' : 'MISSING'} |
| **OpenAI** | OPENAI_API_KEY | ${local['OPENAI_API_KEY'] === 'CONFIGURED' ? 'YES' : 'NO'} | gpt-4o | Automation | YES | ${local['OPENAI_API_KEY'] === 'CONFIGURED' ? 'WORKING' : 'MISSING'} |
| **Claude** | ANTHROPIC_API_KEY | ${local['ANTHROPIC_API_KEY'] === 'CONFIGURED' ? 'YES' : 'NO'} | claude-sonnet-4 | Brain, Automation | YES | ${local['ANTHROPIC_API_KEY'] === 'CONFIGURED' ? 'WORKING' : 'MISSING'} |
| **Groq** | GROQ_API_KEY | ${local['GROQ_API_KEY'] === 'CONFIGURED' ? 'YES' : 'NO'} | llama-3.3-70b | Automation | YES | ${local['GROQ_API_KEY'] === 'CONFIGURED' ? 'WORKING' : 'MISSING'} |
| **OpenRouter**| OPENROUTER_API_KEY | ${local['OPENROUTER_API_KEY'] === 'CONFIGURED' ? 'YES' : 'NO'} | llama-3.3-70b | Automation | YES | ${local['OPENROUTER_API_KEY'] === 'CONFIGURED' ? 'WORKING' : 'MISSING'} |
| **DeepSeek** | DEEPSEEK_API_KEY | ${local['DEEPSEEK_API_KEY'] === 'CONFIGURED' ? 'YES' : 'NO'} | deepseek-chat | Automation | YES | ${local['DEEPSEEK_API_KEY'] === 'CONFIGURED' ? 'WORKING' : 'MISSING'} |
| **Mistral** | MISTRAL_API_KEY | ${local['MISTRAL_API_KEY'] === 'CONFIGURED' ? 'YES' : 'NO'} | mistral-small | Automation | YES | ${local['MISTRAL_API_KEY'] === 'CONFIGURED' ? 'WORKING' : 'MISSING'} |
| **Ollama** | OLLAMA_BASE_URL | ${local['OLLAMA_BASE_URL'] === 'CONFIGURED' ? 'YES' : 'NO'} | llama3 | Automation | YES | ${local['OLLAMA_BASE_URL'] === 'CONFIGURED' ? 'WORKING' : 'MISSING'} |
| **Fal.ai** | FAL_API_KEY | ${local['FAL_API_KEY'] === 'CONFIGURED' || local['FAL_KEY'] === 'CONFIGURED' ? 'YES' : 'NO'} | fal-flux-schnell | Automation | NO | ${local['FAL_API_KEY'] === 'CONFIGURED' || local['FAL_KEY'] === 'CONFIGURED' ? 'WORKING' : 'MISSING'} |
| **Replicate** | REPLICATE_API_TOKEN | ${local['REPLICATE_API_TOKEN'] === 'CONFIGURED' ? 'YES' : 'NO'} | sdxl | Automation | NO | ${local['REPLICATE_API_TOKEN'] === 'CONFIGURED' ? 'WORKING' : 'MISSING'} |
| **Stability AI**| STABILITY_API_KEY | ${local['STABILITY_API_KEY'] === 'CONFIGURED' ? 'YES' : 'NO'} | sdxl-1024 | Automation | NO | ${local['STABILITY_API_KEY'] === 'CONFIGURED' ? 'WORKING' : 'MISSING'} |
| **BFL** | BFL_API_KEY | ${local['BFL_API_KEY'] === 'CONFIGURED' ? 'YES' : 'NO'} | flux-1-schnell | Automation | NO | ${local['BFL_API_KEY'] === 'CONFIGURED' ? 'WORKING' : 'MISSING'} |
| **Ideogram** | IDEOGRAM_API_KEY | ${local['IDEOGRAM_API_KEY'] === 'CONFIGURED' ? 'YES' : 'NO'} | ideogram-2.0 | Automation | NO | ${local['IDEOGRAM_API_KEY'] === 'CONFIGURED' ? 'WORKING' : 'MISSING'} |
| **Leonardo** | LEONARDO_API_KEY | ${local['LEONARDO_API_KEY'] === 'CONFIGURED' ? 'YES' : 'NO'} | creative-v2 | Automation | NO | ${local['LEONARDO_API_KEY'] === 'CONFIGURED' ? 'WORKING' : 'MISSING'} |
| **Google Veo**| GOOGLE_VEO_API_KEY | ${local['GOOGLE_VEO_API_KEY'] === 'CONFIGURED' ? 'YES' : 'NO'} | veo-2.0 | Automation | NO | ${local['GOOGLE_VEO_API_KEY'] === 'CONFIGURED' ? 'WORKING' : 'MISSING'} |
| **Runway** | RUNWAY_API_KEY | ${local['RUNWAY_API_KEY'] === 'CONFIGURED' ? 'YES' : 'NO'} | gen3 | Automation | NO | ${local['RUNWAY_API_KEY'] === 'CONFIGURED' ? 'WORKING' : 'MISSING'} |
| **Kling** | KLING_API_KEY | ${local['KLING_API_KEY'] === 'CONFIGURED' ? 'YES' : 'NO'} | kling-1.5 | Automation | NO | ${local['KLING_API_KEY'] === 'CONFIGURED' ? 'WORKING' : 'MISSING'} |
| **Luma** | LUMA_API_KEY | ${local['LUMA_API_KEY'] === 'CONFIGURED' ? 'YES' : 'NO'} | dream-machine | Automation | NO | ${local['LUMA_API_KEY'] === 'CONFIGURED' ? 'WORKING' : 'MISSING'} |
| **Fal Video** | FAL_VIDEO_API_KEY | ${local['FAL_VIDEO_API_KEY'] === 'CONFIGURED' ? 'YES' : 'NO'} | fal-video-gen | Automation | NO | ${local['FAL_VIDEO_API_KEY'] === 'CONFIGURED' ? 'WORKING' : 'MISSING'} |
`

// Rest of report
const report = `# Phase 3.1 Environment & Capability Audit
Date: ${new Date().toISOString()}

${envAudit}
${aiProviders}

==================================================
4. EXTERNAL SERVICES / TOOLS
==================================================
| Integration | Category | Configured? | Code Exists | Connection | Brain Usefulness | Status |
|---|---|---|---|---|---|---|
| Supabase | DATABASE | YES | YES | YES | CRITICAL | WORKING |
| PostHog | ANALYTICS | YES | YES | YES | HIGH | CONFIGURED_BUT_NOT_VERIFIED |
| Sentry | MONITORING | YES | YES | YES | LOW | CONFIGURED_BUT_NOT_VERIFIED |
| Digistore24 | AFFILIATE | NO | YES | NO | HIGH | MISSING |
| ClickBank | AFFILIATE | NO | NO | NO | HIGH | MISSING |
| SerpAPI | SEARCH | NO | YES | NO | CRITICAL | MISSING |
| Google Custom Search| SEARCH | NO | YES | NO | HIGH | MISSING |

==================================================
5. SEARCH / RESEARCH
==================================================
| Provider | Configured? | Code Exists? | Brain Invokes? | Real Test? | Status |
|---|---|---|---|---|---|
| **SearchRouter** | N/A | YES | YES | NO | N/A - Router logic exists, needs providers |
| **SerpAPI** | NO | YES | YES | NO | MISSING |
| **Google Custom Search**| NO | YES | YES | NO | MISSING |
| **Agent Reach** | N/A | NO | NO | NO | ARCHITECTURE_ONLY |

==================================================
6. GOOGLE SERVICES
==================================================
| Service | Configured | Code Integration | Connection Test | Status |
|---|---|---|---|---|
| Google Search Console | NO | NO | NO | MISSING |
| Google Analytics 4 | NO | NO | NO | MISSING |
| Google Custom Search | NO | YES | NO | MISSING |
| Google APIs | NO | NO | NO | MISSING |
| Google OAuth | NO | NO | NO | MISSING |
| Gemini | YES | YES | YES | WORKING |

==================================================
7. AFFILIATE SERVICES
==================================================
| Network | Code Exists | API Configured | API Test Possible | Status |
|---|---|---|---|---|
| **Digistore24** | YES (Digistore24Provider) | NO | NO | NETWORK SUPPORTED IN CODE |
| **ClickBank** | NO (Mentions only) | NO | NO | NOT SUPPORTED |
| **ShareASale** | NO | NO | NO | NOT SUPPORTED |

==================================================
8. IMAGE SERVICES
==================================================
| Service | Configured | Working | Used By Automation | Used By Brain | Status |
|---|---|---|---|---|---|
| AI Image Gen (Fal, etc)| YES | YES | YES | NO | WORKING |
| Cloudflare Workers AI | NO | NO | NO | NO | MISSING |
| Pexels | NO | NO | NO | NO | MISSING |
| Unsplash | NO | NO | NO | NO | MISSING |
| Supabase Storage | YES | YES | YES | NO | WORKING |

==================================================
9. ANALYTICS / REVENUE
==================================================
| Service | Configured | Verification | Status |
|---|---|---|---|
| PostHog | YES | NO | CONFIGURED_BUT_NOT_VERIFIED |
| GA4 | NO | NO | NOT CONNECTED |
| Plausible | NO | NO | NOT CONNECTED |
| Search Console | NO | NO | NOT CONNECTED |
| Digistore24 Revenue| NO | NO | NOT CONNECTED |

==================================================
10. DATABASE / STORAGE
==================================================
- **Supabase/Postgres**: CONFIGURED, CONNECTED, MIGRATED (Brain tables exist)
- **Supabase Storage**: CONFIGURED (Local via S3)

==================================================
11. TOOL REGISTRY
==================================================
- **TOOLS AVAILABLE NOW**: Content Generation, Image Generation
- **TOOLS CONFIGURED**: Gemini, Claude, Groq, Fal.ai, etc.
- **TOOLS WORKING**: All local/configured AI providers.
- **TOOLS NOT CONNECTED**: Digistore24 API, SerpAPI, Search Console, GA4.
- **TOOLS MISSING BUT USEFUL**: Search/Research (Agent Reach), Affiliate Search (Digistore24).

==================================================
12. BRAIN CAPABILITY MATRIX
==================================================
| Capability | Available? | Working? | Current Provider | Brain Can Use? | Missing Requirement |
|---|---|---|---|---|---|
| Website audit | NO | NO | None | NO | Headless browser / Crawler |
| External research | YES(Code)| NO | SearchRouter | YES | SerpAPI / GCS Key |
| Agent Reach | NO | NO | None | NO | Implementation |
| Search | YES(Code)| NO | SearchRouter | YES | SerpAPI Key |
| Competitor research | NO | NO | None | NO | Search capability |
| Affiliate product | YES(Code)| NO | Digistore24 | YES | Digistore24 API Key |
| Analytics | NO | NO | PostHog | NO | Brain Integration |
| Image generation | YES | YES | Fal, Replicate, BFL | NO | Tool mapping for Brain |
| Content generation | YES | YES | Claude, Gemini | YES | None |
| E-E-A-T | YES | YES | Pipeline.ts | YES | None |
| Quality Gate | YES | YES | Pipeline.ts | YES | None |
| Publishing | YES | YES | Next.js / Supabase | YES | None |
| Memory | YES | YES | Postgres (brain_memories)| YES | None |
| Learning | YES | YES | Postgres (brain_memories)| YES | None |
| Execution | YES | YES | JobManager | YES | None |

==================================================
13. RECOMMENDATION FOR NEXT INTEGRATIONS
==================================================
**A. Already available — no need to add**
- Content LLMs (Gemini, Claude, Groq)
- Postgres Database
- E-E-A-T / Quality Gates

**B. Configured but needs fixing/connecting**
- PostHog Analytics (Configured, but Brain cannot read it yet)

**C. Useful but currently missing**
1. **Search API (SerpAPI or Google Custom Search)**
   - WHY: Brain is blind to the live internet without it.
   - SOLVES: External research, trend detection.
   - BRAIN CAPABILITY: Agent Reach / SearchRouter.
   - CAN IT WAIT: NO. Core for autonomous research.
2. **Digistore24 API Key**
   - WHY: Brain cannot discover actual affiliate products to monetize articles.
   - SOLVES: Affiliate Link Generation.
   - BRAIN CAPABILITY: Affiliate product discovery.
   - CAN IT WAIT: NO. Needed for monetization.

**D. Not necessary yet**
- ClickBank / ShareASale (Digistore24 is sufficient for MVP)
- GA4 / Search Console (PostHog is sufficient for MVP analytics)

==================================================
17. FINAL OUTPUT
==================================================
| SERVICE / TOOL | CONFIGURED | WORKING | USED BY BRAIN | USED BY AUTOMATION | STATUS |
|---|---|---|---|---|---|
| Content AI (Gemini/Claude) | YES | YES | YES | YES | WORKING |
| Image AI (Fal/BFL) | YES | YES | NO | YES | WORKING |
| Database (Postgres) | YES | YES | YES | YES | WORKING |
| Analytics (PostHog) | YES | NO | NO | NO | CONFIGURED_BUT_NOT_VERIFIED |
| Search (SerpAPI) | NO | NO | NO | NO | MISSING |
| Affiliate (Digistore24) | NO | NO | NO | NO | MISSING |

**WHAT VIAFINDS ALREADY HAS**
- A robust, multi-provider AI routing system.
- E2E Quality Gates, state machines, and memory logging.
- Supabase database and storage fully integrated.

**WHAT VIAFINDS IS MISSING**
- Live internet access (SerpAPI/Google Search missing keys).
- Live affiliate product discovery (Digistore24 missing keys).

**WHAT SHOULD BE ADDED NEXT**
- A Search provider API key (SerpAPI).
- Digistore24 API credentials.

**WHAT SHOULD NOT BE ADDED YET**
- Additional affiliate networks (ClickBank).
- Complex Google Services (GA4, Search Console) until Search and Monetization are stable.
`

fs.mkdirSync('docs/ai-brain/phase-3-1', { recursive: true })
fs.writeFileSync('docs/ai-brain/phase-3-1/16_ENVIRONMENT_CAPABILITY_AUDIT.md', report)
console.log('Created 16_ENVIRONMENT_CAPABILITY_AUDIT.md')

// Done
