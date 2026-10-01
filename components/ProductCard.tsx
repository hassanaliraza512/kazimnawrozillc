import Link from 'next/link';
import InventoryStatus from '@/components/InventoryStatus';
import WishlistButton from '@/components/WishlistButton';
import type { Product } from '@/lib/products';
export default function ProductCard({product}:{product:Product}){
 const sold=Boolean(product.sold)||Number(product.stock??0)<=0;
 return <article className="group">
  <Link href={`/products/${product.slug}`}><div className="relative overflow-hidden bg-[var(--ivory)]">
    <img src={product.image||product.images?.[0]||'/product-images/placeholder.svg'} alt={product.name} className={`aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.03] ${sold?'opacity-55 grayscale':''}`}/>
    <img src="/logo.jpg" alt="" aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-[1] w-1/3 -translate-x-1/2 -translate-y-1/2 object-contain opacity-50 mix-blend-multiply" />
   <div className="absolute left-4 top-4 flex flex-wrap gap-2">{product.new_arrival&&<span className="bg-[var(--paper)] px-3 py-1 text-[10px] uppercase tracking-[.2em]">New Arrival</span>}{product.featured&&<span className="bg-[var(--paper)] px-3 py-1 text-[10px] uppercase tracking-[.2em]">Featured</span>}{!product.new_arrival&&!product.featured&&product.badge&&<span className="bg-[var(--paper)] px-3 py-1 text-[10px] uppercase tracking-[.2em]">{product.badge}</span>}</div>
   {sold&&<span className="absolute bottom-4 left-4 bg-[var(--burgundy)] px-3 py-1 text-[10px] uppercase tracking-[.2em] text-white">Sold</span>}
  </div></Link>
  <div className="flex items-start justify-between gap-4 pt-4"><div><Link href={`/products/${product.slug}`}><h3 className="font-serif text-xl">{product.name}</h3></Link><p className="mt-1 text-sm text-[var(--muted)]">{product.category} · {product.size}</p><div className="mt-3"><InventoryStatus stock={product.stock} sold={product.sold}/></div></div><div className="text-right"><p className="text-sm font-semibold">${Number(product.price).toLocaleString()}</p><WishlistButton productSlug={product.slug} size={18} className="mt-3 text-[var(--muted)] hover:text-[var(--burgundy)]"/></div></div>
 </article>;
}
