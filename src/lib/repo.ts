import "server-only";
import type { InStatement, Row } from "@libsql/client";
import { db } from "./db";
import type { AiUse, AppEvent, Application, EventAction, Role, Stage } from "./types";

const toEvent = (r: Row): AppEvent => ({
  id: Number(r.id),
  applicationId: String(r.application_id),
  at: String(r.at),
  actorName: String(r.actor_name),
  actorRole: r.actor_role as AppEvent["actorRole"],
  action: r.action as EventAction,
  fromStage: (r.from_stage as Stage) ?? null,
  toStage: (r.to_stage as Stage) ?? null,
  note: String(r.note ?? ""),
  aiUse: (r.ai_use as AiUse) ?? null,
});

export async function listApplications(): Promise<Application[]> {
  const c = await db();
  const { rows } = await c.execute("SELECT data FROM applications ORDER BY submitted_at");
  return rows.map((r) => JSON.parse(String(r.data)));
}

export async function getApplication(id: string): Promise<Application | null> {
  const c = await db();
  const { rows } = await c.execute({ sql: "SELECT data FROM applications WHERE id = ?", args: [id] });
  return rows[0] ? JSON.parse(String(rows[0].data)) : null;
}

export async function listEvents(applicationId?: string): Promise<AppEvent[]> {
  const c = await db();
  const { rows } = applicationId
    ? await c.execute({ sql: "SELECT * FROM events WHERE application_id = ? ORDER BY at, id", args: [applicationId] })
    : await c.execute("SELECT * FROM events ORDER BY at, id");
  return rows.map(toEvent);
}

export async function findUser(username: string) {
  const c = await db();
  const { rows } = await c.execute({ sql: "SELECT * FROM users WHERE username = ?", args: [username] });
  const r = rows[0];
  if (!r) return null;
  return {
    id: Number(r.id),
    username: String(r.username),
    passwordHash: String(r.password_hash),
    name: String(r.name),
    role: r.role as Role,
  };
}

export interface NewEvent {
  actorName: string;
  actorRole: AppEvent["actorRole"];
  action: EventAction;
  fromStage: Stage | null;
  toStage: Stage | null;
  note?: string;
  aiUse?: AiUse | null;
}

const eventStmt = (applicationId: string, at: string, e: NewEvent): InStatement => ({
  sql: `INSERT INTO events (application_id, at, actor_name, actor_role, action, from_stage, to_stage, note, ai_use)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  args: [applicationId, at, e.actorName, e.actorRole, e.action, e.fromStage, e.toStage, e.note ?? "", e.aiUse ?? null],
});

// Saves the new application state and its history entry atomically
export async function saveWithEvent(app: Application, event: NewEvent) {
  const c = await db();
  const at = new Date().toISOString();
  app.updatedAt = at;
  await c.batch(
    [
      {
        sql: "UPDATE applications SET stage = ?, updated_at = ?, data = ? WHERE id = ?",
        args: [app.stage, at, JSON.stringify(app), app.id],
      },
      eventStmt(app.id, at, event),
    ],
    "write",
  );
}

export async function logEvent(applicationId: string, event: NewEvent) {
  const c = await db();
  await c.execute(eventStmt(applicationId, new Date().toISOString(), event));
}
