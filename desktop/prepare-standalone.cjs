// Pós-build: o `next build` com output:'standalone' gera .next/standalone/server.js
// e as deps mínimas, mas NÃO copia public/ nem .next/static/ — precisamos colocar
// esses arquivos lá manualmente para o servidor servir os assets corretamente.
//
// Rodar logo após `BUILD_TARGET=desktop next build`.

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(standalone)) {
  console.error(
    "[prepare-standalone] Pasta .next/standalone/ não existe. Rode `next build` com BUILD_TARGET=desktop antes.",
  );
  process.exit(1);
}

function copyDir(src, dst) {
  if (!fs.existsSync(src)) {
    console.warn("[prepare-standalone] origem não existe, pulando:", src);
    return;
  }
  fs.cpSync(src, dst, { recursive: true });
  console.log("[prepare-standalone] copiado:", path.relative(root, src), "→", path.relative(root, dst));
}

copyDir(
  path.join(root, "public"),
  path.join(standalone, "public"),
);

copyDir(
  path.join(root, ".next", "static"),
  path.join(standalone, ".next", "static"),
);

// db/index.ts faz `eval('require')` de ws e drizzle-orm/neon-serverless
// pra ativar o Pool driver no Electron. O Next tracer não enxerga essas
// requires, então copiamos manualmente. Sem isso, o standalone falha em
// runtime com "Cannot find module 'ws'".
const POOL_DEPS = [
  "ws",
  "drizzle-orm/neon-serverless",
];
for (const dep of POOL_DEPS) {
  copyDir(
    path.join(root, "node_modules", dep),
    path.join(standalone, "node_modules", dep),
  );
}

console.log("[prepare-standalone] OK — standalone pronto para empacotamento.");
