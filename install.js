#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const PACKAGE_NAME = "@darek-fp/ai-toolkit";
const PACKAGE_VERSION = "0.1.0";
const BEGIN = `<!-- BEGIN ${PACKAGE_NAME} -->`;
const END = `<!-- END ${PACKAGE_NAME} -->`;
const MANIFEST = ".ai-toolkit-manifest.json";
const PREINSTALL_HELPER =
  '[ -n "$GH_PKG_TOKEN" ] && echo \'//npm.pkg.github.com/:_authToken=${GH_PKG_TOKEN}\' >> .npmrc || true';

// Target-specific install locations, keyed by the value returned from detectTargets().
const TARGETS = {
  claude: { markerDir: ".claude", skillsDir: ".claude/skills", rulesFile: "CLAUDE.md" },
  copilot: { markerDir: ".github", skillsDir: ".github/skills", rulesFile: "AGENTS.md" },
};

function findProjectRoot() {
  if (process.env.PROJECT_ROOT) return process.env.PROJECT_ROOT;

  let dir = __dirname;
  while (dir !== path.dirname(dir)) {
    if (path.basename(dir) === "node_modules") return path.dirname(dir);
    dir = path.dirname(dir);
  }
  return process.cwd();
}

function copyDir(source, target, installedFiles, root) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const src = path.join(source, entry.name);
    const dst = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dst, installedFiles, root);
    } else {
      fs.copyFileSync(src, dst);
      installedFiles.push(path.relative(root, dst));
    }
  }
}

// Detect which AI tool convention(s) exist in the consumer repo. `.claude/`
// implies Claude Code, `.github/` implies GitHub Copilot. If neither exists,
// install both so the consumer isn't left with nothing.
function detectTargets(projectRoot) {
  const targets = [];
  if (fs.existsSync(path.join(projectRoot, ".claude"))) targets.push("claude");
  if (fs.existsSync(path.join(projectRoot, ".github"))) targets.push("copilot");
  return targets.length > 0 ? targets : ["claude", "copilot"];
}

function installSkills(projectRoot, target, installedFiles) {
  const source = path.join(__dirname, "skills");
  if (!fs.existsSync(source)) return;

  const targetRoot = path.join(projectRoot, TARGETS[target].skillsDir);
  fs.mkdirSync(targetRoot, { recursive: true });

  for (const skill of fs.readdirSync(source, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    const dest = path.join(targetRoot, skill.name);
    fs.rmSync(dest, { recursive: true, force: true });
    copyDir(path.join(source, skill.name), dest, installedFiles, projectRoot);
  }
}

function applyRulesBlock(existing, teamRules) {
  const block = `${BEGIN}\n${teamRules.trim()}\n${END}`;
  const start = existing.indexOf(BEGIN);
  const end = existing.indexOf(END);

  if (start !== -1 && end !== -1 && end > start) {
    return existing.slice(0, start) + block + existing.slice(end + END.length);
  }

  return existing.trimEnd() + "\n\n" + block + "\n";
}

function installRules(projectRoot, target, installedFiles, createdRuleFiles) {
  const rulesSource = path.join(__dirname, "rules", "AGENTS.md");
  if (!fs.existsSync(rulesSource)) return;

  const targetFile = TARGETS[target].rulesFile;
  const targetPath = path.join(projectRoot, targetFile);
  const fileExisted = fs.existsSync(targetPath);
  const existing = fileExisted ? fs.readFileSync(targetPath, "utf8") : "";
  const teamRules = fs.readFileSync(rulesSource, "utf8");
  fs.writeFileSync(targetPath, applyRulesBlock(existing, teamRules));
  if (!installedFiles.includes(targetFile)) installedFiles.push(targetFile);
  if (!fileExisted && !createdRuleFiles.includes(targetFile)) createdRuleFiles.push(targetFile);
}

// Only inject the CI-only preinstall auth helper into the *consumer's* own
// package.json — never into this package's own scripts. See "Preinstall
// auth-helper injection scope" in the plan for the exact gating rules.
function maybeInjectPreinstallHelper(projectRoot, manifest) {
  const pkgPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(pkgPath)) return;
  if (!process.env.CI) return;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.scripts = pkg.scripts || {};
  const existingPreinstall = pkg.scripts.preinstall || "";
  if (existingPreinstall.includes("GH_PKG_TOKEN") || existingPreinstall.includes("_authToken")) {
    return;
  }

  pkg.scripts.preinstall = existingPreinstall
    ? `${existingPreinstall} && ${PREINSTALL_HELPER}`
    : PREINSTALL_HELPER;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  manifest.preinstallInjected = true;
  manifest.preinstallHelperLine = PREINSTALL_HELPER;
}

function writeManifest(projectRoot, targets, installedFiles, createdDirs, createdRuleFiles, extra) {
  fs.writeFileSync(
    path.join(projectRoot, MANIFEST),
    JSON.stringify(
      {
        package: PACKAGE_NAME,
        version: PACKAGE_VERSION,
        installedAt: new Date().toISOString(),
        targets,
        files: installedFiles,
        createdDirs,
        createdRuleFiles,
        preinstallInjected: false,
        ...extra,
      },
      null,
      2,
    ) + "\n",
  );
}

function run() {
  try {
    const projectRoot = findProjectRoot();
    const targets = detectTargets(projectRoot);
    const installedFiles = [];
    const createdRuleFiles = [];

    // Capture, before anything is written, which target marker directories
    // (.claude/.github) did not already exist — so uninstall can remove
    // them again if it created them and they end up empty.
    const createdDirs = targets
      .map((target) => TARGETS[target].markerDir)
      .filter((markerDir) => !fs.existsSync(path.join(projectRoot, markerDir)));

    for (const target of targets) {
      installSkills(projectRoot, target, installedFiles);
      installRules(projectRoot, target, installedFiles, createdRuleFiles);
    }

    const manifest = {};
    maybeInjectPreinstallHelper(projectRoot, manifest);
    writeManifest(projectRoot, targets, installedFiles, createdDirs, createdRuleFiles, manifest);

    console.log(
      `${PACKAGE_NAME}: installed ${installedFiles.length} file(s) for target(s) ${targets.join(", ")}`,
    );
  } catch (error) {
    console.warn(`${PACKAGE_NAME}: postinstall warning: ${error.message}`);
  }
}

module.exports = { run };

if (require.main === module) {
  run();
}
