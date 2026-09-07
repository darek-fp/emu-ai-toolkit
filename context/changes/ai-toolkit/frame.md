# Frame Brief: AI Toolkit npm Package via GitHub Packages

> Framing step before /10x-plan. This document captures what is *actually*
> at issue, separated from what was initially assumed.

## Reported Observation

Package the team's AI artifacts (skills + rules) into a distributable npm
package that consumer repositories can install from GitHub Packages, per
`.github/prompts/m5l4-github-packages-spec-pack.md` and the five
`.github/config-templates/m5l4-github-packages-*.template` files.

## Initial Framing (preserved)

- **User's stated cause or approach**: follow the spec pack and adapt the
  provided config-templates as the build recipe, more or less as-is.
- **User's proposed direction**: generate `package.json`, `install.js`,
  `uninstall.js`, `skills/`, `rules/` matching the spec pack + templates.
- **Pre-dispatch narrowing**: user answered three targeted questions rather
  than a general "which is the leading concern" — see Narrowing Signals.

## Dimension Map

The templates and the spec pack disagree with each other in three places
that would each independently produce "spec + templates say something
different than what should actually ship":

1. **npm scope / package name** — spec pack uses `@emu/ai-toolkit`;
   templates use `@twoj-zespol/ai-toolkit` (a Polish placeholder, "@your-team").
   Neither matches the actual GitHub owner. ← initial framing assumed the
   literal spec value.
2. **Target AI tool convention** — templates hardcode Claude Code paths
   (`.claude/skills/`, `CLAUDE.md`); the spec pack's own file tree says
   `rules/AGENTS.md` and describes the target generically as "the AI tool's
   configuration directory." This repo's own skills (including this very
   `/10x-frame` skill) live at `.github/skills/<name>/` — a third,
   unmentioned convention.
3. **Package contents (skills/rules to ship)** — spec pack's starter tree
   shows only a placeholder `skills/code-review/SKILL.md`; this repo already
   has a full suite of `.github/skills/10x-*` skills that could be shipped
   for real distribution instead.

## Hypothesis Investigation

| Hypothesis | Evidence | Verdict |
| --- | --- | --- |
| npm scope must match actual GitHub owner, not spec literal | `git config --get remote.origin.url` → `github.com/darek-fp/emu-ai-toolkit.git`; GitHub Packages requires npm scope == owning org/user login | STRONG |
| Templates are Claude-only and don't match this repo's tool | `.github/config-templates/m5l4-github-packages-install.js.template:38-46` installs to `.claude/skills/`; `:56-62` writes `CLAUDE.md`; this repo's own skills sit at `.github/skills/<name>/` (used by every `/10x-*` invocation this session) | STRONG |
| Spec pack's starter tree is a minimal placeholder, not the full 10x-* suite | `m5l4-github-packages-spec-pack.md` "Required files" section shows exactly one skill (`code-review/SKILL.md`) as the starter shape | STRONG |

## Narrowing Signals

- User confirmed npm scope should be `@darek-fp`, matching the verified
  GitHub remote — not the spec pack's `@emu` or the template's
  `@twoj-zespol` placeholder.
- User confirmed the installer should support **multiple** AI tool
  conventions (Claude + Copilot), not just the template's hardcoded
  Claude-only path — meaning `install.js`/`uninstall.js` need a
  tool-detection or dual-target layer not present in the template as given.
- User confirmed `skills/` and `rules/` should contain the spec pack's
  placeholder starter content (not the existing `10x-*` suite) — this is a
  scaffolding exercise, not a distribution of the real skill library yet.

## Cross-System Convention

GitHub Packages scoped packages are namespaced to the GitHub org/user that
owns them; publishing under a scope you don't control (`@emu`,
`@twoj-zespol`) fails auth or publishes to the wrong namespace. The verified
remote (`darek-fp/emu-ai-toolkit`) is the authoritative source for the
correct scope — this matches the user's answer, so confidence is high with
no contradicting signal found in `context/changes/` or `context/archive/`
(no prior occurrences exist; this is a fresh change).

## Reframed (or Confirmed) Problem Statement

> **The actual problem to plan around is**: adapt the spec pack + templates
> to this repo's real identity and tool footprint — publish under
> `@darek-fp/ai-toolkit`, and build an installer that supports both Claude
> Code and GitHub Copilot conventions — rather than implementing the
> templates' placeholder values literally.

The literal templates would either fail to publish (wrong scope) or install
into the wrong location for this repo's actual tooling (Claude-only paths
in a Copilot-centric repo). The spec pack itself is otherwise sound as a
scaffolding recipe (minimal placeholder skill/rule, standard file layout)
and doesn't need reframing beyond these three substitutions.

## Confidence

- **HIGH** — strong evidence (verified git remote, direct template
  file:line reads, spec pack tree) + decisive user narrowing on all three
  dimensions + no prior occurrence contradicts it.

## What Changes for /10x-plan

The plan should: (1) use `@darek-fp/ai-toolkit` as the package name/scope
everywhere (package.json, .npmrc, CI workflow scope, install/uninstall
banners); (2) design `install.js`/`uninstall.js` to detect or support both
`.claude/skills/` + `CLAUDE.md` and `.github/skills/` (or Copilot's
equivalent) + `AGENTS.md`-style rules files, rather than copying the
Claude-only template verbatim; (3) ship only the spec pack's placeholder
`skills/code-review/SKILL.md` and `rules/AGENTS.md` as starter content, not
the existing `10x-*` skill suite.

## References

- Source files: `.github/prompts/m5l4-github-packages-spec-pack.md`,
  `.github/config-templates/m5l4-github-packages-package.json.template`,
  `.github/config-templates/m5l4-github-packages-install.js.template:38-46,56-62`,
  `.github/config-templates/m5l4-github-packages-uninstall.js.template`,
  `.github/config-templates/m5l4-github-packages-consumer.npmrc.template`,
  `.github/config-templates/m5l4-github-packages-publish-ai-toolkit.yml.template`
- Verified: `git config --get remote.origin.url` → `darek-fp/emu-ai-toolkit`
- Related research: none (`context/changes/ai-toolkit/research.md` not present)
