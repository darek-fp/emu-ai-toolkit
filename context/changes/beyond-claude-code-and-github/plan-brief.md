# Support for Additional AI Provider Conventions — Plan Brief

> Full plan: `context/changes/beyond-claude-code-and-github/plan.md`
> Research: `context/changes/beyond-claude-code-and-github/research.md`

## What & Why

The toolkit currently installs shared AI artifacts only for Claude Code and
GitHub Copilot. This plan adds Cursor and Windsurf convention support and
replaces duplicated target logic with a provider registry so future providers
do not require parallel installer/uninstaller edits.

This is support for AI coding-tool repository conventions, not model/API
providers such as OpenAI or Gemini.

## Starting Point

`install.js` and `uninstall.js` hard-code provider paths, marker detection, and
cleanup. Shared skill copying and sentinel-managed Markdown rules are reusable,
but the manifest and CI smoke tests assume exactly two targets.

## Desired End State

Claude, Copilot, Cursor, and Windsurf are selectable through automatic marker
detection or explicit CLI/environment configuration. Installs preserve
unmanaged consumer content, manifests contain versioned provider ownership
metadata, and uninstall safely reverses both new and legacy installs.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Provider scope | Claude, Copilot, Cursor, Windsurf conventions | Expands the current two-tool boundary without introducing model APIs | Research / Plan |
| Selection | Auto-detect markers; explicit `--target` and `AI_TOOLKIT_TARGETS` override | Preserves current UX while supporting ambiguous/no-marker consumers | Research / Plan |
| No-marker behavior | Keep legacy Claude + Copilot fallback | Avoids breaking existing consumers | Research / Plan |
| Registry ownership | One shared registry for install and uninstall | Eliminates duplicated target metadata and cleanup drift | Research |
| File conflicts | Preserve unmanaged files; fail unsafe conflicts clearly | Prevents new providers from increasing destructive overwrite risk | Plan |
| CI lifecycle | Run package validation with `npm ci --ignore-scripts` | Prevents postinstall mutation of the toolkit checkout | Plan validation |

## Scope

**In scope:** provider registry, Cursor/Windsurf adapters, explicit target
selection, versioned manifests, safe ownership-aware install/uninstall,
README updates, CI smoke matrix, and legacy compatibility.

**Out of scope:** model/API integrations, remote provider plugins, changing
skill content, and removing the existing Claude/Copilot fallback.

## Architecture / Approach

`providers.js` becomes the shared contract:

`selection (CLI/env or markers) → provider registry → install assets + manifest`

Uninstall reads the manifest and the same registry, using recorded resolved
paths for safe cleanup. Provider-specific rule renderers handle differences
between root Markdown files and native rules directories; shared skills remain
provider-neutral.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Registry and safe install/uninstall | Four providers, explicit selection, ownership-aware manifest and cleanup | Native Cursor/Windsurf paths and formats |
| 2. Docs and CI matrix | Documented contract and complete automated smoke coverage | Detecting lifecycle regressions |
| 3. Compatibility hardening | Legacy/unknown manifest handling and release packaging checks | Upgrade behavior across registry changes |

**Prerequisites:** Existing `research.md`; Node 20; current npm package and
workflow conventions.

**Estimated effort:** ~2–3 implementation sessions across 3 phases.

## Open Risks & Assumptions

- Cursor and Windsurf adapter paths/formats must be verified against their
  current project conventions during implementation.
- Existing consumers depend on the no-marker Claude/Copilot fallback.
- No separate test runner will be introduced; smoke coverage remains the
  repository's established validation style.
- Provider-specific rule assets may require directory templates rather than a
  single root file.

## Success Criteria (Summary)

- Users can install the toolkit for any supported convention without editing
  installer source code.
- Reinstall and uninstall preserve consumer-owned files and support legacy
  manifests.
- CI validates all providers, selection modes, conflict cases, and package
  lifecycle isolation.
