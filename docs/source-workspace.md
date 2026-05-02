# SGP Source Docs

Operational and onboarding documentation for the modernization workspace.

Authoritative engineering/product specs live under `../../docs/eng`.
Reverse-engineered documents live under `../../docs/legacy-reverse` as evidence archive.

## Contents

- `docs/local-setup.md`: local bootstrap workflow and daily commands.
- `docs/environment.md`: environment variable catalog and usage notes.
- `docs/implementation-status.md`: implemented slices and known parity gaps.
- `docs/testing.md`: test and QA harness usage.

## Rules

- Do not commit secrets.
- Keep examples placeholder-based (for example `${APP_LOGIN}`).
- Update docs when scripts or infra stack assumptions change.
