"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function SiteFooter() {
  const [brandName, setBrandName] = useState("Kazim Nawrozi LLC");

  useEffect(() => {
    let active = true;
    fetch("/api/site-content", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const content = await response.json();
        if (active && typeof content.brandName === "string") {
          setBrandName(content.brandName);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <footer className="bg-[var(--charcoal)] px-6 pb-8 pt-8 text-center text-xs text-white/60">
      <div className="mb-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-white/70">
        <Link href="/shop">Shop</Link>
        <Link href="/wishlist">Wishlist</Link>
        <Link href="/shipping">Shipping</Link>
        <Link href="/refund-policy">Refund Policy</Link>
        <Link href="/privacy-policy">Privacy Policy</Link>
        <Link href="/terms">Terms</Link>
      </div>
      <p className="mb-3 text-sm uppercase tracking-[.2em] text-white/80">Every Thread Tells a Story</p>
      <p>© {new Date().getFullYear()} {brandName}. All rights reserved.</p>
    </footer>
  );
}
