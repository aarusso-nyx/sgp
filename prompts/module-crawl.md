# Prompt: Module Crawl

Goal: document one module in depth.

Inputs:
- `MODULE_NAME` (required)

Instructions:
1. Start from shell navigation and open the target module.
2. For each screen in module, capture:
   - route
   - visible forms
   - tables and columns
   - filters
   - dialogs
   - visible actions and outcomes
3. Save screenshots as evidence under `playwright/reports/<module>/`.
4. Update:
   - `inventories/screens.json`
   - `inventories/actions.json`
   - `docs/feature-catalog.md`
   - `docs/workflows.md`
5. Mark each finding as `observed`, `inferred`, or `unverified`.
6. Do not infer hidden functionality without evidence.
