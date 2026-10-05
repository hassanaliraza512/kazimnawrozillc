import { NextResponse } from "next/server";
import { execute, query } from "@/lib/postgres";
import { requirePermission } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    await query("SELECT * FROM categories ORDER BY sort_order, name"),
  );
}

export async function POST(request: Request) {
  if (!(await requirePermission("categories"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const name = String(body.name || "").trim();
  const slug = String(body.slug || name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!name || !slug) {
    return NextResponse.json(
      { error: "Category name is required." },
      { status: 400 },
    );
  }

  const values = [
    name,
    slug,
    String(body.description || ""),
    Number(body.sort_order) || 0,
    body.active === false ? 0 : 1,
    new Date().toISOString(),
  ];

  try {
    const id = Number(body.id) || 0;
    if (id) {
      await execute(
        `UPDATE categories
         SET name=$1,slug=$2,description=$3,sort_order=$4,active=$5,updated_at=$6
         WHERE id=$7`,
        [...values, id],
      );
    } else {
      await execute(
        `INSERT INTO categories(name,slug,description,sort_order,active,updated_at)
         VALUES($1,$2,$3,$4,$5,$6)`,
        values,
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to save category.",
      },
      { status: 400 },
    );
  }
}
