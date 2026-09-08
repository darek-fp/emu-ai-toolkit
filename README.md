# @darek-fp/ai-toolkit

Team AI artifacts (skills and rules) distributed as a private npm package
through GitHub Packages, installable into repositories that use supported AI
coding-tool conventions. This package integrates local repository conventions;
it does not provide model/API clients or credentials.

## What gets installed

On `npm install`, this package's `postinstall` hook runs `install.js`. It
detects the following repository markers and installs the corresponding
convention:

| Target | Marker | Skills | Rules |
| --- | --- | --- | --- |
| Claude Code | `.claude/` | `.claude/skills/` | `CLAUDE.md` |
| GitHub Copilot | `.github/` | `.github/skills/` | `AGENTS.md` |
| Cursor | `.cursor/` | `.cursor/skills/` | `.cursor/rules/ai-toolkit.mdc` |
| Windsurf | `.windsurf/` | `.windsurf/skills/` | `.windsurf/rules/ai-toolkit.md` |

Markdown rule files use sentinel markers. Cursor files also receive native
frontmatter (`description` and `alwaysApply`) before the managed block.
Existing rule text and unmanaged skill files are preserved. A conflicting
unmanaged skill is reported in the manifest and is not overwritten.

If neither a marker nor an explicit selection exists, the legacy **Claude and
Copilot** pair is installed. To select targets explicitly:

```bash
npx ai-toolkit install --target cursor,windsurf
AI_TOOLKIT_TARGETS=claude npx ai-toolkit install
```

The CLI option takes precedence over `AI_TOOLKIT_TARGETS`. Target IDs are
`claude`, `copilot`, `cursor`, and `windsurf`; invalid IDs fail before any
files are written. `uninstall` takes no target because the manifest is the
authority.

All installed files are tracked in a versioned `.ai-toolkit-manifest.json` at
your project root, so `npx ai-toolkit uninstall` (or `node uninstall.js`) can
remove toolkit-owned files and sentinel-wrapped rule blocks without touching
unmanaged content. Existing Claude/Copilot manifests remain uninstallable.
Unknown or newer manifest versions fail closed and preserve consumer files.
Re-running install is idempotent: it updates managed blocks/files in place
instead of duplicating them.

## Consumer repository setup

Add this to your repository's committed `.npmrc` so npm knows to resolve the
`@darek-fp` scope from GitHub Packages:

```text
@darek-fp:registry=https://npm.pkg.github.com
```

This file must contain **only** the registry mapping — never commit an auth
token to it.

## Release lifecycle

This package uses `semantic-release` as the only source of package versioning
and publication control. `package.json` is the canonical version source, and the
release job runs only on pushes to `main` or `master` after the repository's
validation checks pass.

The workflow is intentionally package-only:

- version changes are driven by conventional commits and semantic-release
- Git tags are the internal release signal for this package
- GitHub Releases are not the primary publish contract for the package itself
- `npm publish` is never triggered directly from a raw branch push

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