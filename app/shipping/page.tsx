import Link from "next/link";
import { ArrowLeft, Truck, MapPin } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import SiteFooter from "@/components/SiteFooter";
import { deliveryMethods } from "@/lib/delivery";
const icons = {
  standard: Truck,
  "local-pickup": MapPin,
};
export default function ShippingPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <BrandLogo href="/" compact className="shrink-0" />
          <Link href="/shop" className="text-sm">
            Shop
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-6 py-12 md:py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"
        >
          <ArrowLeft size={15} /> Back home
        </Link>
        <p className="mt-10 text-xs uppercase tracking-[.25em] text-[var(--terracotta)]">
          Delivery
        </p>
        <h1 className="mt-3 text-5xl">Choose how your piece arrives.</h1>
        <p className="mt-5 max-w-2xl leading-8 text-[var(--muted)]">
          The store confirms payment requirements and delivery estimates after
          reviewing each order, then emails the details. Any advance is credited
          toward your product total; the remaining balance is due on delivery.
          Local Pickup requires no advance.
        </p>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {deliveryMethods.map((m) => {
            const Icon = icons[m.id];
            return (
              <div
                key={m.id}
                className="border border-[var(--line)] bg-[var(--ivory)] p-7"
              >
                <Icon size={24} />
                <h2 className="mt-5 font-serif text-2xl">{m.name}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">{m.detail}</p>
                <p className="mt-5 text-sm font-semibold">Advance and delivery estimates shown at checkout</p>
              </div>
            );
          })}
        </div>
        <Link
          href="/shop"
          className="mt-10 inline-flex bg-[var(--charcoal)] px-7 py-4 text-sm font-semibold text-white"
        >
          Explore the collection
        </Link>
      </section>
      <SiteFooter />
    </main>
  );
}
