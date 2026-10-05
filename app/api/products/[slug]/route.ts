import { NextResponse } from "next/server";
import { execute } from "@/lib/postgres";
import { getDbProduct } from "@/lib/db-products";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const product = await getDbProduct(slug);
  return product
    ? NextResponse.json(product, {
        headers: { "Cache-Control": "no-store" },
      })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  try {
    const result = await execute(
      "DELETE FROM products WHERE slug=$1",
      [slug],
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23503"
    ) {
      return NextResponse.json(
        { error: "Product cannot be deleted while it is referenced by an order." },
        { status: 409 },
      );
    }
    throw error;
  }
}
