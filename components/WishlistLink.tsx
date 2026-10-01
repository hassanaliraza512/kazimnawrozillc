"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { WISHLIST_CHANGE_EVENT, readWishlist } from '@/lib/wishlist';

export default function WishlistLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const syncCount = () => setCount(readWishlist().length);
    syncCount();
    window.addEventListener('storage', syncCount);
    window.addEventListener(WISHLIST_CHANGE_EVENT, syncCount);
    return () => {
      window.removeEventListener('storage', syncCount);
      window.removeEventListener(WISHLIST_CHANGE_EVENT, syncCount);
    };
  }, []);

  return (
    <Link href="/wishlist" aria-label={`Wishlist, ${count} saved ${count === 1 ? 'item' : 'items'}`} className="inline-flex items-center gap-2 text-sm hover:text-[var(--burgundy)]">
      <Heart size={18} strokeWidth={1.7} />
      <span className="hidden sm:inline">Wishlist</span>
      {count > 0 && <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--charcoal)] px-1.5 py-0.5 text-[10px] text-white">{count}</span>}
    </Link>
  );
}