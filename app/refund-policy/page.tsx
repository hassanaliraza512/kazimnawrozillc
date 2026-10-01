import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import SiteFooter from "@/components/SiteFooter";
export default function RefundPolicy() {
  return (
    <Policy title="Refund & Return Policy" eyebrow="Customer care">
      <p>
        We want you to feel confident purchasing a handmade piece. Because rugs
        and kilims are individually crafted, product appearance may include
        natural variations in color, texture and weave.
      </p>
      <h2>Returns</h2>
      <p>
        Contact Kazim Nawrozi LLC within 7 days of delivery if your item arrives
        damaged or materially different from its listing. Please keep the
        packaging and provide clear photos so we can review the issue.
      </p>
      <h2>Approved refunds</h2>
      <p>
        Approved refunds are handled after the returned item is received and
        inspected. Any advance paid is credited toward the product price and
        will be included in the approved refund calculation. The store will
        contact the customer to arrange the approved refund.
      </p>
      <h2>Custom and final-sale items</h2>
      <p>
        Custom orders, personalized pieces and items expressly marked final sale
        are not eligible for ordinary returns. Any exception will be confirmed
        in writing before purchase.
      </p>
      <h2>Questions</h2>
      <p>
        For a specific order, contact the store with your order number and
        delivery details.
      </p>
    </Policy>
  );
}
function Policy({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] px-6 py-5">
        <div className="mx-auto max-w-5xl">
          <BrandLogo href="/" compact className="shrink-0" />
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs uppercase tracking-[.25em] text-[var(--terracotta)]">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-5xl">{title}</h1>
        <div className="mt-10 space-y-5 leading-8 text-[var(--muted)]">
          {children}
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
