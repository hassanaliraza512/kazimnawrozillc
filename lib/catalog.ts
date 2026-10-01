import fs from "node:fs";
import path from "node:path";
import type { Product } from "@/lib/products";

const filePath = path.join(process.cwd(), "data", "products.json");

function readCatalog(): Product[] {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Product[];
  } catch {
    return [];
  }
}

function writeCatalog(items: Product[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2) + "\n", "utf8");
}

export function listProducts() { return readCatalog(); }
export function findProduct(slug: string) { return readCatalog().find((p) => p.slug === slug); }
export function upsertProduct(product: Product) {
  const items = readCatalog();
  const index = items.findIndex((p) => p.slug === product.slug);
  if (index >= 0) items[index] = product; else items.push(product);
  writeCatalog(items);
  return product;
}
export function deleteProduct(slug: string) {
  const items = readCatalog();
  const next = items.filter((p) => p.slug !== slug);
  if (next.length === items.length) return false;
  writeCatalog(next);
  return true;
}
