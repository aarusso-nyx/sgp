#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const repository = process.env.GITHUB_REPOSITORY ?? process.argv[2];
const branch = process.env.BRANCH_PROTECTION_BRANCH ?? 'main';
const requiredContexts = (
  process.env.BRANCH_PROTECTION_REQUIRED_CONTEXTS ??
  'Workspace gates,CodeQL,ADR Gate,Dependency Review'
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const policyPath =
  process.env.BRANCH_PROTECTION_POLICY_FILE ?? 'docs/gov/branch-protection-policy.json';
const declaredPolicy = existsSync(policyPath) ? JSON.parse(readFileSync(policyPath, 'utf8')) : {};
const mode = process.env.BRANCH_PROTECTION_MODE ?? declaredPolicy.mode ?? 'collaborative';

if (!repository) {
  console.error('[branch-protection] GITHUB_REPOSITORY or repository argument is required.');
  process.exit(1);
}

function ghApi(path) {
  const output = execFileSync('gh', ['api', path], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(output);
}

const protection = ghApi(`repos/${repository}/branches/${branch}/protection`);
const failures = [];

const contexts = new Set(protection.required_status_checks?.contexts ?? []);
for (const context of requiredContexts) {
  if (!contexts.has(context)) {
    failures.push(`missing required status check: ${context}`);
  }
}

const reviews = protection.required_pull_request_reviews;
if (!['solo-owner', 'collaborative'].includes(mode)) {
  failures.push(`unsupported branch protection mode: ${mode}`);
} else if (mode === 'collaborative') {
  if (!reviews) {
    failures.push('required pull request reviews are not configured');
  }
  if ((reviews?.required_approving_review_count ?? 0) < 1) {
    failures.push('required approving review count is below 1');
  }
  if (reviews?.require_code_owner_reviews !== true) {
    failures.push('code owner reviews are not required');
  }
  if (reviews?.require_last_push_approval !== true) {
    failures.push('approval from someone other than the last pusher is not required');
  }
} else {
  if (declaredPolicy.owner !== 'aarusso-nyx') {
    failures.push('solo-owner policy must name the repository owner');
  }
  if (declaredPolicy.production !== false) {
    failures.push('solo-owner mode is prohibited for production governance');
  }
  if ((reviews?.required_approving_review_count ?? 0) !== 0) {
    failures.push('solo-owner required approving review count must be 0');
  }
  if (reviews?.require_code_owner_reviews === true) {
    failures.push('solo-owner mode must not require an impossible CODEOWNER approval');
  }
  if (reviews?.require_last_push_approval === true) {
    failures.push('solo-owner mode must not require approval from another pusher');
  }
}

if (protection.allow_force_pushes?.enabled === true) {
  failures.push('force pushes are allowed');
}

if (process.env.BRANCH_PROTECTION_REQUIRE_SIGNED_COMMITS === 'true') {
  const signedCommitProtection = ghApi(
    `repos/${repository}/branches/${branch}/protection/required_signatures`,
  );
  if (signedCommitProtection.enabled !== true) {
    failures.push('signed commits are not required');
  }
}

if (failures.length > 0) {
  console.error(`[branch-protection] ${repository}:${branch} is not compliant.`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `[branch-protection] ${repository}:${branch} is compliant in ${mode} mode with ${requiredContexts.length} required check(s).`,
);
