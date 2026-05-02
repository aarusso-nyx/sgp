import { test } from 'node:test';

const blockedSkips = [];
let blockedSkipSummaryRegistered = false;

function cleanBaseUrl(value) {
  if (!value) return undefined;
  return value.replace(/\/+$/, '');
}

export function getEnv(name, fallbackNames = []) {
  for (const key of [name, ...fallbackNames]) {
    const value = process.env[key];
    if (value) return value;
  }
  return undefined;
}

export function getBaseUrl(name, fallbackNames = []) {
  return cleanBaseUrl(getEnv(name, fallbackNames));
}

export function testWhen(name, requiredValue, options, fn) {
  if (!requiredValue) {
    const skipReason = options.skipReason ?? 'Required smoke-test configuration is missing.';
    blockedSkips.push({ name, skipReason });
    console.warn(`[qa-smoke] BLOCKED ${name}: ${skipReason}`);
    if (!blockedSkipSummaryRegistered) {
      blockedSkipSummaryRegistered = true;
      process.on('beforeExit', () => {
        if (blockedSkips.length === 0) return;
        console.warn(
          `[qa-smoke] BLOCKED ${blockedSkips.length} smoke test(s); skipped suites are not passing e2e evidence.`,
        );
      });
    }
    test(name, { skip: `BLOCKED: ${skipReason}` }, () => {});
    return;
  }

  const { skipReason: _skipReason, ...testOptions } = options;
  test(name, testOptions, fn);
}
