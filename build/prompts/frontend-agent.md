# Frontend Agent Prompt

Use `gpt-5.3-codex` or `gpt-5.4` with high reasoning.

Work only in `source/frontend` unless explicitly asked otherwise.

Build Angular/Material feature parity from `build/plan-frontend.md`.

Requirements:

- Use Angular CLI schematics for components, services, guards, interceptors, interfaces, modules, and routes.
- Implement Hosted UI + PKCE Cognito login flow.
- Build shared shell, route guards, menu rendering, CRUD table, filter bar, dialogs, report/download controls.
- Keep Material UI accessible, responsive, and stable.
- Add unit tests for services/guards and component tests for shared UI.
- Do not store tokens or secrets in code.

