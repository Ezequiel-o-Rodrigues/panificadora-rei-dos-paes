import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL não definida. Configure em .env.local (veja .env.local.example)."
  );
}

// No standalone do Electron (Phase 2), main.cjs spawna o server com
// ELECTRON_RUN_AS_NODE=1. É um processo Node persistente, então usamos
// o driver WebSocket Pool — mantém a conexão TLS aberta entre queries
// (corta ~10-30ms por query). Na Vercel (serverless) mantemos o driver
// HTTP, que é stateless e bem otimizado pra cold starts curtos.
const isDesktopRuntime = !!process.env.ELECTRON_RUN_AS_NODE;

function buildDb() {
  if (isDesktopRuntime) {
    // eval('require') esconde os módulos da análise estática do bundler.
    // Sem isso, ws e o caminho neon-serverless são bundlados e um timer
    // interno do ws dispara durante "Generating static pages" com
    // "b.mask is not a function". next.config.ts também marca esses
    // pacotes como serverExternalPackages pra reforçar.
    // eslint-disable-next-line no-eval
    const req = eval("require") as NodeRequire;
    const ws = req("ws");
    const { Pool, neonConfig } = req("@neondatabase/serverless");
    const { drizzle: drizzlePool } = req("drizzle-orm/neon-serverless");
    neonConfig.webSocketConstructor = ws.default ?? ws;
    const pool = new Pool({ connectionString: databaseUrl });
    return drizzlePool(pool, { schema, casing: "snake_case" });
  }
  return drizzleHttp(neon(databaseUrl!), { schema, casing: "snake_case" });
}

export const db = buildDb() as ReturnType<typeof drizzleHttp<typeof schema>>;

export type DB = typeof db;
export { schema };
