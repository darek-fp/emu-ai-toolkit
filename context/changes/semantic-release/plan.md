# Introduce semantic-release package publication lifecycle

## Overview

Establish a reliable package-only release lifecycle for the npm package and remove the version drift that currently exists between its metadata and installer output. This plan replaces the push-based `npm publish` behavior with a release-driven flow managed by semantic-release, while keeping the package-only boundary and version authority explicit.

## Current State Analysis

The repository already shows the concrete failure mode behind the issue: version-bearing metadata is inconsistent and the workflow publishes on every push without any version lifecycle.

- `package.json:1-26` is the authoritative npm metadata, currently set to `0.2.0`.
- `install.js:6-9,124-142` still hard-codes `PACKAGE_VERSION = "0.1.0"` and writes that value into the generated `.ai-toolkit-manifest.json`.
- `.github/workflows/publish-ai-toolkit.yml:3-7,104-121` runs on pushes to `main`/`master` and directly executes `npm publish` without calculating or guarding a version bump, tag gate, or release state.
- `context/changes/semantic-release/frame.md` frames the actual problem as: "establish a reliable package-only version and publication lifecycle that keeps all version-bearing metadata consistent and prevents CI from publishing an unchanged or duplicate package version."

This means the repository has a real automation gap rather than only a missing dependency. The release process must be planned as a lifecycle problem, not as a semantic-release-only installation task.

## Desired End State

After this plan is complete, the package release workflow should be deterministic and repeatable:

- `package.json` is the single source of truth for the package version.
- `install.js` and the generated installer manifest derive their version from the package metadata instead of maintaining a separate hard-coded constant.
- semantic-release manages the version bump, changelog/tag flow, and publish gate.
- CI no longer publishes on raw branch pushes; it publishes only on a valid release lifecycle that prevents duplicate or unchanged package versions.
- The repository documents the package-only boundary and the internal tag convention without broadening scope into a full GitHub Releases UX.

### Key Discoveries:

- `package.json:1-26` sets the npm package metadata and is the expected source of truth for the published package.
- `install.js:6-9,124-142` duplicates the version in code and writes it to the consumer manifest, causing observed drift.
- `.github/workflows/publish-ai-toolkit.yml:3-7,104-121` publishes on every push to `main` or `master` with no version calculation or check.
- `context/changes/semantic-release/frame.md` explicitly narrows the problem to version consistency plus lifecycle orchestration, not registry or GitHub Releases as the primary bug.

## What We're NOT Doing

- We are not expanding the release design to a general GitHub Releases product surface or user-facing release notes workflow.
- We are not redesigning the package install model beyond removing the duplicated version constant.
- We are not changing the GitHub Packages registry, scope, or auth model beyond the release automation that sits in front of `npm publish`.

## Implementation Approach

The plan is intentionally incremental and bounded. Phase 1 resolves the version-authority issue by making the package version single-sourced and by removing the stale installer constant. Phase 2 introduces semantic-release as the release orchestrator and replaces the raw push-to-publish workflow with a tag-driven, duplicate-safe release gate. Phase 3 validates the end-to-end flow and documents the process so future releases remain consistent.

## Phase 1: Stabilize version authority

### Overview

Define one authoritative version source and remove the hard-coded installer version so the released package and installed metadata cannot drift.

### Changes Required:

#### 1. Package version source and installer metadata

**File**: `package.json`, `install.js`

**Intent**: Make `package.json` the sole version source for the package and make installer-generated metadata derive from that source. This removes the already-observed drift and gives the release automation a stable value to bump.

**Contract**: The package's `version` field remains the canonical version for the published artifact. The installer reads the package version from the package metadata (or a small derived value) rather than maintaining a separate literal. The generated `.ai-toolkit-manifest.json` version field reflects the same value the package is published under.

### Success Criteria:

#### Automated Verification:

- [ ] 1.1 Validate package metadata is present and version-bearing fields are consistent.
- [ ] 1.2 Run the installation smoke test to confirm manifest version matches the package version without drift.
- [ ] 1.3 Confirm `npm pack --dry-run` still succeeds with the adjusted version-source logic.

#### Manual Verification:

- [ ] 1.4 Verify a fresh consumer install produces a manifest whose version matches the package version.
- [ ] 1.5 Confirm uninstall/install behavior is unchanged aside from version consistency.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the version-source fix is correct before proceeding to the release automation phase.

---

## Phase 2: Introduce semantic-release orchestration

### Overview

Replace the push-driven `npm publish` job with semantic-release-driven versioning and release gating, while keeping the package-only scope explicit.

### Changes Required:

#### 1. semantic-release configuration and dependency

**File**: `package.json`, new release config (for example `.releaserc.json`), and any release helper files if required

**Intent**: Install and configure semantic-release so the repo can calculate versions and release tags based on conventional commit semantics or the package's chosen release convention. This creates a repeatable release lifecycle rather than relying on manual version bumps.

**Contract**: The repository declares the semantic-release dependency and config in the package metadata or release config file. The workflow consumes that config instead of publishing on every push; the chosen release convention is explicit and documented in the repo, even if GitHub Releases remain out of scope.

#### 2. Workflow release gate and publish boundary

**File**: `.github/workflows/publish-ai-toolkit.yml`

**Intent**: Replace the direct `npm publish` step from the branch-push workflow with a semantic-release-driven release job that only runs when valid release conditions are met. This prevents duplicate publishes and ensures version increments are tied to a formal release event.

**Contract**: The workflow still uses the same GitHub Packages registry and auth model, but the publish decision is no longer tied to a raw branch push. Release tags become the internal release signal; GitHub Releases remain outside the package-only boundary unless later expanded.

### Success Criteria:

#### Automated Verification:

- [ ] 2.1 Validate semantic-release dry-run succeeds without attempting an unintended publish.
- [ ] 2.2 Confirm the workflow no longer publishes on plain push to `main`/`master`.
- [ ] 2.3 Confirm the package remains valid for `npm pack --dry-run` and release metadata generation.

#### Manual Verification:

- [ ] 2.4 Verify the release process creates the expected tag/version only for a valid release trigger.
- [ ] 2.5 Confirm a duplicate or unchanged publish attempt is prevented by the release gate.

---

## Phase 3: Validation and documentation

### Overview

Document the model, validate the release flow, and ensure the team knows exactly which behaviors are in and out of scope.

### Changes Required:

#### 1. Release documentation and maintainer guidance

**File**: `README.md` and any release documentation file used by the repo

**Intent**: Write down the package-only release process so the repo's version authority, release trigger, and scope are clear to maintainers. This closes the gap between the current implicit workflow and a repeatable package release lifecycle.

**Contract**: Documentation states that `package.json` is the authoritative version source, that semantic-release drives the release lifecycle, and that internal git tags are the release signal while GitHub Releases are intentionally out of scope unless requested.

### Success Criteria:

#### Automated Verification:

- [ ] 3.1 Confirm documentation changes do not break the existing workflow validation checks.
- [ ] 3.2 Re-run the repo's validation flow to ensure no release automation regressions were introduced.

#### Manual Verification:

- [ ] 3.3 Review the release process with a maintainer to confirm the stated scope matches the actual operational workflow.
- [ ] 3.4 Confirm the release lifecycle is understandable to a contributor who is not already familiar with the package-publishing setup.

---

## Testing Strategy

### Unit Tests:

- Validate semantic-release configuration is loadable and version calculation is deterministic.
- Confirm the version source contract is enforced in the package metadata and installer logic.
- Validate the package manifest writer produces a version consistent with the package metadata.

### Integration Tests:

- Run semantic-release in dry-run mode against the repo to ensure publish gating is correct.
- Verify CI still passes the existing package validation and smoke-test checks used by the workflow.
- Smoke-test the install/uninstall flow in a fresh temp directory to validate version correctness and packaging.

### Manual Testing Steps:

1. Install the package in a temporary consumer repo and confirm the generated manifest version matches the package version shipped in the package metadata.
2. Trigger a semantic-release dry run and inspect the computed version and tag output.
3. Confirm that a push to `main` does not publish without a valid release event.
4. Review the release documentation and ensure it describes the package-only boundary and tag-based release signal accurately.

## Performance Considerations

This change is primarily about correctness and release safety, not runtime performance. The major risk is not execution time but accidental duplicate or stale publication, so the validation checks should stay explicit and deterministic rather than trying to optimize the workflow complexity.

## Migration Notes

There is no live data migration to perform. The migration is operational: move from a push-based publish workflow with stale version metadata to a tagged, semantic-release-driven release lifecycle. The relevant rollback is to restore the prior workflow and version source only if the release automation is misconfigured, but that should be treated as a temporary fallback, not the target state.

## References

- Related frame: `context/changes/semantic-release/frame.md`
- Package metadata: `package.json:1-26`
- Installer version logic: `install.js:6-9,124-142`
- Existing publish workflow: `.github/workflows/publish-ai-toolkit.yml:1-121`
- Current package install contract (smoke test): `.github/workflows/publish-ai-toolkit.yml:35-95`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Stabilize version authority

#### Automated

- [x] 1.1 Validate package metadata is present and version-bearing fields are consistent.
- [x] 1.2 Run the installation smoke test to confirm manifest version matches the package version without drift.
- [x] 1.3 Confirm `npm pack --dry-run` still succeeds with the adjusted version-source logic.

#### Manual

- [x] 1.4 Verify a fresh consumer install produces a manifest whose version matches the package version.
- [x] 1.5 Confirm uninstall/install behavior is unchanged aside from version consistency.

### Phase 2: Introduce semantic-release orchestration

#### Automated

- [ ] 2.1 Validate semantic-release dry-run succeeds without attempting an unintended publish.
- [ ] 2.2 Confirm the workflow no longer publishes on plain push to `main`/`master`.
- [ ] 2.3 Confirm the package remains valid for `npm pack --dry-run` and release metadata generation.

#### Manual

- [ ] 2.4 Verify the release process creates the expected tag/version only for a valid release trigger.
- [ ] 2.5 Confirm a duplicate or unchanged publish attempt is prevented by the release gate.

### Phase 3: Validation and documentation

#### Automated

- [ ] 3.1 Confirm documentation changes do not break the existing workflow validation checks.
- [ ] 3.2 Re-run the repo's validation flow to ensure no release automation regressions were introduced.

#### Manual

- [ ] 3.3 Review the release process with a maintainer to confirm the stated scope matches the actual operational workflow.
- [ ] 3.4 Confirm the release lifecycle is understandable to a contributor who is not already familiar with the package-publishing setup.
