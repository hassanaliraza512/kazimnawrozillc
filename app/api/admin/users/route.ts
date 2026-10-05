import { NextResponse } from "next/server";
import { audit, parseJson } from "@/lib/db";
import { getSession, hashPassword, PERMISSIONS, type Permission } from "@/lib/auth";
import { execute, query, queryOne, withTransaction } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  const session = await getSession();
  return session?.role === "admin" ? session : null;
}

export async function GET() {
  if (!(await guard())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [users, logs] = await Promise.all([
    query(
      `SELECT id,username,permissions,active,last_login_at,created_at,updated_at
       FROM admin_users
       ORDER BY username`,
    ),
    query(
      `SELECT id,actor_type,actor_id,actor_username,action,entity_type,
              entity_id,details,created_at
       FROM audit_logs
       ORDER BY id DESC
       LIMIT 200`,
    ),
  ]);

  return NextResponse.json({
    users: users.map((user) => ({
      ...user,
      permissions: parseJson(user.permissions, [] as string[]),
    })),
    logs: logs.map((log) => ({
      ...log,
      details: parseJson(log.details, {} as Record<string, unknown>),
    })),
  });
}

export async function POST(request: Request) {
  const actor = await guard();
  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const permissions = (Array.isArray(body.permissions) ? body.permissions : [])
    .filter(
      (permission: unknown): permission is Permission =>
        typeof permission === "string" &&
        PERMISSIONS.includes(permission as Permission) &&
        permission !== "users",
    );

  if (username.length < 3) {
    return NextResponse.json(
      { error: "Username must be at least 3 characters." },
      { status: 400 },
    );
  }

  const id = Number(body.id) || 0;
  const now = new Date().toISOString();
  try {
    if (id) {
      const oldUser = await queryOne<{ username: string }>(
        "SELECT username FROM admin_users WHERE id=$1",
        [id],
      );
      if (!oldUser) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }
      if (password && password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters." },
          { status: 400 },
        );
      }

      if (password) {
        await execute(
          `UPDATE admin_users
           SET username=$1,password_hash=$2,permissions=$3,active=$4,updated_at=$5
           WHERE id=$6`,
          [
            username,
            hashPassword(password),
            JSON.stringify(permissions),
            body.active === false ? 0 : 1,
            now,
            id,
          ],
        );
      } else {
        await execute(
          `UPDATE admin_users
           SET username=$1,permissions=$2,active=$3,updated_at=$4
           WHERE id=$5`,
          [
            username,
            JSON.stringify(permissions),
            body.active === false ? 0 : 1,
            now,
            id,
          ],
        );
      }
      await audit(actor, "UPDATE_USER", "admin_user", id, {
        username,
        permissions,
        active: body.active !== false,
        passwordChanged: Boolean(password),
      });
    } else {
      if (password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters." },
          { status: 400 },
        );
      }

      const result = await queryOne<{ id: number }>(
        `INSERT INTO admin_users(username,password_hash,permissions,active)
         VALUES($1,$2,$3,1)
         RETURNING id`,
        [username, hashPassword(password), JSON.stringify(permissions)],
      );
      if (!result) {
        throw new Error("New user was not returned by the database.");
      }
      await audit(actor, "CREATE_USER", "admin_user", Number(result.id), {
        username,
        permissions,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to save user.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const actor = await guard();
  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const id = Number(body.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ error: "User ID is required." }, { status: 400 });
  }

  const action = String(body.action || "");
  const now = new Date().toISOString();
  try {
    const result = await withTransaction(async (client) => {
      const user = await client.query<{ id: number; username: string; active: number }>(
        "SELECT id,username,active FROM admin_users WHERE id=$1 FOR UPDATE",
        [id],
      );
      const existing = user.rows[0];
      if (!existing) {
        return null;
      }

      if (action === "toggle") {
        const active = existing.active ? 0 : 1;
        await client.query(
          "UPDATE admin_users SET active=$1,updated_at=$2 WHERE id=$3",
          [active, now, id],
        );
        await client.query(
          `INSERT INTO audit_logs(actor_type,actor_id,actor_username,action,entity_type,entity_id,details)
           VALUES('admin',$1,$2,$3,'admin_user',$1,$4)`,
          [
            actor.userId ?? null,
            actor.username,
            active ? "ENABLE_USER" : "DISABLE_USER",
            JSON.stringify({ username: existing.username, active: Boolean(active) }),
          ],
        );
        return { active };
      }

      if (action === "reset_password") {
        const password = String(body.password || "");
        if (password.length < 8) {
          return { error: "Temporary password must be at least 8 characters." };
        }
        await client.query(
          "UPDATE admin_users SET password_hash=$1,updated_at=$2 WHERE id=$3",
          [hashPassword(password), now, id],
        );
        await client.query(
          `INSERT INTO audit_logs(actor_type,actor_id,actor_username,action,entity_type,entity_id,details)
           VALUES('admin',$1,$2,'RESET_PASSWORD','admin_user',$3,$4)`,
          [
            actor.userId ?? null,
            actor.username,
            id,
            JSON.stringify({ username: existing.username }),
          ],
        );
        return { reset: true };
      }

      return { error: "Unknown action." };
    });

    if (!result) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update user." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const actor = await guard();
  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const id = Number(body.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ error: "User ID is required." }, { status: 400 });
  }

  const user = await queryOne<{ username: string }>(
    "SELECT username FROM admin_users WHERE id=$1",
    [id],
  );
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  await withTransaction(async (client) => {
    await client.query(
      "UPDATE admin_users SET active=0,updated_at=$1 WHERE id=$2",
      [new Date().toISOString(), id],
    );
    await client.query(
      `INSERT INTO audit_logs(actor_type,actor_id,actor_username,action,entity_type,entity_id,details)
       VALUES('admin',$1,$2,'DISABLE_USER','admin_user',$3,$4)`,
      [
        actor.userId ?? null,
        actor.username,
        id,
        JSON.stringify({ username: user.username }),
      ],
    );
  });

  return NextResponse.json({ ok: true });
}
