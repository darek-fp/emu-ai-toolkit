# Introduce semantic-release package publication lifecycle — Plan Brief

> Full plan: `context/changes/semantic-release/plan.md`
> Frame brief: `context/changes/semantic-release/frame.md`

## What & Why

> **The actual problem to plan around is**: establish a reliable package-only version and publication lifecycle that keeps all version-bearing metadata consistent and prevents CI from publishing an unchanged or duplicate package version.

The repository currently has a real version drift problem: `package.json` reports `0.2.0` while `install.js` still hard-codes `0.1.0`, and the workflow publishes on every push to `main`/`master` without any version bump or release gate. This plan fixes the lifecycle at the source instead of only adding a dependency.

## Starting Point

The repo publishes directly from GitHub Actions on branch push and does not currently run a versioning tool, tag gate, or change detection step. The package installation logic also maintains a separate version constant in `install.js`, which makes the version source inconsistent and creates a release bug even before a publish happens.

## Desired End State

The package lifecycle is deterministic and safe: the package version is single-sourced in `package.json`, the installer reads from that source instead of duplicating a literal, and semantic-release owns the release calculation and tag-based publication gate. The result is a package that can only be published as a formal release with one version, without accidental duplicate or stale publishes.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Version authority | `package.json` is the single source of truth | Prevents drift and matches npm's normal release contract | Frame |
| Release automation | Use `semantic-release` | It provides the formal, versioned lifecycle the repo currently lacks | Plan |
| Release signal scope | Use git tags as the internal release signal; keep GitHub Releases out of scope | Matches the package-only boundary and avoids scope creep | Frame / Plan |

## Scope

**In scope:**
- unify version authority across package metadata and installer output
- replace push-based publish with semantic-release-driven release gating
- validate version consistency and publish safety before publishing
- document the package-only release lifecycle for maintainers

**Out of scope:**
- full GitHub Releases UX or release-note portal work
- broader registry or auth redesign beyond the existing GitHub Packages setup
- unrelated refactors to install logic outside version-source consistency

## Architecture / Approach

This plan keeps the solution narrow and release-focused: `package.json` becomes the canonical version authority, the installer reads that value instead of keeping a parallel constant, and GitHub Actions delegates the publish decision to semantic-release instead of raw `npm publish` on every push. The design keeps the existing package registry and install mechanics intact while adding the missing lifecycle guardrails.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Stabilize version authority | One source of truth for package version and installer metadata | Reintroducing drift during adoption |
| 2. Introduce semantic-release orchestration | Release-driven versioning and publish gate | Duplicate or unintended publish |
| 3. Validation and documentation | Maintainer clarity and release consistency | Scope creep or undocumented operational behavior |

**Prerequisites:** repository access, GitHub Packages authentication already configured, branch protection or release permissions in place for the chosen tag gate.
**Estimated effort:** ~2-3 focused sessions across 3 phases.

## Open Risks & Assumptions

- The repo will accept semantic-release as the release mechanism rather than a different package publisher.
- The package-only scope is intentional; GitHub Releases remain out of scope unless requested later.
- The existing GitHub Packages auth and registry config remain valid once the release gate is added.

## Success Criteria (Summary)

- Version drift between `package.json` and installer-generated metadata is eliminated.
- `npm publish` only happens via a controlled release path, not a raw branch push.
- The release flow produces a consistent version and tag while preventing duplicate or unchanged package publication.
