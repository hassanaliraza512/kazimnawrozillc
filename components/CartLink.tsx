"use client";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import WishlistLink from "@/components/WishlistLink";

export default function CartLink() {
  const { itemCount } = useCart();
  return (
    <div className="inline-flex items-center gap-5">
      <WishlistLink />
      <Link href="/cart" aria-label={`Shopping bag, ${itemCount} items`} className="relative inline-flex items-center gap-2 text-sm">
        <ShoppingBag size={18} strokeWidth={1.7} />
        <span className="hidden sm:inline">Bag</span>
        {itemCount > 0 && <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--charcoal)] px-1.5 py-0.5 text-[10px] text-white">{itemCount}</span>}
      </Link>
    </div>
  );
}
