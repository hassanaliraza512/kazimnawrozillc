import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { audit } from "./db";
import { execute, queryOne } from "./postgres";

export const ADMIN_COOKIE = "kn_admin";
export const PERMISSIONS = [
  "store",
  "inventory",
  "orders",
  "categories",
  "analytics",
  "settings",
  "delivery",
  "policies",
  "users",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type Session = {
  username: string;
  role: "admin" | "manager";
  userId?: number;
  permissions: Permission[];
};

type AdminUser = {
  id: number;
  username: string;
  password_hash: string;
  permissions: string;
};

function configuredAdminUsername() {
  return (
    process.env.ADMIN_USERNAME?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    "admin@kazimnawrozi.com"
  );
}

function matchesConfiguredAdminUsername(username: string) {
  const configured = [
    process.env.ADMIN_USERNAME,
    process.env.ADMIN_EMAIL,
    "admin@kazimnawrozi.com",
  ]
    .map((value) => value?.trim().toLocaleLowerCase("en-US"))
    .filter((value): value is string => Boolean(value));

  return configured.includes(username.trim().toLocaleLowerCase("en-US"));
}

function configuredSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || "change-this-session-secret";
}

function envToken() {
  const password = process.env.ADMIN_PASSWORD || "change-this-password";
  return createHash("sha256")
    .update(
      `${configuredAdminUsername()}:${password}:${configuredSessionSecret()}`,
    )
    .digest("hex");
}

export function adminToken() {
  return `admin.${envToken()}`;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash, ...extra] = stored.split(":");
  if (
    extra.length > 0 ||
    !/^[\da-f]{32}$/i.test(salt || "") ||
    !/^[\da-f]{128}$/i.test(hash || "")
  ) {
    return false;
  }

  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return timingSafeEqual(actual, expected);
}

function userToken(user: AdminUser) {
  const signature = createHash("sha256")
    .update(
      `${user.id}:${user.password_hash}:${configuredSessionSecret()}`,
    )
    .digest("hex");
  return `user.${user.id}.${signature}`;
}

function userPermissions(value: string): Permission[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value || "[]");
  } catch {
    return [];
  }
  return Array.isArray(parsed)
    ? parsed.filter(
        (permission): permission is Permission =>
          typeof permission === "string" &&
          PERMISSIONS.includes(permission as Permission),
      )
    : [];
}

export async function authenticateUser(username: string, password: string) {
  const adminPassword = process.env.ADMIN_PASSWORD || "change-this-password";

  if (matchesConfiguredAdminUsername(username) && password === adminPassword) {
    return {
      token: adminToken(),
      session: {
        username: configuredAdminUsername(),
        role: "admin" as const,
        permissions: [...PERMISSIONS],
      },
    };
  }

  const user = await queryOne<AdminUser>(
    `SELECT id,username,password_hash,permissions
     FROM admin_users
     WHERE LOWER(username)=LOWER($1) AND active=1`,
    [username.trim()],
  );
  if (!user || !verifyPassword(password, user.password_hash)) {
    return null;
  }

  const now = new Date().toISOString();
  await execute(
    "UPDATE admin_users SET last_login_at=$1,updated_at=$1 WHERE id=$2",
    [now, user.id],
  );
  await audit(
    { role: "manager", userId: user.id, username: user.username },
    "LOGIN",
    "admin_user",
    user.id,
  );

  return {
    token: userToken(user),
    session: {
      username: user.username,
      role: "manager" as const,
      userId: user.id,
      permissions: userPermissions(user.permissions),
    },
  };
}

export async function getSession(): Promise<Session | null> {
  const cookieValue = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!cookieValue) {
    return null;
  }
  let token: string;
  try {
    token = decodeURIComponent(cookieValue);
  } catch {
    return null;
  }

  if (token === adminToken() || token === `admin:${envToken()}`) {
    return {
      username: configuredAdminUsername(),
      role: "admin",
      permissions: [...PERMISSIONS],
    };
  }
  if (!token.startsWith("user.") && !token.startsWith("user:")) {
    return null;
  }

  const separator = token.startsWith("user.") ? "." : ":";
  const [, id, signature] = token.split(separator);
  const userId = Number(id);
  if (
    !Number.isSafeInteger(userId) ||
    userId < 1 ||
    !/^[\da-f]{64}$/i.test(signature || "")
  ) {
    return null;
  }

  const user = await queryOne<AdminUser>(
    `SELECT id,username,password_hash,permissions
     FROM admin_users
     WHERE id=$1 AND active=1`,
    [userId],
  );
  if (!user) {
    return null;
  }
  const legacySignature = createHash("sha256")
    .update(`${user.id}:${user.password_hash}:${configuredSessionSecret()}`)
    .digest("hex");
  const legacyToken = `user:${userId}:${legacySignature}`;
  if (userToken(user) !== token && legacyToken !== token) {
    return null;
  }

  return {
    username: user.username,
    role: "manager",
    userId: user.id,
    permissions: userPermissions(user.permissions),
  };
}

export async function isAdmin() {
  return Boolean(await getSession());
}

export async function requirePermission(permission: Permission) {
  const session = await getSession();
  return session && session.permissions.includes(permission) ? session : null;
}
