import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import SiteFooter from "@/components/SiteFooter";
export default function Terms() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] px-6 py-5">
        <div className="mx-auto max-w-5xl">
          <BrandLogo href="/" compact className="shrink-0" />
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs uppercase tracking-[.25em] text-[var(--terracotta)]">
          Customer policy
        </p>
        <h1 className="mt-3 text-5xl">Terms & Conditions</h1>
        <div className="mt-10 space-y-5 leading-8 text-[var(--muted)]">
          <p>
            Product availability, pricing and descriptions are subject to change
            until an order is accepted and payment is completed.
          </p>
          <h2>Product information</h2>
          <p>
            Handmade rugs may have natural variations that are part of their
            character. Customers should review dimensions, material, origin and
            description before purchase.
          </p>
          <h2>Orders</h2>
          <p>
            Submitting payment authorizes the store to process the order. An
            order may be cancelled or adjusted if an item becomes unavailable or
            a material listing error is discovered.
          </p>
          <h2>Delivery</h2>
          <p>
            Standard Delivery and Local Pickup are available at checkout.
            The store confirms payment requirements and delivery estimates
            after reviewing each order and emails those details to the customer.
            Any advance is credited toward the product total, with the remaining
            balance due on delivery. Pickup requires no advance.
          </p>
          <h2>Contact</h2>
          <p>
            Questions about an order or listing should be raised with Kazim
            Nawrozi LLC before purchase whenever possible.
          </p>
        </div>
        <Link
          href="/checkout"
          className="mt-10 inline-block border-b border-[var(--charcoal)] pb-2 text-sm font-semibold"
        >
          Back to checkout
        </Link>
      </article>
      <SiteFooter />
    </main>
  );
}
