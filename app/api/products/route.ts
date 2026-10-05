import { NextResponse } from "next/server";
import { getDbProducts, normalize } from "@/lib/db-products";
import { requirePermission } from "@/lib/auth";
import { execute, queryOne } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getDbProducts(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!(await requirePermission("store"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const slug = String(body.slug || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const name = String(body.name || "").trim();
    const price = Number(body.price);
    if (!slug || !name || !Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { error: "Please provide a valid name, slug and price." },
        { status: 400 },
      );
    }

    let categoryId = Number(body.category_id) || 0;
    if (!categoryId) {
      const category = await queryOne<{ id: number }>(
        "SELECT id FROM categories WHERE name=$1 OR slug=$2",
        [String(body.category || ""), String(body.category || "").toLowerCase()],
      );
      categoryId = Number(category?.id || 0);
    }
    if (!categoryId) {
      return NextResponse.json(
        { error: "Please choose a valid category." },
        { status: 400 },
      );
    }

    const images = Array.isArray(body.images)
      ? body.images
          .map((image: unknown) => String(image).trim())
          .filter(Boolean)
          .slice(0, 20)
      : [];
    const image = String(body.image || "").trim() || images[0] || "";
    const stock = Math.max(0, Math.floor(Number(body.stock) || 0));
    const values = [
      slug,
      name,
      categoryId,
      Math.round(price * 100) / 100,
      String(body.size ?? body.dimensions ?? "").trim(),
      String(body.material || "").trim(),
      String(body.dimensions ?? body.size ?? "").trim(),
      String(body.origin || "").trim(),
      String(body.weaving_method || "").trim(),
      image,
      JSON.stringify(images),
      String(body.badge || ""),
      String(body.description || "").trim(),
      stock,
      body.sold ? 1 : 0,
      body.new_arrival ? 1 : 0,
      body.featured ? 1 : 0,
      new Date().toISOString(),
    ];

    const id = Number(body.id) || 0;
    if (id) {
      await execute(
        `UPDATE products
         SET slug=$1,name=$2,category_id=$3,price=$4,size=$5,material=$6,
             dimensions=$7,origin=$8,weaving_method=$9,image=$10,images=$11,
             badge=$12,description=$13,stock=$14,sold=$15,new_arrival=$16,
             featured=$17,updated_at=$18
         WHERE id=$19`,
        [...values, id],
      );
    } else {
      await execute(
        `INSERT INTO products(
          slug,name,category_id,price,size,material,dimensions,origin,
          weaving_method,image,images,badge,description,stock,sold,
          new_arrival,featured,updated_at
        )
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        values,
      );
    }

    const row = await queryOne(
      `SELECT p.*,c.name AS category_name,c.slug AS category_slug
       FROM products p
       JOIN categories c ON c.id=p.category_id
       WHERE p.slug=$1`,
      [slug],
    );
    if (!row) {
      throw new Error("Saved product could not be loaded.");
    }
    return NextResponse.json(normalize(row));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed." },
      { status: 400 },
    );
  }
}
