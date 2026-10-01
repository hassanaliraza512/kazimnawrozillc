"use client";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, Trash2, Truck } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import BrandLogo from "@/components/BrandLogo";
import SiteFooter from "@/components/SiteFooter";
import RelatedProductsSlider from "@/components/RelatedProductsSlider";

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-[var(--paper)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <BrandLogo href="/" compact className="shrink-0" />
          <Link href="/shop" className="text-sm">
            Continue shopping
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"
        >
          <ArrowLeft size={15} /> Back to collection
        </Link>
        <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_380px]">
          <div>
            <p className="text-sm uppercase tracking-[.22em] text-[var(--terracotta)]">
              Your selection
            </p>
            <h1 className="mt-2 text-5xl">Shopping bag</h1>
            {items.length === 0 ? (
              <div className="border-t border-[var(--line)] py-16">
                <p className="text-2xl">Your bag is empty.</p>
                <p className="mt-3 max-w-md leading-7 text-[var(--muted)]">
                  Explore the collection and add a piece that feels right for
                  your home.
                </p>
                <Link
                  href="/shop"
                  className="mt-7 inline-flex bg-[var(--charcoal)] px-6 py-3 text-sm font-semibold text-white"
                >
                  Explore rugs & kilims
                </Link>
              </div>
            ) : (
              <div className="mt-10 divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {items.map((item) => (
                  <div
                    key={item.slug}
                    className="grid gap-5 py-6 sm:grid-cols-[120px_1fr_auto] sm:items-center"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-32 w-28 object-cover"
                    />
                    <div>
                      <Link
                        href={`/products/${item.slug}`}
                        className="text-xl hover:underline"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {item.category} · {item.size}
                      </p>
                      <div className="mt-4 inline-flex items-center border border-[var(--line)]">
                        <button
                          onClick={() =>
                            updateQuantity(item.slug, item.quantity - 1)
                          }
                          className="p-2"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={15} />
                        </button>
                        <span className="w-8 text-center text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.slug, item.quantity + 1)
                          }
                          className="p-2"
                          aria-label="Increase quantity"
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-6 sm:block sm:text-right">
                      <div className="font-semibold">
                        ${(item.price * item.quantity).toLocaleString()}
                      </div>
                      <button
                        onClick={() => removeItem(item.slug)}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--charcoal)]"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <aside className="h-fit border border-[var(--line)] bg-[var(--ivory)] p-7">
            <h2 className="text-2xl">Order summary</h2>
            <div className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Subtotal</span>
                <span>${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Advance</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="border-t border-[var(--line)] pt-4">
                <div className="flex justify-between text-base font-semibold">
                  <span>Product total</span>
                  <span>${subtotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3 text-xs leading-5 text-[var(--muted)]">
              <Truck size={17} className="shrink-0" />
              <span>
                Choose Standard Delivery or Local Pickup at checkout.
              </span>
            </div>
            <Link
              href="/checkout"
              aria-disabled={!items.length}
              className={`mt-7 block w-full bg-[var(--charcoal)] px-6 py-4 text-center text-sm font-semibold text-white ${!items.length ? "pointer-events-none opacity-40" : ""}`}
            >
              Proceed to checkout
            </Link>
            <p className="mt-3 text-center text-xs text-[var(--muted)]">
              The store will email your payment method, any required advance,
              and delivery estimate after reviewing your order.
            </p>
          </aside>
        </div>
        {items.length > 0 && (
          <RelatedProductsSlider
            categories={[...new Set(items.map((item) => item.category))]}
            excludedSlugs={items.map((item) => item.slug)}
          />
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
