Gate failed: `npm run test`

Prior gates passed:
- `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run lint`
- `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run typecheck`

Diagnostic output:

```text
> sgp-modernization-source@0.1.0 test
> node scripts/run.mjs test


> sgp-modernization-source@0.1.0 test:workspaces
> npm run test:frontend && npm run test:portal && npm run test:backend


> sgp-modernization-source@0.1.0 test:frontend
> npm --workspace frontend run test:admin

Test Files  35 passed (35)
Tests  65 passed (65)

> sgp-modernization-source@0.1.0 test:portal
> npm --workspace frontend run test:portal

Test Files  7 passed (7)
Tests  8 passed (8)

> sgp-modernization-source@0.1.0 test:backend
> npm --workspace backend run test

> backend@0.0.1 test
> jest

FAIL src/esocial-worker/builders/s2210.builder.spec.ts
  ● S-2210 builder › builds XSD-valid INICIAL XML

    ENOENT: no such file or directory, open '/Users/aarusso/Development/stech/sgp/source/backend/src/esocial-worker/builders/__fixtures__/s2210-inicial.golden.xml'

      75 |
      76 | function golden(file: string): string {
    > 77 |   return readFileSync(join(__dirname, '__fixtures__', file), 'utf8').trim();
         |                      ^
      78 | }
      79 |

      at golden (esocial-worker/builders/s2210.builder.spec.ts:77:22)
      at esocial-worker/builders/s2210.builder.spec.ts:26:29

  ● S-2210 builder › builds XSD-valid REABERTURA XML

    ENOENT: no such file or directory, open '/Users/aarusso/Development/stech/sgp/source/backend/src/esocial-worker/builders/__fixtures__/s2210-reabertura.golden.xml'

      75 |
      76 | function golden(file: string): string {
    > 77 |   return readFileSync(join(__dirname, '__fixtures__', file), 'utf8').trim();
         |                      ^
      78 | }
      79 |

      at golden (esocial-worker/builders/s2210.builder.spec.ts:77:22)
      at esocial-worker/builders/s2210.builder.spec.ts:26:29

  ● S-2210 builder › builds XSD-valid OBITO XML

    ENOENT: no such file or directory, open '/Users/aarusso/Development/stech/sgp/source/backend/src/esocial-worker/builders/__fixtures__/s2210-obito.golden.xml'

      75 |
      76 | function golden(file: string): string {
    > 77 |   return readFileSync(join(__dirname, '__fixtures__', file), 'utf8').trim();
         |                      ^
      78 | }
      79 |

      at golden (esocial-worker/builders/s2210.builder.spec.ts:77:22)
      at esocial-worker/builders/s2210.builder.spec.ts:26:29

[Nest] 35346  - 02/05/2026, 03:39:31   ERROR [IntegrationsWorkerService] failed to process FOLHA_CNAB_RETORNO request req-2: Missing required worker parameter: s3Key
[Nest] 35346  - 02/05/2026, 03:39:31   ERROR [IntegrationsWorkerService] failed to process NAO_SUPORTADO request req-unsupported: Unsupported integrations job: NAO_SUPORTADO
[Nest] 35346  - 02/05/2026, 03:39:31   ERROR [IntegrationsWorkerService] failed to process FOLHA_CNAB_REMESSA request req-missing-remittance: Remittance record not found
[Nest] 35346  - 02/05/2026, 03:39:31   ERROR [IntegrationsWorkerService] failed to process FOLHA_CNAB_RETORNO request req-missing-return: Return remittance record not found
[Nest] 35346  - 02/05/2026, 03:39:31   ERROR [IntegrationsWorkerService] failed to process ESOCIAL_EVENTO_PROCESSAR request req-missing-event: eSocial event not found

Summary of all failing tests
FAIL esocial-worker/builders/s2210.builder.spec.ts
  ● S-2210 builder › builds XSD-valid INICIAL XML

    ENOENT: no such file or directory, open '/Users/aarusso/Development/stech/sgp/source/backend/src/esocial-worker/builders/__fixtures__/s2210-inicial.golden.xml'

      75 |
      76 | function golden(file: string): string {
    > 77 |   return readFileSync(join(__dirname, '__fixtures__', file), 'utf8').trim();
         |                      ^
      78 | }
      79 |

      at golden (esocial-worker/builders/s2210.builder.spec.ts:77:22)
      at esocial-worker/builders/s2210.builder.spec.ts:26:29

  ● S-2210 builder › builds XSD-valid REABERTURA XML

    ENOENT: no such file or directory, open '/Users/aarusso/Development/stech/sgp/source/backend/src/esocial-worker/builders/__fixtures__/s2210-reabertura.golden.xml'

      75 |
      76 | function golden(file: string): string {
    > 77 |   return readFileSync(join(__dirname, '__fixtures__', file), 'utf8').trim();
         |                      ^
      78 | }
      79 |

      at golden (esocial-worker/builders/s2210.builder.spec.ts:77:22)
      at esocial-worker/builders/s2210.builder.spec.ts:26:29

  ● S-2210 builder › builds XSD-valid OBITO XML

    ENOENT: no such file or directory, open '/Users/aarusso/Development/stech/sgp/source/backend/src/esocial-worker/builders/__fixtures__/s2210-obito.golden.xml'

      75 |
      76 | function golden(file: string): string {
    > 77 |   return readFileSync(join(__dirname, '__fixtures__', file), 'utf8').trim();
         |                      ^
      78 | }
      79 |

      at golden (esocial-worker/builders/s2210.builder.spec.ts:77:22)
      at esocial-worker/builders/s2210.builder.spec.ts:26:29

Test Suites: 1 failed, 117 passed, 118 total
Tests: 3 failed, 356 passed, 359 total
Snapshots: 0 total
Time: 3.052 s, estimated 4 s
Ran all test suites.
npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/aarusso/Development/stech/sgp/source/backend
npm error workspace backend@0.0.1
npm error location /Users/aarusso/Development/stech/sgp/source/backend
npm error command failed
npm error command sh -c jest
```

Additional workspace note: `source/backend/src/esocial-worker/builders/s2210.builder.spec.ts` is currently untracked in this shared worktree together with other SST/eSocial files, and the missing `s2210-*.golden.xml` fixtures are outside the REC-04 classification slice scope. I did not modify those files.
