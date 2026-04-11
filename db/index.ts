import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL não definida. Configure em .env.local (veja .env.local.example)."
  );
}

const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema, casing: "snake_case" });

export type DB = typeof db;
export { schema };
