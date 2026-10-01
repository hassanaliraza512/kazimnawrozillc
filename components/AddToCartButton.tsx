"use client";
import { Check, ShoppingBag } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/products";
import { useCart } from "@/components/CartProvider";
export default function AddToCartButton({product}:{product:Product}){const {items,addItem}=useCart();const [added,setAdded]=useState(false);const current=items.find(i=>i.slug===product.slug)?.quantity??0;const stock=Number(product.stock??0);const disabled=Boolean(product.sold)||stock<=0||current>=stock;function handleAdd(){if(disabled)return;addItem(product);setAdded(true);window.setTimeout(()=>setAdded(false),1600)}return <button disabled={disabled} onClick={handleAdd} className="flex flex-1 items-center justify-center gap-2 bg-[var(--charcoal)] px-6 py-4 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-45">{disabled?(product.sold||stock<=0?'Sold':'Maximum available in bag'):added?<><Check size={17}/> Added to bag</>:<><ShoppingBag size={17}/> Add to bag</>}</button>}
