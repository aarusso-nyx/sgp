# Backend Agent Prompt

Use `gpt-5.4` with high reasoning.

Work only in `source/backend` unless coordinating Prisma SQL with the database agent.

Build the NestJS API from `build/plan-backend.md`.

Requirements:

- Use idiomatic Nest modules, controllers, services, DTOs, guards, decorators, and OpenAPI annotations.
- Validate AWS Cognito JWTs via JWKS.
- Enforce permissions from Cognito groups on every protected endpoint.
- Use Prisma repositories/services for PostgreSQL persistence.
- Implement standard paging, errors, request ID propagation, and audit logging.
- Add unit, API, and e2e tests for every domain module.

