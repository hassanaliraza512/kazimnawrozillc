import { getDb, parseJson } from '@/lib/db';
import type { Product } from '@/lib/products';
export type DbProduct = Product & { id:number; category_id:number; created_at:string; updated_at:string };
function normalize(row:any):DbProduct { return {...row, id:Number(row.id), category_id:Number(row.category_id), category:row.category_name, price:Number(row.price), stock:Number(row.stock??0), sold:Boolean(row.sold), new_arrival:Boolean(row.new_arrival), featured:Boolean(row.featured), images:parseJson<string[]>(row.images,[]).filter(Boolean), image:row.image||parseJson<string[]>(row.images,[])[0]||'', dimensions:row.dimensions||row.size||'', size:row.size||row.dimensions||''}; }
const select=`SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p JOIN categories c ON c.id=p.category_id`;
export function getDbProducts(){const rows=getDb().prepare(`${select} WHERE c.active=1 ORDER BY p.created_at DESC`).all();return rows.map(normalize)}
export function getDbProduct(slug:string){const row=getDb().prepare(`${select} WHERE p.slug=? AND c.active=1`).get(slug);return row?normalize(row):null}
export function getCategories(){return getDb().prepare(`SELECT * FROM categories ORDER BY sort_order,name`).all() as any[];}
export { normalize };
