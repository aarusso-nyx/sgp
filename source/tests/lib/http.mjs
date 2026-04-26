import assert from 'node:assert/strict';

export function unsignedTokenFor(groups, overrides = {}) {
  const payload = {
    sub: 'qa-test-subject',
    'cognito:username': 'qa.test',
    'cognito:groups': groups,
    'custom:tenant_id': '00000000-0000-0000-0000-000000000100',
    exp: Math.floor(Date.now() / 1000) + 3600,
    token_use: 'access',
    ...overrides,
  };

  return `${encodePart({ alg: 'none', typ: 'JWT' })}.${encodePart(payload)}.`;
}

export async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      accept: 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;

  return { response, body };
}

export function assertPagedResponse(body) {
  assert.ok(body, 'expected a response body');
  assert.ok(Array.isArray(body.items), 'expected items array');
  assert.equal(typeof body.page, 'number');
  assert.equal(typeof body.pageSize, 'number');
  assert.equal(typeof body.total, 'number');
  assert.equal(typeof body.totalPages, 'number');
}

function encodePart(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
