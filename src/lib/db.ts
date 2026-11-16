import "server-only";
import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { seed } from "./seed";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL
  )`,
  // Application body is a JSON document; stage/dates are columns for sorting and filtering
  `CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    stage TEXT NOT NULL,
    submitted_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    data TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id TEXT NOT NULL,
    at TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    from_stage TEXT,
    to_stage TEXT,
    note TEXT NOT NULL DEFAULT '',
    ai_use TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS events_app ON events(application_id, at)`,
];

let client: Client | null = null;
let ready: Promise<void> | null = null;

function connect(): Client {
  // Vercel's filesystem is read-only except /tmp, which is per instance and resets to the seed
  const fallback = process.env.VERCEL ? "file:/tmp/app.db" : "file:./data/app.db";
  const url = process.env.DATABASE_URL ?? fallback;
  if (url.startsWith("file:")) {
    mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });
  }
  return createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
}

async function init(c: Client) {
  await c.batch(SCHEMA, "write");
  const { rows } = await c.execute("SELECT COUNT(*) AS n FROM users");
  if (Number(rows[0].n) === 0) await seed(c);
}

export async function db(): Promise<Client> {
  client ??= connect();
  ready ??= init(client).catch((err) => {
    ready = null;
    throw err;
  });
  await ready;
  return client;
}
