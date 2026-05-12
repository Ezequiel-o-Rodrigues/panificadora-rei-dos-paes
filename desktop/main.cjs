// Limpa flag herdada de hosts (VSCode/etc) que faria o Electron rodar como Node.
delete process.env.ELECTRON_RUN_AS_NODE;

const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");
const { spawn } = require("node:child_process");
const { app, BrowserWindow, dialog, shell, Menu } = require("electron");

const isDev = !app.isPackaged;

// ---------------------------------------------------------------------------
// Logging: em produção GUI no Windows não tem stdout visível, então também
// escrevemos para um arquivo ao lado do executável. Lazy: app.getPath só
// pode ser chamado depois do app inicializar em alguns casos.
// ---------------------------------------------------------------------------

let _logFile = undefined;
function getLogFile() {
  if (_logFile !== undefined) return _logFile;
  if (isDev) {
    _logFile = null;
    return null;
  }
  try {
    _logFile = path.join(
      path.dirname(app.getPath("exe")),
      "painel-padaria.log",
    );
  } catch {
    _logFile = null;
  }
  return _logFile;
}

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join(" ")}\n`;
  if (process.stdout && process.stdout.write) {
    try { process.stdout.write(line); } catch { /* ignore */ }
  }
  const file = getLogFile();
  if (file) {
    try {
      fs.appendFileSync(file, line);
    } catch {
      // ignora erro de log
    }
  }
}

process.on("uncaughtException", (err) => {
  log("[fatal] uncaughtException:", err?.stack || err?.message || String(err));
});
process.on("unhandledRejection", (reason) => {
  log("[fatal] unhandledRejection:", reason?.stack || String(reason));
});

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

// Em dev usamos o `next dev` que sobe na 3000 (via desktop:dev / concurrently).
// Em produção subimos o servidor standalone do Next num processo filho numa porta
// alta, fixa. Não conflita com nada usual e não exige descobrir porta livre.
const PROD_PORT = 38473;
const DEV_URL = process.env.DESKTOP_DEV_URL || "http://localhost:3000/admin";
const PROD_URL = `http://127.0.0.1:${PROD_PORT}/admin`;

let mainWindow = null;
let splashWindow = null;
let nextServerProcess = null;

// ---------------------------------------------------------------------------
// Carrega .env.local ao lado do executável (produção) ou na raiz (dev).
// Em produção o arquivo NÃO é distribuído junto: o usuário coloca o
// .env.local dele na mesma pasta do .exe instalado.
// ---------------------------------------------------------------------------

// Parser .env mínimo (sem dependência externa). Suporta:
//   KEY=value         (com ou sem aspas)
//   # comment
//   linhas em branco
function parseEnvFile(content) {
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Remove aspas envolventes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function loadEnvFile() {
  const candidates = isDev
    ? [path.join(__dirname, "..", ".env.local")]
    : [
        path.join(path.dirname(app.getPath("exe")), ".env.local"),
        path.join(app.getPath("userData"), ".env.local"),
      ];

  for (const file of candidates) {
    if (fs.existsSync(file)) {
      try {
        const content = fs.readFileSync(file, "utf8");
        const vars = parseEnvFile(content);
        for (const [k, v] of Object.entries(vars)) {
          process.env[k] = v;
        }
        log("[env] carregado de", file, "—", Object.keys(vars).length, "vars");
        return file;
      } catch (err) {
        log("[env] erro ao ler", file, String(err));
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sobe o Next standalone server num processo filho. ELECTRON_RUN_AS_NODE=1
// faz o binário do Electron agir como Node, então não precisamos embutir
// um Node.js separado.
// ---------------------------------------------------------------------------

function startNextServer() {
  // Em produção, electron-builder coloca tudo dentro de resources/app/.
  // O standalone fica em .next/standalone/server.js.
  const standaloneRoot = path.join(
    process.resourcesPath,
    "app",
    ".next",
    "standalone",
  );
  const serverEntry = path.join(standaloneRoot, "server.js");

  if (!fs.existsSync(serverEntry)) {
    dialog.showErrorBox(
      "Servidor não encontrado",
      `Arquivo standalone não encontrado em:\n${serverEntry}\n\nVerifique se o build foi gerado corretamente.`,
    );
    app.quit();
    return Promise.reject(new Error("server.js missing"));
  }

  log("[next] iniciando servidor:", serverEntry);

  nextServerProcess = spawn(process.execPath, [serverEntry], {
    cwd: standaloneRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(PROD_PORT),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  nextServerProcess.stdout.on("data", (chunk) => {
    process.stdout.write(`[next] ${chunk}`);
  });
  nextServerProcess.stderr.on("data", (chunk) => {
    process.stderr.write(`[next:err] ${chunk}`);
  });

  nextServerProcess.on("exit", (code) => {
    log("[next] servidor encerrou com código", code);
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox(
        "Servidor caiu",
        `O servidor interno encerrou (code=${code}). O aplicativo será fechado.`,
      );
      app.quit();
    }
  });

  return waitForPort(PROD_PORT, "127.0.0.1", 20000);
}

function waitForPort(port, host, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.connect({ port, host });
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error(`Timeout aguardando porta ${port}`));
        } else {
          setTimeout(tryConnect, 200);
        }
      });
    };
    tryConnect();
  });
}

function stopNextServer() {
  if (nextServerProcess && !nextServerProcess.killed) {
    try {
      nextServerProcess.kill();
    } catch (err) {
      log("[next] erro ao matar processo:", err);
    }
    nextServerProcess = null;
  }
}

// ---------------------------------------------------------------------------
// Splash (mostrado enquanto o Next standalone sobe — ~3-5s em produção)
// ---------------------------------------------------------------------------

const SPLASH_HTML = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;user-select:none;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fafaf5;
  background:radial-gradient(circle at 50% 38%,rgba(255,109,10,.18),transparent 60%),#0a0a0a}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px}
.logo{width:96px;height:96px;border-radius:50%;background:#0c0a09;
  box-shadow:0 0 0 1px rgba(255,140,40,.5),0 8px 30px rgba(255,109,10,.25);
  display:flex;align-items:center;justify-content:center;
  animation:flicker 2.4s ease-in-out infinite}
@keyframes flicker{
  0%,100%{box-shadow:0 0 0 1px rgba(255,140,40,.5),0 8px 30px rgba(255,109,10,.25)}
  50%{box-shadow:0 0 0 1px rgba(255,140,40,.75),0 14px 44px rgba(255,109,10,.5)}}
.nome{font-size:22px;font-weight:700;letter-spacing:.04em;
  background:linear-gradient(135deg,#ffa855 0%,#ff6d0a 60%,#dc2626 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;color:transparent}
.sub{font-size:10px;letter-spacing:.34em;text-transform:uppercase;color:#a8a29e;margin-top:-2px}
.loading{display:flex;align-items:center;gap:10px;margin-top:10px;font-size:12px;color:#78716c}
.sp{width:14px;height:14px;border:2px solid rgba(255,109,10,.3);
  border-top-color:#ff6d0a;border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style></head><body>
<div class="logo">
<svg viewBox="0 0 48 48" width="64" height="64" aria-hidden="true">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#ffa855"/><stop offset="55%" stop-color="#ff6d0a"/>
<stop offset="100%" stop-color="#dc2626"/></linearGradient></defs>
<path d="M24 6 C22 10 22 12 24 14 C26 12 26 10 24 6 Z" fill="#ffa855"/>
<path d="M7 32 L10 17 L17 23 L24 13 L31 23 L38 17 L41 32 Z"
  fill="url(#g)" stroke="#ff8c28" stroke-width=".6" stroke-linejoin="round"/>
<rect x="7" y="31" width="34" height="5" rx="1.2"
  fill="url(#g)" stroke="#ff8c28" stroke-width=".6"/>
<circle cx="17" cy="22" r="1.2" fill="#fafaf5" opacity=".9"/>
<circle cx="24" cy="13" r="1.3" fill="#fafaf5" opacity=".9"/>
<circle cx="31" cy="22" r="1.2" fill="#fafaf5" opacity=".9"/>
</svg></div>
<div class="nome">Painel Padaria</div>
<div class="sub">Rei dos Pães</div>
<div class="loading"><div class="sp"></div><span>Carregando…</span></div>
</body></html>`;

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 380,
    height: 320,
    frame: false,
    resizable: false,
    movable: true,
    skipTaskbar: false,
    title: "Painel Padaria",
    backgroundColor: "#0a0a0a",
    icon: path.join(__dirname, "build-resources", "icon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  splashWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(SPLASH_HTML)}`,
  );
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  splashWindow = null;
}

// ---------------------------------------------------------------------------
// Janela
// ---------------------------------------------------------------------------

function createWindow(targetUrl) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    show: false, // só aparece em ready-to-show — splash continua até lá
    title: "Painel Padaria — Rei dos Pães",
    backgroundColor: "#0a0a0a",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "build-resources", "icon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    closeSplash();
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadURL(targetUrl);

  if (process.env.OPEN_DEVTOOLS === "1") {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F12") {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
    if (input.control && input.key.toLowerCase() === "r") {
      mainWindow.webContents.reload();
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function bootstrap() {
  loadEnvFile();

  if (isDev) {
    // Em dev o `next dev` já tá no ar via concurrently — sem splash, abre
    // direto pra economizar 1 ciclo de render.
    createWindow(DEV_URL);
    return;
  }

  // Em produção o splash cobre o tempo de inicialização do Next standalone
  // (~3-5s). É fechado no `ready-to-show` da janela principal ou em erro.
  createSplash();

  if (!process.env.DATABASE_URL) {
    closeSplash();
    dialog.showErrorBox(
      "Configuração ausente",
      "DATABASE_URL não foi encontrada.\n\n" +
        "Crie um arquivo .env.local na pasta do executável com a variável " +
        "DATABASE_URL apontando para o Neon.",
    );
    app.quit();
    return;
  }

  try {
    await startNextServer();
    createWindow(PROD_URL);
  } catch (err) {
    closeSplash();
    log("[bootstrap] falha ao iniciar:", err);
    dialog.showErrorBox(
      "Falha ao iniciar",
      `Não foi possível subir o servidor interno.\n\n${err?.message ?? err}`,
    );
    app.quit();
  }
}

app.whenReady().then(bootstrap);

app.on("window-all-closed", () => {
  stopNextServer();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", stopNextServer);
app.on("will-quit", stopNextServer);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    bootstrap();
  }
});
