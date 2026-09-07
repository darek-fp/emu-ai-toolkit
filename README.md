# @darek-fp/ai-toolkit

Team AI artifacts (skills and rules) distributed as a private npm package
through GitHub Packages, installable into consumer repositories that use
Claude Code, GitHub Copilot, or both.

## What gets installed

On `npm install`, this package's `postinstall` hook runs `install.js`, which
detects which AI tool convention(s) exist in your repository:

- If `.claude/` exists, the Claude target is installed: the placeholder skill
  goes to `.claude/skills/code-review/`, and the placeholder rule block is
  appended to `CLAUDE.md` between sentinel markers.
- If `.github/` exists, the Copilot target is installed: the placeholder
  skill goes to `.github/skills/code-review/`, and the placeholder rule block
  is appended to `AGENTS.md` between sentinel markers.
- If neither directory exists, **both** targets are installed.

All installed files are tracked in a single `.ai-toolkit-manifest.json` at
your project root, so `npx ai-toolkit uninstall` (or `node uninstall.js`) can
cleanly remove everything it added — including the sentinel-wrapped rule
blocks — without touching anything else in your files. Re-running install is
idempotent: it updates the managed blocks/files in place instead of
duplicating them.

## Consumer repository setup

Add this to your repository's committed `.npmrc` so npm knows to resolve the
`@darek-fp` scope from GitHub Packages:

```text
@darek-fp:registry=https://npm.pkg.github.com
```

This file must contain **only** the registry mapping — never commit an auth
token to it.

### Authenticating

Local developers should authenticate with `npm login` against
`https://npm.pkg.github.com`, or configure their own user-level `.npmrc` with
a personal access token that has `read:packages` scope.

In CI, this package's installer may add the following CI-only `preinstall`
helper to your `package.json` scripts (only when no existing GitHub Packages
auth flow is detected):

```bash
[ -n "$GH_PKG_TOKEN" ] && echo '//npm.pkg.github.com/:_authToken=${GH_PKG_TOKEN}' >> .npmrc || true
```

This snippet is intended for CI environments only — set the `GH_PKG_TOKEN`
secret in your CI provider. Never commit a real `_authToken` value to the
repository.