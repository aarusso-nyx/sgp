# Environment Variables

This file documents variables used by `sgp-admin`, `sgp-portal`, the Nest APIs, tests, and deployment planning. Placeholder examples are split by consumer:

- `backend/.env.example`: Nest API, workers, Cognito, database, S3, and eSocial submission variables.
- `tests/.env.example`: QA smoke/e2e base URLs and local test storage variables.
- `infra/aws/.env.example`: deployment planning variables.

## Auth (Cognito)

- `COGNITO_REGION`: AWS region hosting Cognito.
- `COGNITO_USER_POOL_ID`: Cognito User Pool identifier.
- `COGNITO_CLIENT_ID`: Cognito app client identifier.
- `COGNITO_DOMAIN`: Cognito hosted UI base domain.
- `COGNITO_REDIRECT_URI`: local callback URI after login.
- `COGNITO_LOGOUT_URI`: post-logout redirect URI.

## API / Data

- `API_BASE_URL`: API base URL for both SPAs and tooling.
- `API_BASE_PATH`: API prefix path consumed by both SPAs (default `/api`).
- `CORS_ORIGIN`: comma-separated browser origins allowed by the Nest HTTP entrypoints. It is required when `NODE_ENV=production`; local development defaults to `http://localhost:4200` only when unset.
- `DATABASE_URL`: PostgreSQL connection string for backend and Prisma.
- `S3_REGION`: AWS region for the S3 documents bucket (defaults to `AWS_REGION` when omitted).
- `S3_ENDPOINT`: optional S3-compatible endpoint override.
- `S3_FORCE_PATH_STYLE`: set to `true` for path-style S3-compatible endpoints.
- `S3_DOCUMENTS_BUCKET`: bucket used by `/api/v1/arquivos` presigned upload/download endpoints.
- `S3_DOCUMENTS_PRESIGN_EXPIRES_SECONDS`: upload URL TTL in seconds (default `900`).
- `S3_DOCUMENTS_DOWNLOAD_EXPIRES_SECONDS`: download URL TTL in seconds (default `300`).
- `S3_DOCUMENTS_KEY_PREFIX`: object key prefix for generated document storage keys (default `documents`).
- `SGP_RATE_LIMIT_IP_LIMIT`: requests allowed per IP window (default `120`).
- `SGP_RATE_LIMIT_IP_TTL_MS`: per-IP rate-limit window in milliseconds (default `60000`).
- `SGP_RATE_LIMIT_TENANT_LIMIT`: requests allowed per tenant window; must be higher than `SGP_RATE_LIMIT_IP_LIMIT` (default `600`).
- `SGP_RATE_LIMIT_TENANT_TTL_MS`: per-tenant rate-limit window in milliseconds (default matches `SGP_RATE_LIMIT_IP_TTL_MS`).
- `SGP_RATE_LIMIT_TRUST_PROXY`: set to `true` only behind a trusted proxy so Express uses forwarded client IP metadata.
- `/metrics`: Prometheus text endpoint exposed by `sgp-core-api`, `sgp-portal-api`, `sgp-payroll-engine`, and `sgp-report-service`. The endpoint includes HTTP request counters/histograms plus queue depth, eSocial submission, and DCTFWeb transmission metric objects for worker/domain instrumentation.
- `OTEL_TRACES_EXPORTER`: set to `otlp` to enable the dependency-free local OTLP/HTTP request-span exporter, or `none` to disable trace export.
- `OTEL_EXPORTER_OTLP_ENDPOINT`: OTLP/HTTP collector base URL. When `OTEL_TRACES_EXPORTER=otlp` and this is unset, local development exports to `http://localhost:4318/v1/traces`.
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`: exact OTLP/HTTP traces endpoint; overrides `OTEL_EXPORTER_OTLP_ENDPOINT`.
- `OTEL_SERVICE_NAME`: service name attached to trace resource attributes; defaults to the runtime entrypoint name (`sgp-core-api`, `sgp-portal-api`, `sgp-payroll-engine`, or `sgp-report-service`).
- `OTEL_RESOURCE_ATTRIBUTES`: comma-separated resource attributes (`deployment.environment=dev,service.namespace=sgp`).
- `OTEL_SDK_DISABLED`: set to `true` to disable local tracing hooks even when OTLP variables are set.
- `MINIO_TEST_STORAGE_ENABLED`: enables Docker MiniIO fallback for tests when S3 bucket/region are not set.
- `MINIO_ENDPOINT`: MiniIO endpoint for tests (default `http://127.0.0.1:9000`).
- `MINIO_DOCUMENTS_BUCKET`: MiniIO bucket for tests (default `sgp-test-documents`).
- `MINIO_REGION`: MiniIO region for tests (default `us-east-1`).
- `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`: local MiniIO credentials for tests.

## AWS Deploy Planning

- `AWS_REGION`: AWS region for deployment operations.
- `AWS_ACCOUNT_ID`: AWS account identifier.
- `AWS_PROFILE`: local AWS CLI profile name.
- `DEPLOY_TARGET`: deployment environment (`stage` or `prod`).
- `BACKEND_IMAGE_URI`: container image URI for the API runtime family.
- `FRONTEND_DOMAIN`: DNS name for `sgp-admin`.
- `PORTAL_FRONTEND_DOMAIN`: DNS name for `sgp-portal`.
- `COGNITO_CALLBACK_URL`: deployed `sgp-admin` callback URL.
- `COGNITO_LOGOUT_URL`: deployed `sgp-admin` logout URL.
- `PORTAL_COGNITO_CALLBACK_URL`: deployed `sgp-portal` callback URL.
- `PORTAL_COGNITO_LOGOUT_URL`: deployed `sgp-portal` logout URL.

## Conventions

- Use `*.env.example` files for placeholders only.
- Use environment-specific secret stores in CI/CD.
- Keep values explicit and environment-scoped (`stage` vs `prod`).
