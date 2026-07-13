# Dependency Management

Date: 2026-07-12

## Registry-only STYNX and DEVAI packages

SGP consumes published `@stynx-nyx/*` and `@devai-nyx/*` packages from GitHub
Packages. Local tarballs, sibling-checkout paths, `file:` dependencies and
`link:` dependencies are prohibited. The repository `.npmrc` selects the
registry; callers supply `NODE_AUTH_TOKEN` without writing it to disk.

From a fresh checkout:

```bash
export NODE_AUTH_TOKEN='<GitHub Packages read token>'
npm ci
npm run check:registry-dependencies
```

CI uses the `PACKAGES_READ_TOKEN` repository secret as `NODE_AUTH_TOKEN` for
the install step. A missing or unauthorized token must fail installation; do
not replace a registry dependency with a local artifact to bypass that failure.

## Refresh procedure

1. Confirm the intended published version with the package owner.
2. Update the exact or accepted semver range in the relevant workspace
   manifest.
3. Run `npm install` with a package-read token to refresh `package-lock.json`.
4. Run `npm ci` in a clean temporary checkout or worktree.
5. Run `npm run check:registry-dependencies` and the gates for the affected
   STYNX boundary.
6. Review lockfile source URLs and integrity values before committing.

Unused direct dependencies are removed. Transitive availability is never a
reason to declare a package directly; a package belongs in a workspace manifest
only when that workspace imports or executes its public contract.
