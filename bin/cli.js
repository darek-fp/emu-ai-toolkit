#!/usr/bin/env node

const command = process.argv[2] || "install";

switch (command) {
  case "install":
    require("../install.js").run();
    break;
  case "uninstall":
    require("../uninstall.js").run();
    break;
  default:
    console.error(`ai-toolkit: unknown command "${command}" (expected "install" or "uninstall")`);
    process.exit(1);
}
