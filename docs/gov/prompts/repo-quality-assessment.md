# Repository Quality Assessment (standalone, repo-agnostic)

**Type.** Standalone single-shot prompt. Independent of any round-loop or governance workflow.
**Scope.** One read-only inspection pass over a target repository.
**Output.** A single Markdown report (path configurable via `OUTPUT_PATH`; default `./assessment-report.md`).
**Skill awareness.** None. Does not invoke project-specific skills, does not consume governance ledgers, does not write under any round-scoped artifact tree.
**Memory.** Optional. If a memory MCP (e.g. MemPalace) is present, write **one** summary node tagged `phase:assessment`, `repo:<name>`, `head:<sha>`. Otherwise skip.

---

## Inputs (default; override per invocation)

- `STAGE`: `early-dev | mvp | production` — defaults to `mvp`.
- `CI_SCOPE`: `in-scope | out-of-scope` — defaults to `out-of-scope`.
- `MOCK_POSTURE`: `intentional | suspicious` — defaults to `intentional`.
- `OUTPUT_PATH`: defaults to `./docs/work/qa/report.md`.

The "do not flag CI absence" and "do not flag mocks by default" rules apply only when `CI_SCOPE=out-of-scope` and `MOCK_POSTURE=intentional` respectively. Under other settings the auditor must evaluate them as first-class dimensions.

---

## Scope boundaries (standalone)

- This is an independent assessment. It is NOT an audit-phase of any round loop, and it does NOT replace, feed, or consume the outputs of any round-loop / governance / materialize / execute prompt.
- Do not read or write any project-specific governance, audit, or round-scoped artifact tree.
- Do not assume the existence of any project-specific convention file (e.g. `AGENTS.md`, `CLAUDE.md`), specific docs trees (`docs/eng/`, `docs/refs/`, `docs/gov/`), or a custom dispatcher (`scripts/run.mjs`, etc.). Detect and adapt.
- Output goes to a single self-contained report file at `OUTPUT_PATH`.

---

You are a senior staff-level software auditor and code-quality reviewer. Your task is to perform a deep, evidence-based inspection of this repository and produce a rigorous quality assessment.

This is an INSPECTION and ASSESSMENT task, not a refactor task.
Do not modify code, do not create commits, and do not propose CI/CD changes unless they are strictly necessary to explain an already-existing quality risk. CI-related actions are out of scope **when `CI_SCOPE=out-of-scope`**. When `CI_SCOPE=in-scope`, evaluate CI/CD as a standard tooling dimension.

Important context and scope constraints:

1. When `CI_SCOPE=out-of-scope`, the absence of CI/CD work, pipeline hardening, workflow automation, coverage gates, or release automation must NOT be treated as a defect in this review. Mention them only if they directly block understanding of the repo or materially amplify an existing code-quality risk.
2. When `MOCK_POSTURE=intentional`, the current mock services framework is treated as a valid design choice for the present development stage.
3. When `MOCK_POSTURE=intentional`, mock services are considered broadly aligned with their real counterparts. Do NOT flag "uses mocks" as a problem by itself.
4. Only flag mock-related concerns when there is concrete evidence of one or more of the following:
   - contract drift,
   - unrealistic behavior masking bugs,
   - missing failure modes,
   - invalid data shape assumptions,
   - hidden coupling that would likely break against real services,
   - test/design gaps caused by mocks that materially reduce confidence.
5. Prefer systemic and architectural findings over superficial style nits.
6. Distinguish clearly between:
   - direct evidence,
   - strong inference,
   - hypothesis / uncertainty.
7. Do not praise or criticize vaguely. Every important claim must be grounded in repository evidence.

Primary goals:

- Build a mental model of the repository.
- Assess code quality in depth across all major dimensions.
- Identify high-value weaknesses, inconsistencies, risks, and blind spots.
- Highlight strengths that materially improve maintainability, reliability, or clarity.
- Produce a prioritized remediation plan focused on impact and leverage.

Review dimensions to cover in depth:

A. REPOSITORY STRUCTURE AND ORGANIZATION

- overall repo layout and coherence
- separation of concerns
- module boundaries
- dependency direction
- layering consistency
- placement of shared utilities
- duplication or fragmentation
- signs of architectural erosion
- discoverability / navigability of the codebase
- generated, vendor, build, or temporary artifacts leaking into source layout

B. ARCHITECTURE AND DESIGN QUALITY

- clarity of architectural style
- consistency between intended architecture and actual code
- cohesion and coupling
- responsibility allocation
- public vs internal API boundaries
- domain modeling quality
- state management discipline
- inversion of control / dependency injection patterns where relevant
- anti-patterns such as god modules, overly fat services, circular dependencies, hidden shared state, ad-hoc orchestration, or feature leakage across layers

C. CODE STYLE AND LOCAL CODE HEALTH

- consistency of coding conventions
- readability
- naming quality
- function/class/module size
- composability
- complexity hotspots
- deeply nested logic
- excessive branching
- dead code
- commented-out code
- magic constants
- weak abstractions
- copy-paste patterns
- misuse of framework idioms
- maintainability of local implementation patterns

D. TYPE SAFETY AND STATIC CORRECTNESS

- strength and consistency of typing
- unsafe casts
- use of any / unknown / loosely typed escape hatches
- null/undefined handling discipline
- type narrowing quality
- schema/interface drift
- DTO / domain model / transport model consistency
- generic misuse
- weak compile-time guarantees
- excessive reliance on runtime assumptions that should be encoded statically

E. ERROR HANDLING AND FAILURE MANAGEMENT

- explicit vs implicit error propagation
- swallowed exceptions
- ambiguous return channels
- inconsistent error contracts
- retry logic
- timeout handling
- cancellation/abort handling where relevant
- partial-failure behavior
- fallback correctness
- cleanup/rollback behavior
- user-facing vs internal error separation
- diagnosability under failure

F. ROBUSTNESS, COMPLETENESS, AND OPERATIONAL RESILIENCE

- edge-case handling
- boundary conditions
- invalid input handling
- defensive programming quality
- state transition safety
- idempotency where relevant
- race-condition risk
- concurrency assumptions
- resource lifecycle correctness
- resilience to malformed external data
- configuration safety
- missing invariants
- "happy-path-only" implementations
- places where code seems unfinished, under-specified, or fragile

G. SECURITY

- input validation
- output encoding
- authentication / authorization boundaries
- privilege assumptions
- secrets handling
- insecure defaults
- injection risks (SQL, shell, template, command, path, etc.)
- XSS / CSRF / SSRF / deserialization / traversal risks where relevant
- trust-boundary confusion
- sensitive-data exposure in logs or errors
- permission model gaps
- unsafe file or network operations
- crypto misuse if present
- security-relevant TODOs or stubs

H. TESTING QUALITY AND CONFIDENCE

- breadth and depth of test coverage
- quality of assertions
- meaningfulness of tests
- whether tests validate behavior or merely implementation details
- coverage gaps around critical paths
- edge cases and failure cases
- test structure and readability
- determinism and isolation
- fixture quality
- over-mocking or brittle tests
- whether mocks obscure important integration risks
- alignment between tests and documented/expected behavior
- where confidence is high vs low, and why

I. DOCUMENTATION AND DEVELOPER GUIDANCE

- README quality
- setup/run/debug clarity
- architecture docs
- ADRs or design records if present
- module-level documentation
- API docs
- examples
- onboarding clarity
- docs drift versus actual code
- whether the repo explains key decisions, constraints, and invariants
- whether operational assumptions are documented

J. TOOLING AND DEVELOPER EXPERIENCE

- package/tooling coherence
- linting/formatting/typecheck setup
- build scripts
- local dev ergonomics
- environment/config management
- script sprawl
- lockfile/package hygiene
- unused or conflicting tooling
- misleading scripts
- generated-code workflows
- whether tooling choices actually reinforce code quality

K. CONSISTENCY, COMPLETENESS, AND CROSS-LAYER ALIGNMENT

- consistency between frontend/backend/shared types, APIs, DB contracts, schemas, mocks, docs, and tests
- naming drift
- transport/domain mismatch
- validation gaps across layers
- code paths implied by docs but absent in implementation
- implementation present but undocumented
- configuration/example drift
- incomplete feature slices

Method:

1. Start by mapping the repository:
   - identify languages, frameworks, package managers, build tools, test tools, linters, formatters, schemas, generators, and major runtime surfaces.
   - identify entrypoints, major apps/packages/services/modules, shared libraries, and major integration boundaries.
   - Do not assume any specific stack. Detect from manifests (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml`, `Gemfile`, `*.csproj`, etc.). The prompt is language- and ecosystem-agnostic.
2. Read the highest-signal files first:
   - root manifests and lockfiles
   - README and top-level docs
   - tsconfig/jsconfig or equivalent
   - lint/format configs
   - test configs
   - container/build/dev scripts
   - schema/model definitions
   - major app entrypoints
3. Then inspect implementation deeply enough to understand:
   - architectural patterns,
   - critical execution paths,
   - domain boundaries,
   - error flows,
   - test strategy,
   - places with elevated risk.
4. Be selective but thorough:
   - prioritize hand-written source, core abstractions, critical services, adapters, stateful modules, validation layers, security-sensitive code, and tests.
   - avoid wasting time on generated files, vendored code, lockfile internals, or purely cosmetic assets unless they expose meaningful repo issues.
5. When identifying findings:
   - cite concrete files, modules, symbols, or patterns,
   - explain why the issue matters,
   - estimate likely impact,
   - assess confidence,
   - propose a precise remediation direction.
6. Do not produce shallow "best practices" commentary. Tailor every conclusion to this repository.

Severity model:

- Critical: likely to cause serious security, correctness, or data integrity failures; or makes the system materially unsafe/untrustworthy.
- High: substantial architectural, robustness, or maintainability risk that should be prioritized.
- Medium: meaningful issue with real cost/risk, but not immediately dangerous.
- Low: real but lower-impact issue.
- Note: observation worth recording, but not necessarily a defect.

Confidence model:

- High confidence: directly supported by code/config/tests/docs evidence.
- Medium confidence: strong inference from multiple signals.
- Low confidence: plausible but needs validation.

For every significant finding, provide:

- Title
- Severity
- Confidence
- Area / dimension
- Evidence (specific files/modules/symbols/patterns)
- Why it matters
- Likely impact
- Recommended remediation
- Whether it is a quick win, moderate refactor, or deeper architectural change

Output format:
Produce a single structured markdown report at `OUTPUT_PATH` with the following sections:

# Repository Quality Inspection Report — <repo-name> @ <head-sha>

## 1. Executive Summary

- concise overall assessment
- principal strengths
- principal risks
- what appears healthy
- where confidence is low

## 2. Repository Map

- inferred architecture
- major modules/packages/services
- key boundaries and dependencies
- important tooling and runtime surfaces

## 3. Scorecard

Provide a scored assessment from 0.0 to 5.0 for each dimension:

- Structure / Organization
- Architecture / Design
- Code Health / Style
- Type Safety
- Error Handling
- Robustness / Completeness
- Security
- Testing Confidence
- Documentation
- Tooling / DevEx
  For each score, add a short justification.

## 4. Major Strengths

List the strongest positive qualities actually supported by evidence.

## 5. Findings by Priority

List findings in descending priority, using this template:

### [Finding Title]

- Severity:
- Confidence:
- Area:
- Evidence:
- Why it matters:
- Impact:
- Recommended remediation:
- Effort class:

## 6. Findings by Dimension

Group findings under each review dimension, even if already listed above, so the report is navigable by topic.

## 7. Test Coverage and Confidence Analysis

- where tests are strong
- where tests are misleading or thin
- gaps in critical-path confidence
- mock-related concerns only where concretely justified
- the highest-risk untested scenarios

## 8. Documentation Drift and Knowledge Gaps

- docs that appear stale, incomplete, or misleading
- undocumented assumptions or invariants
- missing architecture or setup guidance

## 9. Security Review

- concrete issues or concerns
- risky assumptions
- missing validations or trust-boundary protections
- prioritize real repo-specific risks over generic warnings

## 10. Top 10 Recommended Actions

A prioritized, practical plan with the highest-leverage actions first.
Exclude CI/CD actions unless absolutely necessary to explain a code-quality dependency (or unless `CI_SCOPE=in-scope`).

## 11. Quick Wins

Small changes likely to improve quality materially with relatively low effort.

## 12. Deep Refactors / Structural Work

Larger efforts that would substantially improve the repo if undertaken later.

## 13. Unknowns and Assumptions

State what could not be validated and what conclusions depend on assumptions.

## 14. Appendix: Hotspots

List the files/modules most worth future human attention, with one-line reasons.

## 15. Scope and Inputs Used

Record the values of `STAGE`, `CI_SCOPE`, `MOCK_POSTURE`, `OUTPUT_PATH`, the detected stack (languages, frameworks, package managers, test runners), and the HEAD SHA of the inspected repository. This makes the report reproducible.

Important behavioral rules:

- When `CI_SCOPE=out-of-scope`, do not recommend "add CI" as a generic answer.
- When `MOCK_POSTURE=intentional`, do not treat the existence of mocks as an architectural flaw by itself.
- Do not criticize absent production hardening that is explicitly out of scope for this phase.
- Do not over-index on formatting trivia.
- Do not hide behind uncertainty when evidence is strong.
- Do not present guesses as facts.
- Focus on what most affects maintainability, correctness, robustness, and security in the current stage of the repository.

Begin by mapping the repo and then perform the inspection.
