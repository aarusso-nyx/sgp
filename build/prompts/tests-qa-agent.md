# Tests and QA Agent Prompt

Use `gpt-5.3-codex` with high reasoning.

Work in `source/tests`, `source/frontend`, and `source/backend/test` for tests only.

Requirements:

- Build parity tests from `inventories/routes.json`, `inventories/screens.json`, and `inventories/actions.json`.
- Cover auth states: unauthenticated, allowed, forbidden, expired token.
- Add frontend unit/component tests and Playwright e2e flows.
- Add backend unit/API/e2e tests for validation, permissions, paging, mutations, and audit logging.
- Keep tests deterministic and safe for CI.

