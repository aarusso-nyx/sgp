# Database Agent Prompt

Use `gpt-5.4` with high or xhigh reasoning.

Work in `source/database` and `source/backend/prisma/schema.prisma`.

Build the PostgreSQL design from `build/plan-database.md`.

Requirements:

- Model all observed and expected SGP domains.
- Use Prisma migrations for tables and relations.
- Use SQL files for extensions, audit helpers, views, and operational SQL.
- Add deterministic seeds for development and tests.
- Add indexes and constraints for business keys, filters, and foreign keys.
- Document all unverified legacy assumptions.

