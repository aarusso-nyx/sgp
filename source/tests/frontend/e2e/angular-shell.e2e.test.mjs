import assert from 'node:assert/strict';
import { describe } from 'node:test';

import { getBaseUrl, testWhen } from '../../lib/env.mjs';

const adminFrontendBaseUrl = getBaseUrl('QA_ADMIN_FRONTEND_BASE_URL', [
  'QA_FRONTEND_BASE_URL',
  'FRONTEND_BASE_URL',
]);
const portalFrontendBaseUrl = getBaseUrl('QA_PORTAL_FRONTEND_BASE_URL', [
  'PORTAL_FRONTEND_BASE_URL',
]);
const adminSkipReason =
  'Set QA_ADMIN_FRONTEND_BASE_URL, QA_FRONTEND_BASE_URL, or FRONTEND_BASE_URL to run sgp-admin smoke tests.';
const portalSkipReason =
  'Set QA_PORTAL_FRONTEND_BASE_URL or PORTAL_FRONTEND_BASE_URL to run sgp-portal smoke tests.';

describe('SGP Angular frontend e2e skeleton', () => {
  testWhen(
    'serves the sgp-admin application shell',
    adminFrontendBaseUrl,
    { skipReason: adminSkipReason },
    async () => {
      const response = await fetch(adminFrontendBaseUrl, {
        headers: { accept: 'text/html' },
      });
      const html = await response.text();

      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type') ?? '', /text\/html/);
      assert.match(html, /<app-root/i);
    },
  );

  testWhen(
    'falls back to the sgp-admin shell for a modern routed module URL',
    adminFrontendBaseUrl,
    { skipReason: adminSkipReason },
    async () => {
      const response = await fetch(`${adminFrontendBaseUrl}/gestao`, {
        headers: { accept: 'text/html' },
      });
      const html = await response.text();

      assert.equal(response.status, 200);
      assert.match(html, /<app-root/i);
    },
  );

  testWhen(
    'serves the sgp-portal application shell',
    portalFrontendBaseUrl,
    { skipReason: portalSkipReason },
    async () => {
      const response = await fetch(portalFrontendBaseUrl, {
        headers: { accept: 'text/html' },
      });
      const html = await response.text();

      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type') ?? '', /text\/html/);
      assert.match(html, /<portal-root/i);
    },
  );

  testWhen(
    'falls back to the sgp-portal shell for a documented portal route',
    portalFrontendBaseUrl,
    { skipReason: portalSkipReason },
    async () => {
      const response = await fetch(`${portalFrontendBaseUrl}/meus-dados/cadastro`, {
        headers: { accept: 'text/html' },
      });
      const html = await response.text();

      assert.equal(response.status, 200);
      assert.match(html, /<portal-root/i);
    },
  );
});
