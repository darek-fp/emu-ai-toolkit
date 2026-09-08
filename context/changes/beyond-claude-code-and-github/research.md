---
date: 2026-09-08T22:24:32+02:00
researcher: GitHub Copilot
git_commit: 7f87fd48ff4773b1685234e8f3da4c7594076233
branch: main
repository: darek-fp/emu-ai-toolkit
topic: "Support for additional AI providers"
tags: [research, codebase, installer, providers, claude-code, github-copilot]
status: complete
last_updated: 2026-09-08
last_updated_by: GitHub Copilot
---

# Research: Support for additional AI providers

**Date**: 2026-09-08T22:24:32+02:00  
**Researcher**: GitHub Copilot  
**Git Commit**: 7f87fd48ff4773b1685234e8f3da4c7594076233  
**Branch**: main  
**Repository**: darek-fp/emu-ai-toolkit

## Research Question

How can this toolkit add support for AI providers beyond Claude Code and GitHub Copilot?

The change note says: “add support for others AI providers.” In this repository, “provider” currently means an AI coding tool's repository conventions, not a model API backend.

## Summary

The toolkit has no model-provider SDK, API client, authentication flow, or backend abstraction. Its provider integration surface is local installation into tool-specific repository conventions. `install.js` hardcodes two targets (`claude` and `copilot`), and `uninstall.js` duplicates part of that mapping. Skill copying is already provider-neutral after a target is selected; rule destinations, marker detection, cleanup, and documentation are the coupled areas.

The safest implementation direction is a shared, declarative provider registry containing each target's identifier, marker/detection rule, skills directory, rules destination, source rule strategy, and cleanup metadata. Installation and uninstallation should consume the same registry and persist enough target metadata in the manifest to reverse the operation. Before implementation, the change must define which additional tools are in scope and whether selection remains presence-based. With three or more targets, the current “no marker means install both” default is likely unsafe and needs an explicit decision.

## Detailed Findings

### Installer target model

- `install.js:18-22` defines the only provider registry today: Claude maps to `.claude/skills` and `CLAUDE.md`; Copilot maps to `.github/skills` and `AGENTS.md`.
- `install.js:49-56` detects targets only by checking whether `.claude` or `.github` exists. If neither exists, it installs both targets.
- `install.js:59-72` copies the shared `skills/` tree into the selected target's skills directory. This logic does not contain provider-specific behavior and is a useful seam to preserve.
- `install.js:86-98` always reads the single source file `rules/AGENTS.md`, then writes the content into the target-specific rules file using shared sentinel markers.
- `install.js:130-166` writes a root `.ai-toolkit-manifest.json` containing target names, installed paths, created directories, created rule files, and auth-helper state.

The main coupling is target metadata, not the skill-copy algorithm. A new target needs a convention definition and a detection/selection policy; the common copy and sentinel primitives can likely remain shared.

### Uninstaller and reversibility

- `uninstall.js:11-14` repeats the target-to-rules-file mapping instead of importing a shared definition.
- `uninstall.js:23-39` removes managed rule blocks based on manifest target names and deletes rule files that were created from nothing.
- `uninstall.js:44-53` removes marker directories only when installation created them and they remain empty.
- `uninstall.js:55-69` cleans only `.claude/skills` and `.github/skills`, so additional target roots require code changes even if their metadata is present in the manifest.
- `uninstall.js:107-115` trusts manifest target names when resolving rule files; a shared registry and explicit handling for unknown/legacy targets would make migrations safer.

Install and uninstall must evolve together. A provider-specific rules format or directory layout cannot be added only to `install.js` without leaving stale files or rule blocks behind.

### Provider-neutral packaged assets

- `rules/AGENTS.md:3-6` describes shared rule content intended to be embedded into either `AGENTS.md` or `CLAUDE.md`; the content itself is not tied to one tool.
- `skills/code-review/SKILL.md:1-403` is the packaged skill and is project-specific rather than provider-specific.
- `package.json:12-19` packages `skills/`, `rules/`, and the installer/uninstaller entry points.
- `README.md:5-20` documents the current Claude/Copilot detection, destinations, sentinel-managed rules, manifest, and idempotent reinstall behavior.

The source asset layout can support more convention targets, but some tools may require different rule filenames, file formats, frontmatter, or skill placement. The provider contract should therefore distinguish shared skills from provider-specific rule rendering where necessary.

### Historical scope and decisions

- `context/changes/ai-toolkit/frame.md:30-36` records the original mismatch between Claude-only templates and this repository's Copilot convention.
- `context/changes/ai-toolkit/frame.md:48-58` records the decision to support multiple tool conventions rather than copy the Claude-only template literally.
- `context/changes/ai-toolkit/frame.md:96-104` specifies the existing dual-target paths and provider-neutral starter artifacts.
- `context/changes/ai-toolkit/plan.md:81-89` explicitly states that Cursor, Windsurf, and other conventions were out of scope for the original change.
- `context/changes/ai-toolkit/plan.md:232-276` defines the existing detection, per-provider destinations, shared manifest, and uninstaller contract.
- `context/changes/ai-toolkit/plan.md:286-307` defines scratch-directory validation for no-marker, Claude-only, idempotent reinstall, and uninstall scenarios.
- `context/archive/README.md:1-3` contains only archive policy; there is no prior archived implementation of broader provider support.

This change is therefore a deliberate expansion beyond an earlier two-provider boundary, not a correction to an existing general provider system.

### CI and validation

- `.github/workflows/publish-ai-toolkit.yml:25-56` validates package metadata, the placeholder skill, frontmatter, and package contents.
- `.github/workflows/publish-ai-toolkit.yml:58-80` smoke-tests a no-marker repository and expects both `claude,copilot`.
- `.github/workflows/publish-ai-toolkit.yml:82-101` smoke-tests a repository with `.github` and expects Copilot only.
- `context/changes/ai-toolkit/plan.md:364-378` says validation is scratch-directory integration testing rather than a separate test suite; the committed workflow does not cover every scenario listed in the plan, notably Claude-only coverage.

Adding targets should extend the smoke matrix with one scenario per provider plus mixed-provider and reinstall/uninstall cases. It should also clarify behavior for an unknown or missing marker and verify that existing rule files are preserved.

### CI and release implications

- `.github/workflows/publish-ai-toolkit.yml:11-15` grants write permissions for contents, issues, packages, and pull requests; provider support does not inherently require broader permissions.
- `.github/workflows/publish-ai-toolkit.yml:29` runs `npm ci`, so lifecycle behavior must avoid unintended modifications when the repository itself contains provider marker directories.
- `package.json:20-30` and `.github/workflows/publish-ai-toolkit.yml:103-126` establish the semantic-release and GitHub Packages publication path. Provider expansion should preserve package identity, packaging, and release behavior.

## Code References

- [`install.js:18-22`](https://github.com/darek-fp/emu-ai-toolkit/blob/7f87fd48ff4773b1685234e8f3da4c7594076233/install.js#L18-L22) — hard-coded Claude and Copilot target metadata.
- [`install.js:49-56`](https://github.com/darek-fp/emu-ai-toolkit/blob/7f87fd48ff4773b1685234e8f3da4c7594076233/install.js#L49-L56) — marker-directory detection and no-marker default.
- [`install.js:59-72`](https://github.com/darek-fp/emu-ai-toolkit/blob/7f87fd48ff4773b1685234e8f3da4c7594076233/install.js#L59-L72) — shared skill installation.
- [`install.js:86-98`](https://github.com/darek-fp/emu-ai-toolkit/blob/7f87fd48ff4773b1685234e8f3da4c7594076233/install.js#L86-L98) — shared rule source and target-specific rule destination.
- [`install.js:130-166`](https://github.com/darek-fp/emu-ai-toolkit/blob/7f87fd48ff4773b1685234e8f3da4c7594076233/install.js#L130-L166) — manifest creation and target installation loop.
- [`uninstall.js:11-14`](https://github.com/darek-fp/emu-ai-toolkit/blob/7f87fd48ff4773b1685234e8f3da4c7594076233/uninstall.js#L11-L14) — duplicated target rules mapping.
- [`uninstall.js:23-69`](https://github.com/darek-fp/emu-ai-toolkit/blob/7f87fd48ff4773b1685234e8f3da4c7594076233/uninstall.js#L23-L69) — target rule removal and hard-coded skills-root cleanup.
- [`README.md:5-20`](https://github.com/darek-fp/emu-ai-toolkit/blob/7f87fd48ff4773b1685234e8f3da4c7594076233/README.md#L5-L20) — documented two-provider behavior.
- [`.github/workflows/publish-ai-toolkit.yml:58-101`](https://github.com/darek-fp/emu-ai-toolkit/blob/7f87fd48ff4773b1685234e8f3da4c7594076233/.github/workflows/publish-ai-toolkit.yml#L58-L101) — current installer smoke scenarios.

## Architecture Insights

1. The repository is an npm-packaged convention installer, not a model-provider integration library. “OpenAI,” “Gemini,” or similar API support would require a separate architecture and is not represented by the current code.
2. Provider-specific behavior is concentrated at the boundary: detection, destination paths, rules rendering, manifest metadata, and cleanup. Shared skills and sentinel mechanics are reusable.
3. A single provider registry should be the source of truth for install and uninstall. Duplicated maps are already a maintenance risk with only two targets.
4. Presence detection is convenient for the current pair but becomes ambiguous as more tools are supported. An explicit target option or configuration file is likely needed, with a carefully chosen fallback for no-marker projects.
5. The manifest is the compatibility boundary between install and uninstall. It should record provider identifiers and any provider-specific paths or cleanup data needed for safe reversal.

## Historical Context (from prior changes)

- `context/changes/ai-toolkit/frame.md` — reframed the original Claude-only template to support Claude Code and GitHub Copilot.
- `context/changes/ai-toolkit/plan.md` — defined the current two-target installer, shared manifest, and scratch-directory validation.
- `context/archive/README.md` — confirms no archived provider-expansion research or implementation exists.

## Related Research

- `context/changes/ai-toolkit/frame.md`
- `context/changes/ai-toolkit/plan.md`

## Open Questions

- Which additional AI coding tools are required for the first slice (for example Cursor, Windsurf, Cline, or another convention)?
- Does “AI providers” mean repository integrations/tools, or model/API providers such as OpenAI and Gemini? The current code supports only the former.
- Should automatic detection remain marker-based, or should users be able to select targets explicitly through a CLI flag, environment variable, or package configuration?
- When no provider marker exists, should installation continue to install every supported target, install a documented default, or require explicit selection?
- Do any target tools require provider-specific rules formats or locations rather than a plain Markdown file and shared sentinel block?
- Should the manifest schema include a registry version and preserve enough per-provider metadata to uninstall older installations after the registry changes?
