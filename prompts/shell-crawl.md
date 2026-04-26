# Prompt: Shell Crawl

Goal: map top-level navigation and shell behavior.

Instructions:
1. Authenticate using `APP_BASE_URL`, `APP_LOGIN`, `APP_PASSWORD`.
2. Enumerate visible global navigation (menus, submenus, links).
3. Capture route paths and labels with evidence screenshots.
4. Update:
   - `inventories/routes.json`
   - `inventories/menus.json`
   - `docs/sitemap.md`
5. Mark each finding as `observed`, `inferred`, or `unverified`.
6. Do not include secrets in any artifact.
