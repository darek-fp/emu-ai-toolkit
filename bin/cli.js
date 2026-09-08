#!/usr/bin/env node

const { validateProviderIds } = require("../providers.js");

const args = process.argv.slice(2);
const command = args[0] && !args[0].startsWith("-") ? args.shift() : "install";

function parseTargets() {
  const index = args.indexOf("--target");
  if (index === -1) return undefined;
  if (index !== 0 || !args[1] || args.length > 2) {
    throw new Error("--target requires one comma-separated target list and no extra arguments");
  }
  return validateProviderIds(args[1].split(","));
}

try {
  switch (command) {
    case "install": {
      const targets = parseTargets() || process.env.AI_TOOLKIT_TARGETS;
      require("../install.js").run({ targets, throwOnError: true });
      break;
    }
    case "uninstall":
      if (args.length > 0) throw new Error("uninstall does not accept target selection; the manifest is authoritative");
      require("../uninstall.js").run();
      break;
    default:
      throw new Error(`unknown command "${command}" (expected "install" or "uninstall")`);
  }
} catch (error) {
  console.error(`ai-toolkit: ${error.message}`);
  process.exit(1);
}
