import { query } from "@/lib/postgres";

export function json(value: unknown) {
  return JSON.stringify(value ?? {});
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function audit(
  actor: {
    role?: string;
    userId?: number;
    username?: string;
  } | null,
  action: string,
  entityType: string,
  entityId: number | null = null,
  details: unknown = {},
) {
  await query(
    `INSERT INTO audit_logs (
      actor_type,
      actor_id,
      actor_username,
      action,
      entity_type,
      entity_id,
      details
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      actor?.role === "admin" ? "admin" : "staff",
      actor?.userId ?? null,
      actor?.username || "system",
      action,
      entityType,
      entityId,
      JSON.stringify(details ?? {}),
    ],
  );
}
