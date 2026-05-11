import { Pool, neon, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import ws from "ws";
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
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: databaseUrl });
    return drizzlePool(pool, { schema, casing: "snake_case" });
  }
  return drizzleHttp(neon(databaseUrl!), { schema, casing: "snake_case" });
}

export const db = buildDb() as ReturnType<typeof drizzleHttp<typeof schema>>;

export type DB = typeof db;
export { schema };
