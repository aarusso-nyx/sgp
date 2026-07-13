---
controllers: []
migrations: []
infra:
  - .github/workflows/branch-protection-audit.yml
runbooks:
  - docs/gov/evidence/repository-discipline.md
---

# ADR-036: Solo-owner Merge Governance

Status: Accepted

Date: 2026-07-12

## Context

SGP currently has one repository collaborator and one CODEOWNER. Requiring an
approval from someone other than the last pusher makes every owner-authored pull
request unmergeable, even after all protected checks pass. CODEOWNERS remains
useful ownership metadata and will support independent review when the
maintainer group grows.

This is an Owner Decision. The current repository phase prioritizes traceable
agentic progress through pull requests and fail-closed automation while SGP is
not under production multi-maintainer governance.

## Decision

`main` uses the declared `solo-owner` branch-protection mode in
`docs/gov/branch-protection-policy.json`:

- pull requests remain mandatory;
- every declared required status check, including `DEVAI evidence gate`, must
  pass against the current head;
- administrators remain subject to branch protection;
- force pushes, branch deletion and unresolved conversations remain blocked;
- the sole repository owner may merge an owner-authored pull request without a
  separate approving review;
- CODEOWNERS remains intact as ownership metadata.

The mode must change to `collaborative` before production governance is
declared or when a second active maintainer receives write access. Collaborative
mode requires at least one approving review, CODEOWNER review and approval from
someone other than the last pusher.

## Consequences

- Solo-owner merges are authorized only after all required checks pass.
- Self-review theater and temporary administrator bypasses are unnecessary.
- The branch-protection audit validates the declared phase rather than assuming
  a multi-maintainer repository.
- Adding a second active maintainer or declaring production is a hard trigger to
  update the policy, GitHub settings and retained evidence before the next
  merge.
