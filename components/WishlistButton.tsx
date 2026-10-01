"use client";

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { WISHLIST_CHANGE_EVENT, readWishlist, toggleWishlistProduct } from '@/lib/wishlist';

export default function WishlistButton({ productSlug, className = '', size = 20 }: { productSlug: string; className?: string; size?: number }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const syncSavedState = () => setSaved(readWishlist().includes(productSlug));
    syncSavedState();
    window.addEventListener('storage', syncSavedState);
    window.addEventListener(WISHLIST_CHANGE_EVENT, syncSavedState);
    return () => {
      window.removeEventListener('storage', syncSavedState);
      window.removeEventListener(WISHLIST_CHANGE_EVENT, syncSavedState);
    };
  }, [productSlug]);

  function toggleWishlist() {
    setSaved(toggleWishlistProduct(productSlug));
  }

  return (
    <button
      type="button"
      onClick={toggleWishlist}
      aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={saved}
      title={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      className={className}
    >
      <Heart size={size} fill={saved ? 'currentColor' : 'none'} strokeWidth={saved ? 2.5 : 1.8} />
    </button>
  );
}