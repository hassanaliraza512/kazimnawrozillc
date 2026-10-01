"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/products";

export default function RelatedProductsSlider({
  categories,
  excludedSlugs,
}: {
  categories: string[];
  excludedSlugs: string[];
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load related products.");
        return response.json();
      })
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const categorySet = new Set(categories.map((category) => category.trim().toLowerCase()));
  const excludedSet = new Set(excludedSlugs);
  const relatedProducts = products.filter(
    (product) =>
      categorySet.has((product.category || "").trim().toLowerCase()) &&
      !excludedSet.has(product.slug) &&
      !product.sold &&
      Number(product.stock ?? 0) > 0,
  );

  if (!categories.length || (!loading && !relatedProducts.length)) return null;

  const heading =
    categories.length === 1
      ? `More from ${categories[0]}`
      : "More from your categories";

  return (
    <section className="mt-14 border-t border-[var(--line)] pt-8" aria-label="Related products">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.22em] text-[var(--terracotta)]">
            Keep exploring
          </p>
          <h2 className="mt-2 font-serif text-3xl">{heading}</h2>
        </div>
        {relatedProducts.length > 4 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => sliderRef.current?.scrollBy({ left: -320, behavior: "smooth" })}
              className="border border-[var(--line)] p-2 hover:bg-[var(--ivory)]"
              aria-label="Scroll related products left"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => sliderRef.current?.scrollBy({ left: 320, behavior: "smooth" })}
              className="border border-[var(--line)] p-2 hover:bg-[var(--ivory)]"
              aria-label="Scroll related products right"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
      {loading ? (
        <p className="py-8 text-sm text-[var(--muted)]">Finding related pieces...</p>
      ) : (
        <div
          ref={sliderRef}
          className="mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4"
        >
          {relatedProducts.map((product) => (
            <div key={product.slug} className="w-[260px] shrink-0 snap-start md:w-[280px]">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}