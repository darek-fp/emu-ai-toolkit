#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const PACKAGE_NAME = "@darek-fp/ai-toolkit";
const BEGIN = `<!-- BEGIN ${PACKAGE_NAME} -->`;
const END = `<!-- END ${PACKAGE_NAME} -->`;
const MANIFEST = ".ai-toolkit-manifest.json";

const TARGETS = {
  claude: { rulesFile: "CLAUDE.md" },
  copilot: { rulesFile: "AGENTS.md" },
};

function removeRulesBlock(content) {
  const start = content.indexOf(BEGIN);
  const end = content.indexOf(END);
  if (start === -1 || end === -1 || end < start) return content;
  return (content.slice(0, start) + content.slice(end + END.length)).replace(/\n{3,}/g, "\n\n");
}

function removeRulesBlockFromTargets(projectRoot, targets) {
  const ruleFiles = new Set(targets.map((target) => TARGETS[target].rulesFile));
  for (const ruleFile of ruleFiles) {
    const rulesPath = path.join(projectRoot, ruleFile);
    if (!fs.existsSync(rulesPath)) continue;
    fs.writeFileSync(rulesPath, removeRulesBlock(fs.readFileSync(rulesPath, "utf8")));
  }
  return ruleFiles;
}

function removeInstalledFiles(projectRoot, files, ruleFiles) {
  for (const relPath of files) {
    if (ruleFiles.has(relPath)) continue; // rule files are stripped, not deleted
    fs.rmSync(path.join(projectRoot, relPath), { recursive: true, force: true });
  }

  // Best-effort cleanup of now-empty skill directories left behind by rmSync.
  for (const skillsRoot of [".claude/skills", ".github/skills"]) {
    const dir = path.join(projectRoot, skillsRoot);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillDir = path.join(dir, entry.name);
      if (fs.readdirSync(skillDir).length === 0) fs.rmSync(skillDir, { recursive: true, force: true });
    }
    if (fs.readdirSync(dir).length === 0) fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Remove exactly the preinstall helper line install.js added, rather than
// guessing at the consumer's package.json contents.
function maybeRemovePreinstallHelper(projectRoot, manifest) {
  if (!manifest.preinstallInjected) return;

  const pkgPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(pkgPath)) return;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const helper = manifest.preinstallHelperLine;
  if (!pkg.scripts || !pkg.scripts.preinstall || !helper) return;

  if (pkg.scripts.preinstall === helper) {
    delete pkg.scripts.preinstall;
  } else {
    pkg.scripts.preinstall = pkg.scripts.preinstall
      .replace(` && ${helper}`, "")
      .replace(`${helper} && `, "")
      .replace(helper, "");
    if (pkg.scripts.preinstall === "") delete pkg.scripts.preinstall;
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

function run() {
  try {
    const projectRoot = process.env.PROJECT_ROOT || process.cwd();
    const manifestPath = path.join(projectRoot, MANIFEST);
    if (!fs.existsSync(manifestPath)) {
      console.log(`${PACKAGE_NAME}: no manifest found, nothing to uninstall`);
      return;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const targets = manifest.targets || [];

    const ruleFiles = removeRulesBlockFromTargets(projectRoot, targets);
    removeInstalledFiles(projectRoot, manifest.files || [], ruleFiles);
    maybeRemovePreinstallHelper(projectRoot, manifest);

    fs.rmSync(manifestPath, { force: true });
    console.log(`${PACKAGE_NAME}: uninstalled managed files for target(s) ${targets.join(", ")}`);
  } catch (error) {
    console.warn(`${PACKAGE_NAME}: uninstall warning: ${error.message}`);
  }
}

module.exports = { run };

if (require.main === module) {
  run();
}
