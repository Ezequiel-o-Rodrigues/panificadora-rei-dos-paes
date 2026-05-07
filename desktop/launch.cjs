// Limpa ELECTRON_RUN_AS_NODE caso esteja vazada do host (VSCode, etc) e
// spawna o Electron apontando pro main.cjs em modo desktop.
delete process.env.ELECTRON_RUN_AS_NODE;

const { spawn } = require("node:child_process");
const path = require("node:path");
const electron = require("electron");

const child = spawn(electron, [path.join(__dirname, "main.cjs")], {
  stdio: "inherit",
  env: process.env,
});

child.on("close", (code) => process.exit(code ?? 0));
