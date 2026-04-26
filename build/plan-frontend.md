# Frontend Plan: SGP Angular Modernization

## Goal

Build a new Angular/Angular Material frontend that matches all legacy SGP user-facing features while improving usability, accessibility, maintainability, and role-aware navigation.

## Stack

- Angular CLI project in `source/frontend`.
- Angular 21, Angular Material/CDK, SCSS, strict TypeScript, routed application, tests enabled.
- OAuth2 authorization code + PKCE against AWS Cognito Hosted UI.
- Backend API target: `source/backend` NestJS API.

## Feature Scope

- Shell: authenticated app layout, sidenav, top bar, breadcrumbs, notifications, profile menu, logout.
- Navigation: all legacy menus and routes from `inventories/menus.json` and `inventories/routes.json`.
- Permissions: Cognito groups determine route/menu/action visibility; backend still enforces permissions.
- Shared UI: CRUD table, filter bar, autocomplete, dialogs, loading/error/empty states, form actions, report/download buttons.
- Modules:
  - Gestão: master data, users, profiles, system parameters, setup tables, import/export screens.
  - RH: employee registry and lifecycle screens.
  - Folha de Pgt: payroll management, remittance files, employee verbas, reports.
  - Convênio: institutions, programs, internship flows.
  - Relatório: report catalog and generation flows.
  - Auditoria: audit search and detail views.

## UX Rules

- Preserve Portuguese domain labels unless corrected by domain owner.
- Fix observed encoding issues such as mojibake in employee labels.
- Prefer dense administrative layouts with clear filters, table actions, and visible state.
- Use Material components idiomatically: `mat-sidenav`, `mat-toolbar`, `mat-table`, `mat-paginator`, `mat-sort`, `mat-dialog`, `mat-form-field`, `mat-autocomplete`.
- Design every list screen with keyboard navigation and accessible labels.

## Acceptance

- Every legacy route has a matching Angular route or explicit forbidden route page.
- Every observed table/filter/action has a parity entry.
- All role states are covered: unauthenticated, authenticated allowed, authenticated forbidden, expired session.
- Build, unit tests, and e2e smoke tests pass.

