# 27 GITHUB ACTIONS

## Continuous Integration (CI)
- **Path**: `.github/workflows/ci.yml`
- **Trigger**: Runs on Push to `main` or Pull Requests to `main`.
- **Workflow**:
  1. Checks out code.
  2. Sets up Node.js.
  3. Installs dependencies.
  4. Runs `npm run lint` (ESLint).
  5. Runs `npm run typecheck` (TypeScript compiler check).
  6. Runs `npm run test` (Jest unit tests).

## Limitations
- E2E tests (Playwright) and the heavy custom `scripts/*.js` automation tests are NOT currently running in the standard CI pipeline. This is likely because running AI generation tests in CI would consume paid API tokens and introduce extreme flakiness due to LLM response variance.
