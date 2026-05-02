# Future Prompt - Arrecadacao Previdenciaria

## Status

Arrecadacao Previdenciaria is later-version scope. Do not execute this prompt as part of the current v0.0.1 closure sequence.

Before scheduling this domain, update `docs/eng/` to reinstate it as current scope with explicit acceptance gates.

## Future Scope

When scheduled, cover the full domain instead of adding partial placeholders:

- backend routes for aliquotas, indices, totalizacoes, DUAM generation, and reports;
- admin frontend feature module for the Arrecadacao workflows;
- DB objects for contribution rates, correction indexes, totalization, DUAM, and report metadata;
- route-alignment source coverage for the route-bearing docs;
- authorization roles and menu seed coverage;
- test strategy, coverage targets, QA smoke coverage, and final reassessment updates.

## Current Package Boundary

- No current Arrecadacao backend implementation.
- No current Arrecadacao frontend implementation.
- No current Arrecadacao route-alignment blocker.
- No current Arrecadacao DB closure blocker unless an object is shared with a non-Arrecadacao owner.
