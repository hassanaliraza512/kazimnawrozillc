import { Pool, type PoolClient } from 'pg';

const globalForPostgres = globalThis as unknown as {
  postgresPool?: Pool;
};

function createPool() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.KAZIM_NAWROZI_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.KAZIM_NAWROZI_POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.KAZIM_NAWROZI_DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (!connectionString) {
    throw new Error(
      "Set DATABASE_URL (or KAZIM_NAWROZI_DATABASE_URL) to your PostgreSQL connection string.",
    );
  }

  return new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

function getPostgresPool() {
  return (globalForPostgres.postgresPool ??= createPool());
}

export async function query<T = Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const result = await getPostgresPool().query(text, values);
  return result.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, values);
  return rows[0] ?? null;
}

export async function execute(
  text: string,
  values: unknown[] = [],
) {
  return getPostgresPool().query(text, values);
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPostgresPool().connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}