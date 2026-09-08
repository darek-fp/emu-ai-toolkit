"use strict";

const REGISTRY_VERSION = 1;

const PROVIDERS = {
  claude: {
    id: "claude",
    markerDir: ".claude",
    skillsDir: ".claude/skills",
    rules: { path: "CLAUDE.md", format: "markdown" },
  },
  copilot: {
    id: "copilot",
    markerDir: ".github",
    skillsDir: ".github/skills",
    rules: { path: "AGENTS.md", format: "markdown" },
  },
  cursor: {
    id: "cursor",
    markerDir: ".cursor",
    skillsDir: ".cursor/skills",
    rules: { path: ".cursor/rules/ai-toolkit.mdc", format: "cursor" },
  },
  windsurf: {
    id: "windsurf",
    markerDir: ".windsurf",
    skillsDir: ".windsurf/skills",
    rules: { path: ".windsurf/rules/ai-toolkit.md", format: "markdown" },
  },
};

function getProvider(id) {
  return PROVIDERS[id];
}

function validateProviderIds(ids) {
  const values = Array.isArray(ids) ? ids : String(ids || "").split(",");
  const normalized = [...new Set(values.map((id) => String(id).trim()).filter(Boolean))];
  const unknown = normalized.filter((id) => !PROVIDERS[id]);
  if (unknown.length > 0) {
    throw new Error(
      `unknown target(s): ${unknown.join(", ")} (valid targets: ${Object.keys(PROVIDERS).join(", ")})`,
    );
  }
  if (normalized.length === 0) throw new Error("at least one target is required");
  return normalized;
}

module.exports = Object.freeze({
  REGISTRY_VERSION,
  PROVIDERS: Object.freeze(
    Object.fromEntries(
      Object.entries(PROVIDERS).map(([id, provider]) => [
        id,
        Object.freeze({ ...provider, rules: Object.freeze({ ...provider.rules }) }),
      ]),
    ),
  ),
  getProvider,
  validateProviderIds,
});
