import { query, queryOne } from '@/lib/postgres';
import { parseJson } from '@/lib/db';
import type { Product } from '@/lib/products';

export type DbProduct = Product & {
  id: number;
  category_id: number;
  created_at: string;
  updated_at: string;
};

function normalize(row: any): DbProduct {
  const images = parseJson<string[]>(row.images, []).filter(Boolean);

  return {
    ...row,
    id: Number(row.id),
    category_id: Number(row.category_id),
    category: row.category_name,
    price: Number(row.price),
    stock: Number(row.stock ?? 0),
    sold: Boolean(row.sold),
    new_arrival: Boolean(row.new_arrival),
    featured: Boolean(row.featured),
    images,
    image: row.image || images[0] || '',
    dimensions: row.dimensions || row.size || '',
    size: row.size || row.dimensions || '',
  };
}

const select = `
  SELECT
    p.*,
    c.name AS category_name,
    c.slug AS category_slug
  FROM products p
  JOIN categories c ON c.id = p.category_id
`;

export async function getDbProducts(): Promise<DbProduct[]> {
  const rows = await query(
    `${select}
     WHERE c.active = 1
     ORDER BY p.created_at DESC`
  );

  return rows.map(normalize);
}

export async function getDbProduct(
  slug: string
): Promise<DbProduct | null> {
  const row = await queryOne(
    `${select}
     WHERE p.slug = $1
       AND c.active = 1`,
    [slug]
  );

  return row ? normalize(row) : null;
}

export async function getCategories() {
  return query(
    `SELECT *
     FROM categories
     ORDER BY sort_order, name`
  );
}

export { normalize };