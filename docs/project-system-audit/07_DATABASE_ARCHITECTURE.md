# 07 DATABASE ARCHITECTURE

## Provider & Access
- **Provider**: PostgreSQL (hosted on Supabase).
- **Access Method**: Direct PostgreSQL wire protocol using the `pg` Node module for server-side operations.
- **Schema**: Fully defined via raw SQL (`lib/db/schema.sql`).
- **Security**: Row Level Security (RLS) is heavily utilized.

## Core Entities & Schema

### Auth & User Management
- **`admin_users`**: Stores admin credentials, bcrypt hashed passwords, roles, and JWT session states.

### Content Taxonomy
- **`authors`**: Tracks editorial authors, bios, avatars.
- **`categories`**: Hierarchical category tree (supports parent-child), UI icons, SEO metadata.

### The Content Layer
- **`articles`**: The primary entity.
  - Fields: Title, slug, excerpt, content (stored as JSONB for portable text block formatting), status (`draft`, `published`, `auto_draft`), publishing timestamps.
  - Relationships: Links to `authors` and `categories`.
  - Intelligence: `seo`, `geo`, `aeo` metadata stored as JSONB.
  - **Full-Text Search**: Actively maintains a `search_vector` (TSVECTOR) using PostgreSQL triggers for fast searching.
- **`reviews`**: A specialized table for product reviews, separating editorial prose from pros/cons, ratings, and verdicts.
- **`products`**: Editorial references to products (NOT an e-commerce catalog). Stores price, affiliate links (JSONB), and brand info.
- **Join Tables**: `article_related_products`, `article_related_articles`, `review_comparison_products`.

### Affiliate Intelligence
- **`affiliate_references`**: Polymorphic table (`content_type`, `content_id`) mapping specific URLs, labels, and prices to generated content.

### Automation & Telemetry
- **`research_jobs`**: Stores topic, keywords, sources, and LLM output confidence.
- **`automation_jobs`**: State machine table tracking pipeline execution (`type`, `stage`, `status`, `retry_count`, `result` JSONB).
- **`optimization_jobs`**: Tracks SEO/EEAT audit results for specific content IDs.
- **`service_connections`**: Registry of configured AI and external tools.
- **`audit_logs`**: Tracks admin and system actions for security compliance.

## Triggers & Constraints
- Extensively uses `BEFORE UPDATE` triggers to manage `updated_at`.
- Contains specialized business-logic triggers (e.g., `protect_manual_articles()` ensures automated AI jobs cannot overwrite or downgrade an article previously marked as manually published).
