// lib/db.ts — Neon Serverless Postgres Connection via Drizzle ORM

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to your .env.local file.\n" +
    "Get a free Postgres database at: https://neon.tech"
  );
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });
