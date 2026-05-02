# SGP Source Workspace

Operational and onboarding documentation for the modernization workspace.

Authoritative engineering/product specs live under `docs/eng`.
Reverse-engineered documents live under `docs/leg/rev-eng` as evidence archive.

## Contents

- `docs/user/local-setup.md`: local bootstrap workflow and daily commands.
- `docs/user/environment.md`: environment variable catalog and usage notes.
- `docs/eng/99-implementation-status.md`: implemented slices and known parity gaps.
- `docs/user/testing.md`: test and QA harness usage.

## Rules

- Do not commit secrets.
- Keep examples placeholder-based (for example `${APP_LOGIN}`).
- Update docs when scripts or infra stack assumptions change.
