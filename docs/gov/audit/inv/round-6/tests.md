# Round 6 Test Inventory

- Unit coverage added for `EsocialSpoolService`,
  `EsocialQueueTransportFlag`, `SqsQueueTransport`, spool-integrated
  `EsocialQueueAdapter`, and the stynx audit/spool update consumers.
- Static DB/RLS coverage added for `public.esocial_spool`.
- Playwright boundary proof added at `tests/e2e/esocial-pilot-s1299.spec.ts`;
  it is not a real SQS pilot and remains blocked on AWS credentials.
- stynx-esocial has self-contained local contract/migration checks:
  `npm run lint`, `npm run test`, `npm run build`, `npm run cdk:synth`,
  `npm run migrate:dev`, `npm run test:db`, and `npm run test:integration`.
