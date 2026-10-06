# 08 AUTHENTICATION & SECURITY

## Authentication Architecture
ViaFinds implements a custom authentication layer specifically for the Admin Dashboard, completely bypassing external auth providers (like Auth0 or NextAuth) in favor of a lean, JWT-backed system.

- **Storage**: `admin_users` table in PostgreSQL.
- **Hashing**: Passwords are hashed using `bcryptjs`.
- **Tokens**: JSON Web Tokens (JWT) via `jsonwebtoken` and `jose` (for Edge compatibility).
- **Session**: Managed via HttpOnly secure cookies.

## API Security & Authorization
- **Middleware/Guards**: UI components use `<AdminGuard>` to wrap protected routes.
- **Role-Based Access Control (RBAC)**: The `admin_users` table contains a `role` field.
- **Row Level Security (RLS)**: 
  - Implemented at the Supabase database level.
  - `Public read published articles` policy ensures non-authenticated users can only query `status = 'published'`.
  - Admin/Service operations bypass RLS via the Supabase Service Role key or direct `pg` queries.

## Key Security Configurations (from `.env`)
- `ADMIN_JWT_SECRET`: Signs the authentication tokens.
- `SESSION_SECRET`: Encrypts session cookies.
- `CSRF_SECRET`: Protection against Cross-Site Request Forgery.
- `WEBHOOK_SECRET`: Secures incoming webhooks (e.g., from social media platforms or affiliate networks).
- `ADMIN_SETUP_SECRET`: A one-time bootstrap token used to create the initial admin user safely.

## Vulnerability & Risk Posture
- **LLM Injection**: Because the system ingests external HTML (scraping affiliate URLs) and feeds it to LLMs, there is a risk of prompt injection from scraped pages. 
- **Secret Exposure**: Careful attention must be paid to ensure the `pg` database connection string and AI Provider keys are NEVER passed to React Client Components (`NEXT_PUBLIC_`). The `.env.example` explicitly warns against this.
- **Rate Limiting**: Rate limiting is configurable (`RATE_LIMIT_ENABLED`, `RATE_LIMIT_REQUESTS_PER_MINUTE`) to protect API routes from DDoS.
