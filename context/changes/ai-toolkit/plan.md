# AI Toolkit npm Package (GitHub Packages) Implementation Plan

## Overview

Scaffold `@darek-fp/ai-toolkit` at the repository root: a dual-target
(Claude Code + GitHub Copilot) npm package that consumer repositories install
from GitHub Packages. The installer detects which AI tool convention(s) are
present in the consumer repo, copies the placeholder skill and appends the
placeholder rule into the right locations, tracks everything in one shared
manifest, and can be reversed with a manifest-driven uninstaller. CI validates
and publishes the package to GitHub Packages on push to `main`/`master`.

## Current State Analysis

The repository root currently has no `package.json`, no `AGENTS.md`, and no
`skills/`/`rules/` directories — this is a from-scratch scaffold, not a
refactor. Two source-of-truth documents exist but disagree with the repo's
actual identity in three ways (resolved by `context/changes/ai-toolkit/frame.md`):

- `.github/prompts/m5l4-github-packages-spec-pack.md` — functional spec
  (package contents, installer behavior, sentinel markers, auth helper).
- `.github/prompts/m5l4-github-packages-spec-cicd.md` — CI spec (workflow
  location, validation checklist, publish job).
- `.github/config-templates/m5l4-github-packages-*.template` — five starter
  files (package.json, install.js, uninstall.js, consumer `.npmrc`, CI
  workflow), all hardcoded to `@twoj-zespol` scope and Claude-only paths
  (`.claude/skills/`, `CLAUDE.md`).

## Desired End State

A published-ready package at the repo root:

```text
package.json
README.md
install.js
uninstall.js
bin/
└── cli.js
skills/
└── code-review/
    └── SKILL.md
rules/
└── AGENTS.md
.github/workflows/publish-ai-toolkit.yml
```

Verify by: `npm pack --dry-run` succeeds and lists exactly the files declared
in `package.json`'s `files` array; running `node install.js` against a scratch
consumer directory (with `.claude/`, with `.github/`, and with neither)
produces the file layouts described in Phase 2; `node uninstall.js`
afterwards removes everything the manifest recorded and leaves no sentinel
block residue; the GitHub Actions workflow's `validate` job passes locally
via `act` or by inspection of each step's command.

### Key Discoveries:

- Frame brief already resolved scope (`@darek-fp`), dual-tool requirement, and
  placeholder-only content — see `context/changes/ai-toolkit/frame.md`.
- `.github/skills/pack-init/SKILL.md` (a sibling skill for a different
  delivery model) establishes this repo's own convention: `rules/AGENTS.md`
  regardless of target tool, `skills/<name>/SKILL.md` with YAML frontmatter,
  manifest-tracked installs, sentinel-blocked rule appends, full idempotency.
  This plan reuses that convention for the Copilot target instead of
  inventing a new one.
- `.github/skills/*/SKILL.md` across this repo all use
  `---\nname: <dir-name>\ndescription: <one-line>\n---` frontmatter — the
  placeholder `skills/code-review/SKILL.md` follows the same shape so the CI
  frontmatter check (spec-cicd item 3–4) has a real pattern to validate
  against.
- The templates' `findProjectRoot()` walks up from `__dirname` looking for a
  `node_modules` ancestor; this only works when the package is actually
  installed as a dependency. It must be preserved as-is for the real
  postinstall path, with `process.env.PROJECT_ROOT` override kept for the
  CI smoke test (Phase 3) and local manual testing.

## What We're NOT Doing

- Not shipping the real `10x-*` skill suite — only the spec pack's single
  placeholder `skills/code-review/SKILL.md` and `rules/AGENTS.md` (per frame).
- Not implementing AWS CodeArtifact, Terraform, or the Model 2 `pack-init`
  pipeline — this is the GitHub Packages (Model 1) path only.
- Not building a full consumer-simulation CI job (publish-to-local-registry +
  real `npm install` of the tarball) — CI validation is the round-trip smoke
  test described in Phase 3, not a full end-to-end consumer install.
- Not adding a config flag or environment variable to force a specific
  install target — target selection is presence-detection only (see Phase 2).
- Not handling AI tool conventions beyond Claude Code and GitHub Copilot
  (e.g. Cursor, Windsurf) — out of scope per frame.

## Implementation Approach

Adapt the five templates in place rather than writing from scratch: keep
their file-copy/sentinel-block/manifest primitives, but restructure
`install.js`/`uninstall.js` as modules with an exported `run()` plus a
direct-execution guard, add a thin `bin/cli.js` dispatcher, extend the
manifest schema with a `targets` array, and replace every `@twoj-zespol` /
`@emu` scope reference with `@darek-fp`. CI reuses the spec-cicd validation
checklist verbatim and adds one smoke-test step for the new dual-target
behavior.

## Critical Implementation Details

### Module/script duality

`install.js` and `uninstall.js` must work two ways: as a bare `node
install.js` (what `postinstall` invokes, with `require.main === module`
true) and as a `require()`'d module from `bin/cli.js` (dispatch, where
`require.main === module` is false). Structure each file as
`module.exports = { run }` followed by:

```js
if (require.main === module) {
  run();
}
```

`bin/cli.js` requires `../install.js` and `../uninstall.js` and calls
`.run()` on whichever `process.argv[2]` selects, defaulting to `install`
when no argument is given (so `postinstall`'s `node install.js` and a bare
`npx ai-toolkit` behave identically).

### Preinstall auth-helper injection scope

The spec pack's `GH_PKG_TOKEN` snippet is guidance for the *consumer's*
`package.json`, not this package's own scripts. `install.js` only writes it
into the consumer's `package.json` when **all** of: the consumer
`package.json` exists, `process.env.CI` is truthy (the spec pack says this
helper is CI-only; local devs use `npm login`), and no existing `preinstall`
script already references `GH_PKG_TOKEN` or `_authToken`. Record
`preinstallInjected: true` in the manifest when it does this, so
`uninstall.js` can safely remove exactly the line it added rather than
guessing.

## Phase 1: Package Scaffold & Metadata

### Overview

Create the package's static files: metadata, README, and the two placeholder
artifacts (`skills/code-review/SKILL.md`, `rules/AGENTS.md`).

### Changes Required:

#### 1. Package metadata

**File**: `package.json`

**Intent**: Declare the publishable package — name, files, scripts, bin,
engines — scoped to the verified GitHub owner.

**Contract**: Adapt
`.github/config-templates/m5l4-github-packages-package.json.template`
verbatim except: `name` → `@darek-fp/ai-toolkit`; `files` gains `"bin/"`
(the array becomes `["skills/", "rules/", "install.js", "uninstall.js",
"bin/", "README.md"]`); `bin` → `{ "ai-toolkit": "./bin/cli.js" }` (not
`./install.js`, since Phase 2 makes the bin a dispatcher); `scripts.postinstall`
stays `"node install.js"` unchanged; `publishConfig.registry`,
`type: "commonjs"`, `engines.node: ">=20"` unchanged from the template.

#### 2. Package README

**File**: `README.md`

**Intent**: Document what the package installs, how consumers configure
the registry, and the CI auth recipe — this is the "generate instructions
for consumer repositories" deliverable from the spec pack, not a separate
`.npmrc` file.

**Contract**: Must include, as fenced code blocks: (a) the consumer
`.npmrc` mapping exactly as
`.github/config-templates/m5l4-github-packages-consumer.npmrc.template`
but with `@twoj-zespol` replaced by `@darek-fp`; (b) the CI-only preinstall
auth snippet from the spec pack's "Authentication behavior" section,
labeled clearly as CI-only guidance; (c) a short "What gets installed"
section describing the dual-target behavior (detects `.claude/` /
`.github/`, installs into whichever exist, both if neither exists) so
consumers understand what `postinstall` will do before it runs.

#### 3. Placeholder skill

**File**: `skills/code-review/SKILL.md`

**Intent**: Ship the spec pack's single placeholder skill, matching this
repo's own SKILL.md frontmatter convention so the CI frontmatter check
(spec-cicd validation items 3–4) has a real file to validate.

**Contract**: YAML frontmatter with `name: code-review` (must match the
directory name) and a one-line `description`, followed by minimal
placeholder body content. No functional skill logic — this is scaffolding
content only, per frame.

#### 4. Placeholder rule

**File**: `rules/AGENTS.md`

**Intent**: Ship the spec pack's single placeholder rule file that
`install.js` appends into consumer `AGENTS.md`/`CLAUDE.md` between sentinel
markers.

**Contract**: Short placeholder prose (a couple of sentences establishing
the sentinel-wrapped block content) — no real team conventions, per frame.

### Success Criteria:

#### Automated Verification:

- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"` succeeds
- `npm pack --dry-run` succeeds and lists `skills/`, `rules/`, `install.js`, `uninstall.js`, `bin/`, `README.md`
- `skills/code-review/SKILL.md` frontmatter `name` equals `code-review`

#### Manual Verification:

- README's `.npmrc` and auth-helper snippets render correctly and read clearly as copy-paste instructions

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Installer & Uninstaller Logic

### Overview

Implement the dual-target installer, manifest-driven uninstaller, and the
dispatching bin command.

### Changes Required:

#### 1. Installer

**File**: `install.js`

**Intent**: Detect which AI tool convention(s) exist in the consumer repo,
copy the placeholder skill and append the placeholder rule into each
detected target, write one shared manifest, and optionally inject the
CI-only preinstall auth helper into the consumer's own `package.json`.

**Contract**: Adapt
`.github/config-templates/m5l4-github-packages-install.js.template`'s
`findProjectRoot`/`copyDir`/`applyRulesBlock` helpers as-is. Add:
- `detectTargets(projectRoot)` → returns a non-empty array of `"claude"` and/or
  `"copilot"`: include `"claude"` if `.claude/` exists, `"copilot"` if
  `.github/` exists; if neither exists, return `["claude", "copilot"]`.
- Per target, the skill install directory and rule file are:
  `claude` → `.claude/skills/<name>/` and `CLAUDE.md`;
  `copilot` → `.github/skills/<name>/` and `AGENTS.md`.
- Sentinel constants stay `<!-- BEGIN @darek-fp/ai-toolkit -->` /
  `<!-- END @darek-fp/ai-toolkit -->` (scope updated from `@twoj-zespol`).
- Manifest moves from `.claude/.ai-toolkit-manifest.json` to
  `<projectRoot>/.ai-toolkit-manifest.json` with shape
  `{ package, version, installedAt, targets: string[], files: string[], preinstallInjected: boolean }`.
- Export `{ run }` and guard direct execution per the "Module/script
  duality" note above, instead of the template's bare `main()` + top-level
  `try`. Keep the `try`/`console.warn` non-throwing behavior inside `run()`
  so a postinstall failure never fails the parent `npm install`.
- Add `maybeInjectPreinstallHelper(projectRoot, manifest)` implementing the
  "Preinstall auth-helper injection scope" rule above.

#### 2. Uninstaller

**File**: `uninstall.js`

**Intent**: Read the shared manifest and remove exactly what `install.js`
added, across whichever targets were recorded, leaving no sentinel-block
or manifest residue.

**Contract**: Adapt
`.github/config-templates/m5l4-github-packages-uninstall.js.template`'s
`removeRulesBlock` as-is. Read manifest from
`<projectRoot>/.ai-toolkit-manifest.json` (not `.claude/...`); for each
target in `manifest.targets`, strip the sentinel block from that target's
rule file (`CLAUDE.md` for `claude`, `AGENTS.md` for `copilot`) and remove
files listed in `manifest.files` under that target's skill directory. If
`manifest.preinstallInjected` is `true`, remove the exact preinstall line
from the consumer's `package.json` scripts. Export `{ run }` with the same
direct-execution guard as `install.js`.

#### 3. Bin dispatcher

**File**: `bin/cli.js`

**Intent**: Give consumers a manual `install`/`uninstall` entry point per
the spec pack's stated bin purpose, beyond the implicit `postinstall` call.

**Contract**: `#!/usr/bin/env node` script that reads `process.argv[2]`,
requires `../install.js` or `../uninstall.js` accordingly, and calls
`.run()`; defaults to `install` when no argument is given. Unknown
arguments print a one-line usage message and exit non-zero.

### Success Criteria:

#### Automated Verification:

- In a scratch temp dir with no `.claude/`/`.github/`: `node install.js` (with `PROJECT_ROOT` pointed at the scratch dir) creates both `.claude/skills/code-review/` and `.github/skills/code-review/`, plus `CLAUDE.md` and `AGENTS.md` with sentinel blocks, plus one `.ai-toolkit-manifest.json` with `targets: ["claude","copilot"]`
- In a scratch temp dir with only `.claude/` present: `node install.js` installs only the Claude target and manifest `targets` is `["claude"]`
- Running `node install.js` twice against the same scratch dir does not duplicate sentinel blocks or manifest entries (line count in `CLAUDE.md`/`AGENTS.md` between sentinels stays constant)
- `node uninstall.js` against a previously-installed scratch dir removes all files listed in the manifest, strips sentinel blocks, and deletes `.ai-toolkit-manifest.json`
- `node bin/cli.js uninstall` produces the same result as `node uninstall.js` directly

#### Manual Verification:

- Manually `npm link` the package into a throwaway repo with `.github/` present and confirm `.github/skills/code-review/` and `AGENTS.md` appear correctly after `npm install`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: CI Workflow & Validation

### Overview

Add the GitHub Actions workflow that validates and publishes the package to
GitHub Packages, including a round-trip smoke test of the new dual-target
installer.

### Changes Required:

#### 1. Publish workflow

**File**: `.github/workflows/publish-ai-toolkit.yml`

**Intent**: Validate the package on every push/PR to `main`/`master` and
publish on push, per spec-cicd, scoped to `@darek-fp` with an added
installer smoke-test step.

**Contract**: Adapt
`.github/config-templates/m5l4-github-packages-publish-ai-toolkit.yml.template`
as-is (two jobs: `validate` and `publish`, `permissions: contents: read,
packages: write`, `actions/setup-node@v4` with `registry-url:
"https://npm.pkg.github.com"`) except: `scope: "@darek-fp"` in both jobs;
`validate` job gains the spec-cicd checklist's explicit checks (`test -f
skills/code-review/SKILL.md` plus a frontmatter `name`/`description`
presence check, in addition to the template's existing `npm pack
--dry-run`); and a new step after those checks that creates a scratch temp
dir (`mktemp -d` equivalent), runs `node install.js` with `PROJECT_ROOT`
pointed at it once with no pre-existing `.claude`/`.github` (asserting both
targets installed) and once with only `.github/` pre-created (asserting
only the copilot target installed), then runs `node uninstall.js` against
each and asserts the scratch dir returns to its pre-install state (`git
status --porcelain` equivalent via a plain diff of a captured `find`
listing, since the scratch dir isn't a git repo — a before/after directory
listing diff is sufficient).

### Success Criteria:

#### Automated Verification:

- `.github/workflows/publish-ai-toolkit.yml` is valid YAML: `node -e "require('yaml').parse(require('fs').readFileSync('.github/workflows/publish-ai-toolkit.yml','utf8'))"` or equivalent parse check
- Workflow's `validate` job steps run successfully when executed locally in sequence (each shell command exits 0)
- The added smoke-test step's before/after directory diff is empty after uninstall in both scratch-dir scenarios

#### Manual Verification:

- Push a throwaway branch and confirm the `validate` job runs green in the GitHub Actions UI
- Confirm the `publish` job is skipped on `pull_request` events and only runs on `push`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- None planned as a separate test suite — this is a small scaffold package;
  correctness is verified through the scratch-dir install/uninstall
  round-trips described in each phase's Automated Verification.

### Integration Tests:

- The Phase 2 and Phase 3 scratch-dir round-trips (no-target-present,
  claude-only-present, copilot-only-present) are the integration coverage
  for this package.

### Manual Testing Steps:

1. `npm link` the package into a throwaway repo with `.claude/` present only; run `npm install`; confirm only `.claude/skills/code-review/` and `CLAUDE.md` are touched.
2. Repeat with `.github/` present only; confirm only the Copilot target is touched.
3. Repeat with neither present; confirm both targets are touched.
4. Run `npx ai-toolkit uninstall` in each case; confirm a clean revert (no leftover sentinel blocks, manifest removed).
5. Set `CI=true` in the scratch repo's env before install; confirm the preinstall auth-helper line appears in its `package.json` only when no existing `GH_PKG_TOKEN`/`_authToken` reference is present.

## Performance Considerations

None — file-copy and text-append operations on a handful of small files;
no performance budget applies.

## Migration Notes

Not applicable — this is a new package with no prior consumers or existing
installed state to migrate.

## References

- Frame brief: `context/changes/ai-toolkit/frame.md`
- Spec pack: `.github/prompts/m5l4-github-packages-spec-pack.md`
- CI spec: `.github/prompts/m5l4-github-packages-spec-cicd.md`
- Templates: `.github/config-templates/m5l4-github-packages-*.template`
- Repo convention reference: `.github/skills/pack-init/SKILL.md`, `.github/skills/10x-init/SKILL.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Package Scaffold & Metadata

#### Automated

- [x] 1.1 `node -e "JSON.parse(...)"` on package.json succeeds
- [x] 1.2 `npm pack --dry-run` lists declared files
- [x] 1.3 `skills/code-review/SKILL.md` frontmatter `name` equals `code-review`

#### Manual

- [ ] 1.4 README `.npmrc` and auth-helper snippets render correctly

### Phase 2: Installer & Uninstaller Logic

#### Automated

- [ ] 2.1 Neither-present scratch install creates both targets + single manifest
- [ ] 2.2 Claude-only scratch install creates only the Claude target
- [ ] 2.3 Re-running install does not duplicate sentinel blocks or manifest entries
- [ ] 2.4 Uninstall removes all manifest-listed files, sentinel blocks, and the manifest
- [ ] 2.5 `bin/cli.js uninstall` matches direct `node uninstall.js`

#### Manual

- [ ] 2.6 `npm link` into a `.github/`-only throwaway repo installs Copilot target correctly

### Phase 3: CI Workflow & Validation

#### Automated

- [ ] 3.1 Workflow YAML parses successfully
- [ ] 3.2 `validate` job steps run successfully in sequence
- [ ] 3.3 Smoke-test before/after directory diff is empty after uninstall

#### Manual

- [ ] 3.4 Throwaway branch push runs `validate` job green in Actions UI
- [ ] 3.5 `publish` job confirmed skipped on `pull_request`, runs on `push`
