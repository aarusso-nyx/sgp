# Round 6 Delta From Round 4

Round 4 established the queue boundary and local eSocial relay. Round 6 turns
that boundary into a split-product foundation:

- Contracts moved from inline relay types into a package-shaped stynx-esocial
  contract module.
- SGP gained a canonical `public.esocial_spool` table and service.
- SGP gained SQS transport support without changing the default in-memory mode.
- The separate `stynx-esocial` repo now exists locally with contracts, services,
  CDK skeleton, migration split, and local static gates.
- Real AWS deployment and pilot evidence did not advance because credentials and
  target account inputs are absent.
