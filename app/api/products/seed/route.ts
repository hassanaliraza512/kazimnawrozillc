import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/postgres";
import { products } from "@/lib/products";
import { requirePermission } from "@/lib/auth";

export async function POST() {
  if (!(await requirePermission("store"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await withTransaction(async (client) => {
    for (const product of products) {
      const category = await client.query<{ id: number }>(
        "SELECT id FROM categories WHERE name=$1",
        [product.category],
      );
      if (!category.rows[0]) {
        continue;
      }

      await client.query(
        `INSERT INTO products(
          slug,name,category_id,price,size,material,dimensions,origin,
          weaving_method,image,images,badge,description,stock,sold,
          new_arrival,featured,updated_at
        )
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        ON CONFLICT(slug) DO UPDATE SET
          name=EXCLUDED.name,
          category_id=EXCLUDED.category_id,
          price=EXCLUDED.price,
          size=EXCLUDED.size,
          material=EXCLUDED.material,
          dimensions=EXCLUDED.dimensions,
          origin=EXCLUDED.origin,
          weaving_method=EXCLUDED.weaving_method,
          image=EXCLUDED.image,
          images=EXCLUDED.images,
          badge=EXCLUDED.badge,
          description=EXCLUDED.description,
          stock=EXCLUDED.stock,
          sold=EXCLUDED.sold,
          new_arrival=EXCLUDED.new_arrival,
          featured=EXCLUDED.featured,
          updated_at=EXCLUDED.updated_at`,
        [
          product.slug,
          product.name,
          category.rows[0].id,
          product.price,
          product.size,
          product.material,
          product.dimensions || product.size,
          product.origin,
          product.weaving_method || "",
          product.image,
          JSON.stringify(product.images || [product.image]),
          product.badge || "",
          product.description,
          product.stock ?? 1,
          product.sold ? 1 : 0,
          product.new_arrival ? 1 : 0,
          product.featured ? 1 : 0,
          new Date().toISOString(),
        ],
      );
    }
  });

  return NextResponse.json({ ok: true, count: products.length });
}
