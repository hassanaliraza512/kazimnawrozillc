import { NextResponse } from "next/server";
import { execute } from "@/lib/postgres";
import { requirePermission } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requirePermission("categories"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json(
      { error: "Choose a valid category." },
      { status: 400 },
    );
  }

  try {
    const result = await execute(
      "DELETE FROM categories WHERE id=$1",
      [id],
    );
    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Category not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Category cannot be deleted while products use it." },
      { status: 409 },
    );
  }
}
