"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import CartLink from '@/components/CartLink';
import ProductCard from '@/components/ProductCard';
import SiteFooter from '@/components/SiteFooter';
import { WISHLIST_CHANGE_EVENT, readWishlist } from '@/lib/wishlist';
import type { Product } from '@/lib/products';

export default function WishlistPage() {
  const [savedSlugs, setSavedSlugs] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const syncWishlist = () => setSavedSlugs(readWishlist());
    syncWishlist();
    window.addEventListener('storage', syncWishlist);
    window.addEventListener(WISHLIST_CHANGE_EVENT, syncWishlist);

    fetch('/api/products', { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error('Unable to load products.');
        return response.json();
      })
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setError('Your wishlist could not be loaded. Please try again.'))
      .finally(() => setLoading(false));

    return () => {
      window.removeEventListener('storage', syncWishlist);
      window.removeEventListener(WISHLIST_CHANGE_EVENT, syncWishlist);
    };
  }, []);

  const savedProducts = savedSlugs
    .map(slug => products.find(product => product.slug === slug))
    .filter((product): product is Product => Boolean(product));

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-[var(--line)] bg-[var(--paper)]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
          <BrandLogo href="/" compact className="shrink-0" />
          <div className="flex items-center gap-6">
            <Link href="/shop" className="hidden text-sm sm:block">Shop</Link>
            <CartLink />
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl flex-1 px-6 py-14 md:py-20">
        <p className="text-sm uppercase tracking-[.22em] text-[var(--terracotta)]">Saved pieces</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-7">
          <div>
            <h1 className="font-serif text-4xl md:text-5xl">Your Wishlist</h1>
            <p className="mt-3 text-sm text-[var(--muted)]">{savedProducts.length} {savedProducts.length === 1 ? 'piece' : 'pieces'} saved</p>
          </div>
          <Link href="/shop" className="border border-[var(--charcoal)] px-5 py-3 text-sm">Continue shopping</Link>
        </div>

        {loading ? (
          <p className="py-12 text-sm text-[var(--muted)]">Loading your wishlist...</p>
        ) : error ? (
          <p role="alert" className="py-12 text-sm text-[var(--burgundy)]">{error}</p>
        ) : savedProducts.length ? (
          <div className="grid gap-x-6 gap-y-12 py-10 sm:grid-cols-2 lg:grid-cols-3">
            {savedProducts.map(product => <ProductCard key={product.slug} product={product} />)}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="font-serif text-2xl">Nothing saved just yet</p>
            <p className="mt-3 text-sm text-[var(--muted)]">Tap the heart on a piece to keep it here.</p>
            <Link href="/shop" className="mt-7 inline-flex bg-[var(--charcoal)] px-6 py-3 text-sm text-white">Explore rugs & kilims</Link>
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}