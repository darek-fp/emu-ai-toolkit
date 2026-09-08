#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { PROVIDERS } = require("./providers");

const PACKAGE_NAME = "@darek-fp/ai-toolkit";
const BEGIN = `<!-- BEGIN ${PACKAGE_NAME} -->`;
const END = `<!-- END ${PACKAGE_NAME} -->`;
const MANIFEST = ".ai-toolkit-manifest.json";

function removeRulesBlock(content) {
  const start = content.indexOf(BEGIN);
  const end = content.indexOf(END);
  if (start === -1 || end === -1 || end < start) return content;
  return (content.slice(0, start) + content.slice(end + END.length)).replace(/\n{3,}/g, "\n\n");
}

function providerRecords(manifest) {
  if (Array.isArray(manifest.providers)) return manifest.providers;
  return (manifest.targets || []).map((id) => ({
    id,
    rulesPath: PROVIDERS[id] && PROVIDERS[id].rules.path,
    skillsDir: PROVIDERS[id] && PROVIDERS[id].skillsDir,
  }));
}

function removeRules(projectRoot, records) {
  const removed = new Set();
  for (const record of records) {
    const rulesPath = record.rulesPath || (PROVIDERS[record.id] && PROVIDERS[record.id].rules.path);
    if (!rulesPath) {
      console.warn(`${PACKAGE_NAME}: unknown provider "${record.id}", skipping destructive cleanup`);
      continue;
    }
    const absolute = path.join(projectRoot, rulesPath);
    if (!fs.existsSync(absolute)) continue;
    const stripped = removeRulesBlock(fs.readFileSync(absolute, "utf8"));
    if ((record.createdPaths || []).includes(rulesPath) && stripped.trim() === "") {
      fs.rmSync(absolute, { force: true });
    } else {
      fs.writeFileSync(absolute, stripped);
    }
    removed.add(rulesPath);
  }
  return removed;
}

function removeFiles(projectRoot, files, ruleFiles) {
  for (const relative of files || []) {
    if (ruleFiles.has(relative)) continue;
    const absolute = path.join(projectRoot, relative);
    if (fs.existsSync(absolute)) fs.rmSync(absolute, { recursive: true, force: true });
  }
}

function removableFiles(manifest, records) {
  const allKnown = records.every((record) => PROVIDERS[record.id]);
  if (allKnown) return manifest.files || [];
  return records
    .filter((record) => PROVIDERS[record.id])
    .flatMap((record) => record.ownedFiles || []);
}

function removeEmptyDirectories(projectRoot, createdDirs) {
  for (const relative of createdDirs || []) {
    const absolute = path.join(projectRoot, relative);
    if (!fs.existsSync(absolute)) continue;
    const entries = fs.readdirSync(absolute, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      removeEmptyDirectories(projectRoot, [path.join(relative, entry.name)]);
    }
    if (fs.readdirSync(absolute).length === 0) fs.rmSync(absolute, { recursive: true, force: true });
  }
}

function maybeRemovePreinstallHelper(projectRoot, manifest) {
  if (!manifest.preinstallInjected) return;
  const pkgPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(pkgPath)) return;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const helper = manifest.preinstallHelperLine;
  if (!pkg.scripts || !pkg.scripts.preinstall || !helper) return;
  if (pkg.scripts.preinstall === helper) delete pkg.scripts.preinstall;
  else pkg.scripts.preinstall = pkg.scripts.preinstall.replace(` && ${helper}`, "").replace(`${helper} && `, "").replace(helper, "");
  if (pkg.scripts.preinstall === "") delete pkg.scripts.preinstall;
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
    if (manifest.schemaVersion && manifest.schemaVersion > 2) {
      console.warn(`${PACKAGE_NAME}: unsupported manifest version ${manifest.schemaVersion}; nothing removed`);
      return;
    }
    const records = providerRecords(manifest);
    const ruleFiles = removeRules(projectRoot, records);
    removeFiles(projectRoot, removableFiles(manifest, records), ruleFiles);
    removeEmptyDirectories(projectRoot, manifest.createdDirs);
    maybeRemovePreinstallHelper(projectRoot, manifest);
    fs.rmSync(manifestPath, { force: true });
    console.log(`${PACKAGE_NAME}: uninstalled managed files for target(s) ${(manifest.targets || []).join(", ")}`);
  } catch (error) {
    console.warn(`${PACKAGE_NAME}: uninstall warning: ${error.message}`);
  }
}

module.exports = { run };

if (require.main === module) run();
