# Support for Additional AI Provider Conventions Implementation Plan

## Overview

Generalize the toolkit from a Claude Code/GitHub Copilot installer into a
provider-registry-based installer, while adding first-class adapters for Cursor
and Windsurf project conventions. Preserve the current Claude/Copilot behavior,
make provider selection explicit when automatic detection is insufficient, and
keep installation reversible without deleting consumer-owned files.

## Current State Analysis

`install.js` hard-codes Claude and Copilot metadata, marker detection, and the
no-marker fallback. `uninstall.js` repeats the rule mapping and hard-codes the
two skill roots. Shared skill copying and sentinel-wrapped Markdown rules are
otherwise reusable. The manifest is the install/uninstall compatibility
boundary, but it currently stores target names and paths without a registry
version or provider-specific cleanup metadata.

The package exposes only `install` and `uninstall` through `bin/cli.js`, and
the README promises exactly two targets. CI relies on lifecycle scripts and
currently runs installer smoke tests for only the no-marker and Copilot-only
cases. There is no model/API provider integration in this repository.

## Desired End State

The package has one shared provider registry consumed by install and uninstall.
It supports Claude Code, GitHub Copilot, Cursor, and Windsurf as repository
conventions, with provider-specific marker detection, skill destination, and
rules rendering metadata. Existing two-provider installations remain
uninstallable, and no-marker installs retain the legacy Claude/Copilot fallback.

Users can pass an explicit target list through the CLI or environment when
automatic detection is not enough. Install preserves unmanaged consumer files,
records provider-aware ownership in a versioned manifest, and refuses unsafe
conflicts with a clear error. CI validates every provider, mixed detection,
idempotency, preservation, legacy manifests, and package-root isolation.

### Key Discoveries:

- `install.js:18-22` and `uninstall.js:11-14` duplicate provider metadata.
- `install.js:49-56` makes marker presence the only selection mechanism and
  installs both legacy targets when no marker exists.
- `uninstall.js:55-69` cannot clean a third provider without another hard-coded
  path.
- `README.md:5-20` and `.github/workflows/publish-ai-toolkit.yml:58-101`
  encode the current two-target contract.
- `context/changes/ai-toolkit/plan.md:81-89` confirms that broader tool
  conventions were intentionally deferred by the earlier change.

## What We're NOT Doing

- We are not adding OpenAI, Gemini, Anthropic, or other model/API clients,
  credentials, network calls, or backend abstractions.
- We are not distributing provider-specific model prompts or changing the
  packaged `skills/code-review/SKILL.md` content.
- We are not removing or changing the legacy Claude/Copilot no-marker fallback.
- We are not adding a remote registry or third-party provider plugin loader.
- We are not migrating existing consumer files outside the toolkit-managed
  paths and sentinel blocks.

## Implementation Approach

Create a shared `providers.js` registry describing provider IDs, marker
detectors, skill roots, rule destinations/renderers, and cleanup paths. Keep
shared copy and sentinel primitives in the installer, but make them consume
registry entries. Make the uninstaller resolve targets from the same registry
and fall back to manifest-recorded paths for legacy/unknown providers without
deleting unrelated files.

Add explicit target selection to the CLI (`--target <id[,id...]>`) and
`AI_TOOLKIT_TARGETS`, with CLI taking precedence. Automatic detection remains
the default; when no marker is present and no explicit selection is provided,
the legacy Claude/Copilot pair is selected. Cursor and Windsurf adapters use
their native project rules directories and provider-specific rule filenames or
templates, while shared skills are copied only to destinations declared by
their registry entries.

## Critical Implementation Details

### Compatibility and lifecycle isolation

The manifest schema must be versioned and retain resolved managed paths so a
future registry change cannot make uninstall delete the wrong files. CI must
install dependencies with lifecycle scripts disabled and invoke installer
smoke tests against scratch roots; otherwise `npm ci` can mutate the toolkit
checkout itself through `postinstall`.

## Phase 1: Provider Registry and Safe Install/Uninstall

### Overview

Replace duplicated target maps with a shared provider contract, add Cursor and
Windsurf entries, support explicit target selection, and make install/uninstall
ownership-aware and backwards compatible.

### Changes Required:

#### 1. Shared provider contract

**File**: `providers.js`

**Intent**: Define the single source of truth for Claude, Copilot, Cursor, and
Windsurf conventions, including IDs, marker detection, skill destination
metadata, rules destination/format, and cleanup paths.

**Contract**: Export an immutable registry keyed by provider ID plus helpers for
validating IDs and resolving provider metadata. Entries must allow providers
with a root rules file and providers with a rules directory, without requiring
every provider to expose the same path shape.

#### 2. Installer selection and ownership

**File**: `install.js`

**Intent**: Consume the shared registry, preserve automatic detection, add
explicit target selection, and stop overwriting unmanaged consumer files.

**Contract**: `detectTargets` accepts an optional explicit selection and returns
validated provider IDs. `run` honors `--target`/`AI_TOOLKIT_TARGETS`, preserves
the legacy no-marker fallback, copies only provider-declared assets, and records
provider IDs, registry version, resolved managed paths, created paths, and
ownership/conflict results in the manifest.

#### 3. Reversible cleanup

**File**: `uninstall.js`

**Intent**: Resolve cleanup behavior from the shared registry and manifest
metadata rather than hard-coded Claude/Copilot paths.

**Contract**: Uninstall removes only files and blocks recorded as toolkit-owned,
preserves unmanaged files and directories, supports legacy manifests containing
only target names, and warns without destructive cleanup for unknown provider
IDs or unsupported manifest versions.

#### 4. CLI target selection

**File**: `bin/cli.js`

**Intent**: Expose explicit provider selection without breaking the existing
  `ai-toolkit` and `ai-toolkit uninstall` commands.

**Contract**: Parse `--target <id[,id...]>` for install, reject unknown IDs and
  malformed combinations with exit code 1, pass the selection to `install.js`,
  and leave uninstall target-free because the manifest is authoritative.

#### 5. Package contents

**File**: `package.json`

**Intent**: Ship the provider registry and any provider rule templates with the
  npm package.

**Contract**: Include `providers.js` and provider-specific rule assets in
  `files`, preserving the existing lifecycle, binary, Node >=20, and release
  contracts.

### Success Criteria:

#### Automated Verification:

- `node --check providers.js install.js uninstall.js bin/cli.js` passes.
- A scratch install with each provider marker selects exactly that provider.
- Explicit `--target` selection works with no markers and rejects unknown IDs.
- Reinstall produces one managed rule block and does not duplicate files.
- Uninstall removes managed files/blocks while preserving unmanaged files.
- Legacy manifests containing `claude` and/or `copilot` uninstall successfully.

#### Manual Verification:

- Inspect generated Cursor and Windsurf rule files for their native locations
  and expected content format.
- Confirm CLI errors identify valid target IDs and do not partially install.

## Phase 2: Documentation and CI Provider Matrix

### Overview

Document the provider contract and selection rules, then replace the narrow CI
smoke test with a complete provider matrix and lifecycle-safe package checks.

### Changes Required:

#### 1. Consumer documentation

**File**: `README.md`

**Intent**: Replace the two-provider-only description with a provider matrix,
  explicit-selection examples, conflict behavior, manifest compatibility, and
  the distinction between coding-tool conventions and model/API providers.

**Contract**: Document marker paths, generated skill/rule destinations, the
  no-marker legacy fallback, `--target`, `AI_TOOLKIT_TARGETS`, uninstall
  guarantees, and provider-specific limitations without promising unsupported
  model integrations.

#### 2. CI workflow isolation and smoke coverage

**File**: `.github/workflows/publish-ai-toolkit.yml`

**Intent**: Prevent lifecycle scripts from mutating the checkout and validate
  every supported provider and safety invariant.

**Contract**: Use `npm ci --ignore-scripts` in validation and release jobs, then
  run explicit scratch-root tests covering one-provider detection for all four
  providers, mixed providers, no-marker fallback, explicit selection, existing
  rule preservation, unmanaged skill conflicts, idempotent reinstall, uninstall
  round-trips, unknown/legacy manifests, and package-root isolation.

### Success Criteria:

#### Automated Verification:

- CI package metadata and `npm pack --dry-run` checks pass.
- The full scratch-directory provider matrix passes on Node 20.
- CI confirms `npm ci --ignore-scripts` leaves no consumer artifacts in the
  repository checkout.
- Existing rule text and unmanaged skill files are byte-for-byte preserved.

#### Manual Verification:

- Follow the README setup for each provider in a clean consumer repository.
- Confirm no-marker behavior remains compatible with existing consumers.
- Review generated files and uninstall results for accidental provider-specific
  artifacts.

## Phase 3: Compatibility Hardening and Release Readiness

### Overview

Exercise upgrade and rollback paths, align package documentation and manifest
behavior, and verify the release package contains every required provider asset.

### Changes Required:

#### 1. Manifest migration and failure handling

**Files**: `install.js`, `uninstall.js`

**Intent**: Test and harden upgrades from the current manifest shape to the
  versioned provider-aware shape without destructive behavior.

**Contract**: Current manifests remain readable; unknown providers produce a
  warning and preserve unrelated files; malformed manifests fail clearly; a
  failed provider install does not publish a manifest claiming success.

#### 2. Release package verification

**Files**: `package.json`, `.github/workflows/publish-ai-toolkit.yml`

**Intent**: Ensure the published tarball includes the registry and all rule
  templates while preserving semantic-release behavior.

**Contract**: `npm pack --dry-run` lists every runtime file required by install
  and uninstall, and release validation runs before semantic-release.

### Success Criteria:

#### Automated Verification:

- `npm pack --dry-run` includes `providers.js`, installer/uninstaller files,
  and all provider rule assets.
- Upgrade, malformed-manifest, and unknown-provider smoke cases pass.
- `git diff --check` passes and the existing release validation remains green.

#### Manual Verification:

- Install the packed artifact into a clean scratch consumer and perform a
  complete install/reinstall/uninstall cycle.
- Review the final README and manifest examples for consistency with runtime
  behavior.

## Testing Strategy

### Unit Tests:

No test runner currently exists. Keep validation in the existing Node/shell
smoke-test style and isolate reusable scenario helpers in the workflow or a
small checked-in Node smoke script if the matrix becomes too large for inline
shell.

### Integration Tests:

- Four single-provider marker scenarios.
- No-marker legacy fallback and explicit-selection scenarios.
- Mixed-provider selection.
- Existing rule preservation and unmanaged skill conflict handling.
- Idempotent reinstall and uninstall round-trip.
- Legacy, unknown, malformed, and versioned manifest handling.
- Package-root lifecycle isolation.

### Manual Testing Steps:

1. Create clean consumer repositories with each supported marker and install
   the packed package.
2. Verify skill and rule locations, existing-file preservation, and manifest
   targets.
3. Reinstall, inspect for duplicate blocks, then uninstall and verify only
   toolkit-owned content is removed.

## Performance Considerations

Provider detection and registry resolution operate over a fixed small provider
set. Recursive copying remains bounded by the packaged skill tree; no network
calls or persistent service is introduced.

## Migration Notes

Existing consumers require no migration. The installer must read the current
manifest shape and preserve the legacy no-marker behavior. New manifests are
versioned and include resolved paths so future provider registry changes can
uninstall safely.

## References

- `context/changes/beyond-claude-code-and-github/research.md`
- `install.js:18-22,49-72,86-98,130-166`
- `uninstall.js:11-14,23-69,107-115`
- `bin/cli.js:3-15`
- `README.md:5-25`
- `.github/workflows/publish-ai-toolkit.yml:29,58-101`
- `context/changes/ai-toolkit/frame.md`
- `context/changes/ai-toolkit/plan.md:81-89,232-307,364-378`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `.github/skills/10x-plan/references/progress-format.md`.

### Phase 1: Provider Registry and Safe Install/Uninstall

#### Automated

- [x] 1.1 `node --check` passes for the registry, installer, uninstaller, and CLI
- [x] 1.2 Single-provider detection and explicit target selection pass for all four providers
- [x] 1.3 Reinstall, conflict preservation, uninstall, and legacy manifest scenarios pass

#### Manual

- [x] 1.4 Cursor and Windsurf generated files use their documented native locations and formats
- [x] 1.5 CLI validation errors are clear and do not partially install

### Phase 2: Documentation and CI Provider Matrix

#### Automated

- [x] 2.1 Package metadata and dry-run packaging checks pass
- [x] 2.2 Full provider smoke matrix passes with lifecycle isolation
- [x] 2.3 Existing consumer content is preserved byte-for-byte

#### Manual

- [x] 2.4 README setup and no-marker compatibility behavior are confirmed

### Phase 3: Compatibility Hardening and Release Readiness

#### Automated

- [x] 3.1 Upgrade, malformed-manifest, and unknown-provider cases pass
- [x] 3.2 Packed artifact contains all runtime provider assets
- [x] 3.3 `git diff --check` and release validation pass

#### Manual

- [x] 3.4 Packed-artifact install/reinstall/uninstall cycle is reviewed
