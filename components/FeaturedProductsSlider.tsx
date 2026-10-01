"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/products";

export default function FeaturedProductsSlider({
  products,
  label = "featured products",
}: {
  products: Product[];
  label?: string;
}) {
  const sliderRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <div className="mb-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => sliderRef.current?.scrollBy({ left: -340, behavior: "smooth" })}
          className="border border-[var(--line)] p-2 hover:bg-[var(--paper)]"
          aria-label={`Scroll ${label} left`}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => sliderRef.current?.scrollBy({ left: 340, behavior: "smooth" })}
          className="border border-[var(--line)] p-2 hover:bg-[var(--paper)]"
          aria-label={`Scroll ${label} right`}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div
        ref={sliderRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-5"
      >
        {products.map((product) => (
          <div key={product.slug} className="w-[260px] shrink-0 snap-start md:w-[300px]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}