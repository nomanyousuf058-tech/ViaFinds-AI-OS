# 25 TESTING & QA

## Frameworks
- **Jest**: Configured for unit testing (`jest.config.js`).
- **Playwright**: Configured for End-to-End (E2E) testing (`playwright.config.ts`). Test base URL set in `.env` as `PLAYWRIGHT_BASE_URL`.

## QA & Testing Scripts
The `scripts/` directory is highly populated with custom QA runners (using `tsx` or Node):
- **`comprehensive-e2e.js`**: Massive runner verifying the entire site.
- **`qa-automation.js`**: Specifically tests the AI pipeline flow without touching the UI.
- **`qa-publish.js`**: Tests the database trigger `protect_manual_articles` and state transitions.
- **`qa-test.js`**: General QA suite.
- **`test-automation.ts`**: The primary pipeline unit test (referenced in `package.json` as `npm run test:automation`).
- **`test-dynamic-pipeline.ts`**: Tests the state machine logic dynamically.
- **`test-routes.ts`**: Verifies API endpoints are up and returning expected shapes.

## Test Environment Setup
- `test-env.js` & `test-env-all.js`: Sets up mocked DB configurations or isolated test databases before running suites.

## Current QA Status
- The sheer number of custom script files indicates that standard unit testing (Jest) was not sufficient to handle the unpredictable nature of AI outputs and long-running state machines. Much of the QA relies on these heavy custom Node scripts hitting staging endpoints or local DB instances.
