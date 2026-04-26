#!/usr/bin/env node

const asJson = process.argv.includes('--json');
const shouldCheck = process.argv.includes('--check');

const groups = [
  {
    name: 'API smoke',
    keys: ['QA_API_BASE_URL', 'API_BASE_URL'],
    example: 'http://127.0.0.1:3000',
    note: 'Required for tests/backend/api/*.test.mjs.',
  },
  {
    name: 'Backend auth/domain smoke',
    keys: ['QA_API_BASE_URL', 'API_BASE_URL'],
    example: 'http://127.0.0.1:3000',
    note: 'Required for tests/backend/e2e/*.test.mjs. Unsigned-token runs also need AUTH_ALLOW_UNSIGNED_TEST_TOKENS=true on the running backend.',
  },
  {
    name: 'Admin frontend smoke',
    keys: ['QA_ADMIN_FRONTEND_BASE_URL', 'QA_FRONTEND_BASE_URL', 'FRONTEND_BASE_URL'],
    example: 'http://127.0.0.1:4200',
    note: 'Required for sgp-admin shell smoke tests.',
  },
  {
    name: 'Portal frontend smoke',
    keys: ['QA_PORTAL_FRONTEND_BASE_URL', 'PORTAL_FRONTEND_BASE_URL'],
    example: 'http://127.0.0.1:4300',
    note: 'Required for sgp-portal shell smoke tests.',
  },
];

function configuredValue(keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return { key, value };
    }
  }
  return null;
}

const status = groups.map((group) => {
  const configured = configuredValue(group.keys);
  return {
    ...group,
    configured: Boolean(configured),
    configured_key: configured?.key,
    configured_value: configured?.value,
  };
});

const missing = status.filter((group) => !group.configured);

if (asJson) {
  console.log(
    JSON.stringify(
      {
        ok: missing.length === 0,
        missing: missing.map((group) => ({
          name: group.name,
          accepted_env: group.keys,
          example: group.example,
          note: group.note,
        })),
        configured: status
          .filter((group) => group.configured)
          .map((group) => ({
            name: group.name,
            env: group.configured_key,
            value: group.configured_value,
          })),
      },
      null,
      2,
    ),
  );
} else {
  console.log('[qa-smoke] required live base URLs');
  for (const group of status) {
    if (group.configured) {
      console.log(`[qa-smoke] OK ${group.name}: ${group.configured_key}=${group.configured_value}`);
      continue;
    }
    console.log(
      `[qa-smoke] BLOCKED ${group.name}: set one of ${group.keys.join(
        ', ',
      )}; example ${group.keys[0]}=${group.example}`,
    );
    console.log(`[qa-smoke]   ${group.note}`);
  }
}

if (shouldCheck && missing.length > 0) {
  process.exitCode = 1;
}
