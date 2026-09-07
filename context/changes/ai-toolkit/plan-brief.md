# AI Toolkit npm Package (GitHub Packages) — Plan Brief

> Full plan: `context/changes/ai-toolkit/plan.md`
> Frame brief: `context/changes/ai-toolkit/frame.md`

## What & Why

Package the team's AI artifacts into a distributable npm package
(`@darek-fp/ai-toolkit`) that consumer repositories install from GitHub
Packages. The actual problem is adapting the spec pack + templates to this
repo's real identity and tool footprint — publish under `@darek-fp/ai-toolkit`
with an installer that supports both Claude Code and GitHub Copilot
conventions — rather than implementing the templates' placeholder values
(`@emu`, `@twoj-zespol`, Claude-only paths) literally.

## Starting Point

The repo root has no `package.json`, `AGENTS.md`, or `skills/`/`rules/`
directories yet — this is a from-scratch scaffold. Five starter templates
exist under `.github/config-templates/m5l4-github-packages-*` plus two spec
docs (`m5l4-github-packages-spec-pack.md`, `m5l4-github-packages-spec-cicd.md`),
all hardcoded to a placeholder scope and a single (Claude-only) install
target.

## Desired End State

Running `npm install @darek-fp/ai-toolkit` in a consumer repo detects whether
it uses Claude Code (`.claude/`), GitHub Copilot (`.github/`), or neither, and
installs the placeholder skill + rule into whichever convention(s) apply — both,
if neither is detected. A single manifest tracks everything installed so
`npx ai-toolkit uninstall` cleanly reverses it. CI validates and publishes the
package to GitHub Packages on push to `main`/`master`.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| npm scope | `@darek-fp` | Matches the verified GitHub remote owner; `@emu`/`@twoj-zespol` would fail auth or publish to the wrong namespace | Frame |
| Installer targets | Claude Code + Copilot, dual-target | Templates are Claude-only; this repo's own skills live under `.github/skills/` | Frame |
| Package contents | Spec pack's single placeholder skill/rule | This is a scaffolding exercise, not distribution of the real `10x-*` suite | Frame |
| Target detection mechanism | Detect presence of `.claude/`/`.github/`; install both if neither exists | Matches actual consumer tooling without needing a manual flag; safe default for a brand-new repo | Plan |
| Manifest shape | One shared manifest at project root with a `targets` array | Single source of truth for uninstall; simplest to read/write | Plan |
| Bin command behavior | Dispatch (`ai-toolkit install\|uninstall`) | Fulfills the spec pack's stated bin purpose instead of half-implementing it | Plan |
| CI validation scope | Spec-cicd checklist + installer round-trip smoke test | Catches installer regressions the checklist alone wouldn't, given the new dual-target logic | Plan |
| Preinstall auth helper | Wired into `install.js`, gated on `CI=true` + no existing token reference | Matches the spec pack's "CI-only" framing without surprising local devs | Plan |

## Scope

**In scope:**
- `package.json`, `README.md`, placeholder `skills/code-review/SKILL.md` and `rules/AGENTS.md`
- Dual-target `install.js`/`uninstall.js`, dispatching `bin/cli.js`
- `.github/workflows/publish-ai-toolkit.yml` (validate + publish jobs)

**Out of scope:**
- Shipping the real `10x-*` skill suite
- AWS CodeArtifact / Terraform / Model 2 `pack-init` pipeline
- Config-flag/env-var target override (detection is presence-only)
- Tool conventions beyond Claude Code and Copilot
- Full consumer-simulation CI (real tarball install in a throwaway repo)

## Architecture / Approach

Adapt the five existing templates in place rather than rewriting from
scratch: keep their file-copy/sentinel-block/manifest primitives, restructure
`install.js`/`uninstall.js` as `module.exports = { run }` with a
direct-execution guard (so both `node install.js` and `bin/cli.js`'s
`require()` dispatch work), add presence-detection for the two install
targets, and extend the manifest schema with a `targets` array.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Package Scaffold & Metadata | `package.json`, README, placeholder skill + rule | README's dual-target explanation must be clear before install.js exists to demonstrate it |
| 2. Installer & Uninstaller Logic | Dual-target `install.js`/`uninstall.js`, dispatching `bin/cli.js` | Manifest/sentinel idempotency bugs would corrupt consumer repos on re-install |
| 3. CI Workflow & Validation | `.github/workflows/publish-ai-toolkit.yml` with smoke test | Smoke-test scratch-dir logic adds real script complexity to the workflow itself |

**Prerequisites:** None — greenfield scaffold, no existing package state to preserve.
**Estimated effort:** ~1 session across 3 phases (small, well-precedented file set).

## Open Risks & Assumptions

- Assumes `.claude/` and `.github/` are reliable presence signals for "this repo uses Claude Code" / "this repo uses Copilot" — a repo using neither convention's directory (e.g. a bare Copilot setup with no `.github/` yet) would fall into the "neither present → install both" default, which is intentional but worth confirming in manual testing.
- Assumes GitHub Actions' ephemeral `GITHUB_TOKEN` has `packages: write` permission enabled at the repo/org level — if disabled, the publish job will fail and requires an org settings change, not a code change.

## Success Criteria (Summary)

- `npm install @darek-fp/ai-toolkit` in a consumer repo installs the correct target(s) with no manual configuration
- `npx ai-toolkit uninstall` fully reverses an install with no residue
- CI validates and publishes cleanly to GitHub Packages on push to `main`/`master`
