"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Printer } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import SiteFooter from "@/components/SiteFooter";
import { getBalanceDue } from "@/lib/delivery";
const paymentLabels: Record<string, string> = {
  terms_pending: "Terms Pending",
  advance_pending: "Advance Pending",
  advance_received: "Advance Received",
  cod_pending: "COD Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};
export default function ReceiptPage() {
  return (
    <Suspense fallback={<main className="p-12 text-center text-[var(--muted)]">Loading receipt…</main>}>
      <Receipt />
    </Suspense>
  );
}

function Receipt() {
  const p = useSearchParams();
  const order = p.get("order") || "";
  const email = p.get("email") || "";
  const [o, setO] = useState<any>(null);
  const [e, setE] = useState("");
  useEffect(() => {
    if (!order || !email) return;
    fetch(
      `/api/orders/track?order=${encodeURIComponent(order)}&email=${encodeURIComponent(email)}`,
    )
      .then((r) => r.json())
      .then((d) => (d.error ? setE(d.error) : setO(d)));
  }, [order, email]);
  if (e)
    return (
      <main className="p-12 text-center">
        {e}
        <div>
          <Link href="/track-order">Track another order</Link>
        </div>
      </main>
    );
  if (!o) return <main className="p-12 text-center">Loading receipt…</main>;
  return (
    <main className="min-h-screen bg-[var(--paper)] p-5 md:p-10">
      <div className="no-print mx-auto mb-5 flex max-w-4xl justify-end gap-3">
        <Link href="/track-order" className="border px-4 py-3 text-sm">
          Back
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-[var(--charcoal)] px-4 py-3 text-sm text-white"
        >
          <Printer size={15} /> Print
        </button>
      </div>
      <article className="mx-auto max-w-4xl bg-white p-8 shadow-sm md:p-12">
        <header className="flex justify-between border-b border-[var(--line)] pb-7">
          <div>
            <BrandLogo href="/" className="mb-3" />
            <h1 className="mt-2 font-serif text-4xl">Order Receipt</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Every Thread Tells a Story.
            </p>
          </div>
          <div className="text-right text-sm">
            <strong>{o.order_number}</strong>
            <p className="mt-1">{new Date(o.created_at).toLocaleString()}</p>
          </div>
        </header>
        <div className="grid gap-7 py-7 md:grid-cols-2 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
              Customer
            </p>
            <p className="mt-2 font-semibold">{o.customer_name}</p>
            <p>{o.customer_email}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
              Payment
            </p>
            <p className="mt-2">{o.delivery_method === "local-pickup" ? "Pay on pickup" : "Advance before dispatch, balance on delivery"}</p>
            <p>Status: {paymentLabels[o.payment_status] || o.payment_status}</p>
          </div>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-[var(--line)] text-left">
              <th className="py-3">Product</th>
              <th className="py-3">Qty</th>
              <th className="py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i: any) => (
              <tr
                key={i.product_name}
                className="border-b border-[var(--line)]"
              >
                <td className="py-4">{i.product_name}</td>
                <td className="py-4">{i.quantity}</td>
                <td className="py-4 text-right">
                  ${Number(i.line_total).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ml-auto mt-7 max-w-sm space-y-3 text-sm">
          <div className="flex justify-between">
            <span>Product total</span>
            <span>${Number(o.subtotal).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Advance required before dispatch</span>
            <span>
              {o.delivery_method !== "local-pickup" && o.advance_percent == null
                ? "Pending store confirmation"
                : Number(o.delivery_fee)
                  ? `${Number(o.advance_percent)}% · $${Number(o.delivery_fee).toLocaleString()}`
                  : "Not required"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Delivery estimate</span>
            <span className="text-right">{o.delivery_estimate || "Pending store confirmation"}</span>
          </div>
          <div className="flex justify-between border-t border-[var(--line)] pt-4 text-lg font-semibold">
            <span>{o.delivery_method === "local-pickup" ? "Balance due at pickup" : "Balance due on delivery"}</span>
            <span>{o.delivery_method !== "local-pickup" && o.advance_percent == null ? "Confirmed by email" : `$${getBalanceDue(Number(o.subtotal), Number(o.delivery_fee || 0)).toLocaleString()}`}</span>
          </div>
        </div>
        <footer className="mt-12 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)]">
          Thank you for choosing Kazim Nawrozi LLC.
        </footer>
      </article>
      <SiteFooter />
    </main>
  );
}
