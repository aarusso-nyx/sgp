# Changelog

This project follows a Keep a Changelog style for human-readable release notes. Round-based implementation history and retained evidence live under `docs/gov/audit/`.

## 1.0.0 (2026-07-13)


### Features

* adopt STYNX and DEVAI across SGP ([#57](https://github.com/aarusso-nyx/sgp/issues/57)) ([db47bb1](https://github.com/aarusso-nyx/sgp/commit/db47bb1748c31fc3426917afeb19304fe281c075))
* **ci:** complete Wave 7 adoption closeout ([1b69028](https://github.com/aarusso-nyx/sgp/commit/1b690282b5d6cce791c642ff3419f7708c51e020))
* close feature audit waves A-C ([b078274](https://github.com/aarusso-nyx/sgp/commit/b07827463e75f00bd7d8b4232420b7b158cc433c))
* close QA phases C and D ([2379e3a](https://github.com/aarusso-nyx/sgp/commit/2379e3a60dda09fbfe4b2dfcfa5fd5ff2847cc12))
* close SGP production audit gaps ([9210ba1](https://github.com/aarusso-nyx/sgp/commit/9210ba135c36c15d3cacfca49c8a5de2031bf1ba))
* close SGP-only B feature gaps ([b6d0756](https://github.com/aarusso-nyx/sgp/commit/b6d075662e044391af037468c344d23034441c73))
* commit current SGP QA lift changes ([7df06e7](https://github.com/aarusso-nyx/sgp/commit/7df06e7545d7dd295216b1737f8dc89843f98e93))
* **devai:** add executable governance foundation ([2a0a980](https://github.com/aarusso-nyx/sgp/commit/2a0a98012089105e74532a62edc5f5c7c4c7fab5))
* **devai:** complete Wave 6 evidence scorecard ([c5aaf82](https://github.com/aarusso-nyx/sgp/commit/c5aaf82d0f8f581af24fd41c43077c2185fa2e0d))
* **eslint:** merge oversize service worker ([5461735](https://github.com/aarusso-nyx/sgp/commit/5461735afd46bd0a412bde783e6c93fad3c4825b))
* **eslint:** warn on services exceeding 500 LOC ([140564e](https://github.com/aarusso-nyx/sgp/commit/140564e9bc613b5792085fc4aeb7dcd80045949f))
* **gov:** adopt stynx shared adapters ([c417a6f](https://github.com/aarusso-nyx/sgp/commit/c417a6f20bafd02d1e9c1df78565e5343e64e0ae))
* **identity:** complete STYNX tenancy adapters ([bb9d418](https://github.com/aarusso-nyx/sgp/commit/bb9d41892b7263bb3d99892c88b91ef0a6719568))
* implement SGP production readiness tranches ([ff3aeac](https://github.com/aarusso-nyx/sgp/commit/ff3aeacf335037f4ef825417d2aad183c4b134f1))
* **infra:** merge multi-AZ ASG worker ([dff45c2](https://github.com/aarusso-nyx/sgp/commit/dff45c28b405bc4e03e0705338e9e33904601fc3))
* **infra:** multi-AZ ASG with cross-zone LB ([8f006dd](https://github.com/aarusso-nyx/sgp/commit/8f006dd05d5c45bb86c083df6819f5e734d87f00))
* **observability:** emit pdf-a validation telemetry [skip ci] ([2a81d00](https://github.com/aarusso-nyx/sgp/commit/2a81d00515f0492b87d28a851ee9f6961a31214a))
* **platform:** compose STYNX runtime foundation ([17a7d56](https://github.com/aarusso-nyx/sgp/commit/17a7d56900e917c38306e7bb01cb96dc1edaacaf))
* **report:** wire stynx PDF/A validator into payslip builder [skip ci] ([9485689](https://github.com/aarusso-nyx/sgp/commit/9485689b955769834fafcf3bbfad01af27292f8a))
* **report:** wire stynx PDF/A validator into yearly-income builder [skip ci] ([d60c1cc](https://github.com/aarusso-nyx/sgp/commit/d60c1ccb3e427158ff2ff50aa6abfe6e895acbd1))
* **test:** add pdf-a build-time strict conformance gate [skip ci] ([9727772](https://github.com/aarusso-nyx/sgp/commit/972777267a02d02da50fc7d5f8566fae12424021))


### Bug Fixes

* **audit:** correct sgp_append_audit_event argument count and mapping ([#59](https://github.com/aarusso-nyx/sgp/issues/59)) ([1d0c9f3](https://github.com/aarusso-nyx/sgp/commit/1d0c9f384ae2a53768cdf749e7b2dc34a33f6a36))
* **checks:** keep duplication audit report-only ([9be1e38](https://github.com/aarusso-nyx/sgp/commit/9be1e382876da1cd6374986ae84acecfd70fa32d))
* **ci:** bootstrap isolated coverage database ([c7a7688](https://github.com/aarusso-nyx/sgp/commit/c7a768844a20c2ada103c202a4e411a084934a31))
* **ci:** ignore exact baseline SHA fingerprint ([4b23c2b](https://github.com/aarusso-nyx/sgp/commit/4b23c2b5464deea1076a4d95dafc0acd8a97ad22))
* **ci:** isolate gitleaks commit allowlist ([1ac9d41](https://github.com/aarusso-nyx/sgp/commit/1ac9d41c448237a3a68a321ac04ded38ea19b0a9))
* **ci:** make mutation evidence portable ([3116dc5](https://github.com/aarusso-nyx/sgp/commit/3116dc5457218160426fe4156a1983ed728d2444))
* **ci:** satisfy adoption policy gates ([132ec5b](https://github.com/aarusso-nyx/sgp/commit/132ec5ba8bbf15161b6249bbaf598f5726a04882))
* **ci:** scope baseline secret-scan exception ([c3d9c62](https://github.com/aarusso-nyx/sgp/commit/c3d9c62f741528eea8ff7e9b11f5a76c29619be4))
* close QA lift gaps ([ac904a6](https://github.com/aarusso-nyx/sgp/commit/ac904a60619b7faf9f94835beb9852b0bea70f7a))
* **e2e:** harden deep runtime fixtures ([#51](https://github.com/aarusso-nyx/sgp/issues/51)) ([f0ac592](https://github.com/aarusso-nyx/sgp/commit/f0ac5926e604e04f3a60a603c06a1c2c30ecf7da))
* **e2e:** retry transient portal chunk loads ([d5a5879](https://github.com/aarusso-nyx/sgp/commit/d5a587919a46bb656588b2f2f750ca9cf49d22c5))
* **governance:** classify framework RLS catalogs ([5184535](https://github.com/aarusso-nyx/sgp/commit/5184535b87dba02eb49fdfd534342cb32f64b2d1))
* **governance:** harden ledger and RLS guard checks ([a4d3ced](https://github.com/aarusso-nyx/sgp/commit/a4d3ced9555dc93f2ee408d6facf3fe80a151c6f))
* **infra:** add node types for cdk build ([97cb945](https://github.com/aarusso-nyx/sgp/commit/97cb94580c403c1beab7db9c930e3032b95d6067))


### Performance Improvements

* **ci:** parallelize DEVAI evidence tiers ([40df8a5](https://github.com/aarusso-nyx/sgp/commit/40df8a508cadb4d58cae4e72d03b6f5b7b2b914c))

## [Unreleased]

- Align the Angular, NestJS, TypeScript, ESLint, Prettier, Vitest, Playwright, RxJS and Node type toolchain with the STYNX/PEC/TEAT baseline.
- QA round quickwins and lifts are being tracked from `docs/work/qa/report.md`.
