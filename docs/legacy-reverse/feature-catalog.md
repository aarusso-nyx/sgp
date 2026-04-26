# Feature Catalog

## Purpose
Catalog modules, screens, actions, and key UI entities.

## Modules
| Module | Summary | Status |
|---|---|---|
| Auditoria | screens=1; actions=10; fields=6; tables=1; constraints=3; nested-links=4 | observed |
| Convênio | screens=3; actions=20; fields=10; tables=2; constraints=8; nested-links=12 | observed |
| Folha de Pgt | screens=9; actions=69; fields=42; tables=4; constraints=28; nested-links=38 | observed |
| Gestão | screens=35; actions=256; fields=123; tables=21; constraints=98; nested-links=143 | observed |
| Módulo RH | screens=12; actions=92; fields=42; tables=7; constraints=32; nested-links=48 | observed |
| Relatório | screens=2; actions=10; fields=7; tables=0; constraints=5; nested-links=8 | observed |
| Unmapped | screens=1; actions=5; fields=3; tables=0; constraints=3; nested-links=4 | observed |

## Deep Inspect Notes
- Source: `playwright-deep-route-inspect`.
- Screens analyzed: 63.
- Actions cataloged: 462.
- Routes in map: 72.
- Evidence screenshots: `playwright/reports/deep/*.png`.
- Module deep docs index: `docs/modules/README.md`.

## Cross references
- `inventories/routes.json`
- `inventories/screens.json`
- `inventories/actions.json`
- `docs/modules/README.md`
- `docs/permission-gap-report.csv`
- `docs/permission-gap-report.md`
