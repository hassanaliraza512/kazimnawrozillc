import AdminShell from "@/components/AdminShell";
import HomepageContentSettings from "@/components/HomepageContentSettings";
export default function Settings() {
  return (
    <AdminShell>
      <p className="text-xs uppercase tracking-[.25em] text-[var(--terracotta)]">
        Store configuration
      </p>
      <h1 className="mt-2 text-4xl">Settings</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Store, payment and policy settings for Kazim Nawrozi LLC.
      </p>
      <HomepageContentSettings />
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <section className="border border-[var(--line)] bg-white p-6">
          <h2 className="font-serif text-2xl">Store</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <Row a="Business" b="Kazim Nawrozi LLC" />
            <Row a="Tagline" b="Every Thread Tells a Story" />
            <Row a="Currency" b="USD" />
            <Row a="Market" b="United States" />
          </dl>
        </section>
        <section className="border border-[var(--line)] bg-white p-6">
          <h2 className="font-serif text-2xl">Customer policies</h2>
          <div className="mt-5 grid gap-3 text-sm">
            <a className="border p-3" href="/shipping">
              Shipping & Delivery →
            </a>
            <a className="border p-3" href="/refund-policy">
              Refund & Return Policy →
            </a>
            <a className="border p-3" href="/privacy-policy">
              Privacy Policy →
            </a>
            <a className="border p-3" href="/terms">
              Terms & Conditions →
            </a>
          </div>
        </section>
      </div>
      <div className="mt-5 border border-[var(--line)] bg-[var(--ivory)] p-6 text-sm leading-7">
        <strong>Architecture:</strong> Products, categories, orders and order
        items are stored in persistent PostgreSQL. Payments are{" "}
        <strong>Cash on Delivery</strong>; Stripe and PayPal are disabled.
        Product images uploaded from the admin panel are stored in{" "}
        <code>public/uploads/products</code>; use persistent object storage for
        production uploads on Vercel.
      </div>
    </AdminShell>
  );
}
function Row({ a, b }: { a: string; b: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-[var(--muted)]">
        {a}
      </dt>
      <dd className="mt-1">{b}</dd>
    </div>
  );
}
