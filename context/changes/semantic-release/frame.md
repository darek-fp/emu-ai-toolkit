# Frame Brief: Automated npm Package Versioning

> Framing step before /10x-plan. This document captures what is *actually*
> at issue, separated from what was initially assumed.

## Reported Observation

There is no confirmed failure yet; the scope is evaluating automated
release/versioning.

## Initial Framing (preserved)

- **User's stated cause or approach**: semantic-release
- **User's proposed direction**: introduce auto versioning with semantic-release.org
- **Pre-dispatch narrowing**: The leading problem is both existing version drift
  and the missing release lifecycle; the scope is package versioning/publication
  only, with GitHub Releases/tags not part of the stated observation.

## Dimension Map

The observation could originate at any of these dimensions:

1. **Version source consistency** — package metadata, lockfile, and installer
   metadata can disagree, producing an inconsistent published package.
2. **Release orchestration** — CI can publish on pushes without calculating or
   advancing a package version; this is the initial framing's dimension.
3. **Publishing boundary** — registry configuration or authentication can
   prevent a package from being published even when its version is correct.
4. **Release input convention** — commit or branch conventions may not provide
   enough signal for an automated package-only release.

## Hypothesis Investigation

| Hypothesis | Evidence | Verdict |
| --- | --- | --- |
| Version source consistency is the problem | `package.json:3` is `0.2.0`, while `package-lock.json:3,9` and `install.js:7` remain `0.1.0`. Recent commits `cdef8a4` and `bcbbea4` explicitly bump versions, confirming manual propagation. | STRONG |
| Release orchestration is missing | `.github/workflows/publish-ai-toolkit.yml:3-6,99` publishes on pushes to `main`/`master`, but has no version increment, tag gate, change detection, or release state. `package.json:13-15` has no release scripts or dependencies. | STRONG |
| Publishing configuration is the primary issue | `package.json:7-9` and workflow setup configure GitHub Packages; workflow permissions and `GITHUB_TOKEN` publishing are present at `.github/workflows/publish-ai-toolkit.yml:11-12,113-121`. External permission risk exists, but no repository failure is confirmed. | WEAK |
| Commit/release convention is the primary issue | No release convention is documented in `README.md`, but the more direct evidence is already version drift and a push-based publish job. A manual tag-and-verify flow is a credible alternative, not evidence of the current root cause. | WEAK |

## Narrowing Signals

Decisive observations from Step 1.5 and Step 4 that narrowed the hypothesis
space:

- The scope is exploratory rather than a report of a single failed publish.
- Both version drift and the missing release lifecycle are in scope.
- The package-only boundary excludes GitHub Releases/tags as a user-observed
  deliverable, while leaving tags as one possible internal release signal.
- The package and lockfile already disagree, so the issue is not hypothetical.

## Cross-System Convention

Package publication systems generally require each published version to be
unique and derive publication from an explicit, repeatable release lifecycle.
The current workflow publishes on every branch push without changing or
checking the package version, so later pushes can attempt to republish the
same version. A tag-gated/manual version flow, Changesets, release-please, or
semantic-release could all represent valid lifecycle conventions; the
repository evidence does not establish semantic-release as uniquely required.

## Reframed (or Confirmed) Problem Statement

> **The actual problem to plan around is**: establish a reliable package-only
> version and publication lifecycle that keeps all version-bearing metadata
> consistent and prevents CI from publishing an unchanged or duplicate
> package version.

The initial request correctly identifies a missing automation need, but
semantic-release is an assumed mechanism rather than the verified problem.
The concrete repository evidence is a manually maintained version spread
across multiple files plus a push-based publish job with no version lifecycle.
Planning should therefore evaluate the complete lifecycle, not only add a
semantic-release dependency.

## Confidence

- **HIGH** — strong direct evidence of version drift and missing orchestration,
  matching package-release conventions and confirmed by recent version-bump
  history.

## What Changes for /10x-plan

Plan the package version-consistency and publication lifecycle as one bounded
problem. Compare the viable release-input conventions and select one only
after defining how version-bearing metadata and duplicate-version publishes
are handled; semantic-release is a candidate, not a premise.

## References

- Source files: `package.json:3,7-15`; `package-lock.json:3,9`;
  `install.js:7`; `.github/workflows/publish-ai-toolkit.yml:3-12,20-61,96-121`;
  `README.md:1-55`
- Related change: `context/changes/ai-toolkit/plan.md:1-15,311-327`
- Investigation tasks: `version-consistency`, `release-orchestration`,
  `publishing-boundary`, `independent-release-check`
