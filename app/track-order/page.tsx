"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { Search, PackageCheck, Clock, Printer } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import SiteFooter from "@/components/SiteFooter";
import { getBalanceDue } from "@/lib/delivery";
const labels: any = {
  new: "New",
  confirmed: "Confirmed",
  processing: "Processing",
  ready: "Ready for delivery",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  refund_requested: "Refund requested",
};
const paymentLabels: Record<string, string> = {
  terms_pending: "Terms Pending",
  advance_pending: "Advance Pending",
  advance_received: "Advance Received",
  cod_pending: "COD Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};
export default function TrackOrderPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-12 text-center text-[var(--muted)]">Loading order status…</main>}>
      <TrackOrder />
    </Suspense>
  );
}

function TrackOrder() {
  const params = useSearchParams();
  const trackingToken = params.get("token") || "";
  const [order, setOrder] = useState<any>(null);
  const [orderNo, setOrderNo] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const o = params.get("order");
    const t = params.get("token");
    if (o && t) {
      setOrderNo(o);
      setLoading(true);
      fetch(
        `/api/orders/track?order=${encodeURIComponent(o)}&token=${encodeURIComponent(t)}`,
      )
        .then((r) => r.json())
        .then((d) => (d.error ? setError(d.error) : setOrder(d)))
        .finally(() => setLoading(false));
    }
  }, [params]);
  useEffect(() => {
    if (!order?.order_number) return;

    let active = true;
    async function refreshOrder() {
      const tokenMatchesOrder =
        trackingToken && params.get("order") === order.order_number;
      const credential = tokenMatchesOrder
        ? `token=${encodeURIComponent(trackingToken)}`
        : `email=${encodeURIComponent(order.customer_email || email)}`;
      const response = await fetch(
        `/api/orders/track?order=${encodeURIComponent(order.order_number)}&${credential}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      const updatedOrder = await response.json();
      if (active) setOrder(updatedOrder);
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshOrder();
    };
    const interval = window.setInterval(refreshOrder, 5000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [order?.order_number, order?.customer_email, email, params, trackingToken]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const r = await fetch(
        `/api/orders/track?order=${encodeURIComponent(orderNo)}&email=${encodeURIComponent(email)}`,
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Unable to find your order.");
      setOrder(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to find your order.");
    } finally {
      setLoading(false);
    }
  }
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
      <section className="mx-auto max-w-5xl px-6 py-14">
        <p className="text-xs uppercase tracking-[.25em] text-[var(--terracotta)]">
          Customer service
        </p>
        <h1 className="mt-2 font-serif text-5xl">Track your order</h1>
        <p className="mt-4 max-w-2xl leading-7 text-[var(--muted)]">
          Enter your order number and the email address used at checkout to view
          the latest status and delivery details.
        </p>
        <form
          onSubmit={submit}
          className="mt-9 grid gap-4 border border-[var(--line)] bg-[var(--ivory)] p-6 md:grid-cols-[1fr_1fr_auto]"
        >
          <input
            required
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            placeholder="Order number e.g. KN-2026-ABC123"
            className="border border-[var(--line)] bg-white px-4 py-3"
          />
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="border border-[var(--line)] bg-white px-4 py-3"
          />
          <button
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 bg-[var(--charcoal)] px-6 py-3 text-sm font-semibold text-white"
          >
            <Search size={16} />
            {loading ? "Checking…" : "Track order"}
          </button>
        </form>
        {error && (
          <div className="mt-5 border border-red-200 bg-red-50 p-4 text-sm">
            {error}
          </div>
        )}
        {order && (
          <div className="mt-10 grid gap-7 lg:grid-cols-[1fr_320px]">
            <div className="border border-[var(--line)] bg-white p-7">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-6">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
                    Order
                  </p>
                  <h2 className="mt-1 font-serif text-3xl">
                    {order.order_number}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Placed {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="border border-[var(--line)] px-3 py-2 text-xs uppercase tracking-wider">
                  {labels[order.order_status] || order.order_status}
                </span>
              </div>
              <div className="mt-7">
                <h3 className="font-serif text-2xl">Order progress</h3>
                <div className="mt-5 space-y-5">
                  {order.history.map((h: any, i: number) => (
                    <div key={i} className="flex gap-4">
                      <div className="mt-1">
                        <Clock size={17} />
                      </div>
                      <div>
                        <strong>{labels[h.status] || h.status}</strong>
                        <p className="text-xs text-[var(--muted)]">
                          {new Date(h.created_at).toLocaleString()}
                        </p>
                        {h.note && (
                          <p className="mt-1 text-sm text-[var(--muted)]">
                            {h.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-8 border-t border-[var(--line)] pt-7">
                <h3 className="font-serif text-2xl">Items</h3>
                {order.items.map((i: any) => (
                  <div
                    key={i.product_name}
                    className="flex justify-between border-b border-[var(--line)] py-4 text-sm"
                  >
                    <div>
                      <strong>{i.product_name}</strong>
                      <div className="text-xs text-[var(--muted)]">
                        Qty {i.quantity}
                      </div>
                    </div>
                    <span>${Number(i.line_total).toLocaleString()}</span>
                  </div>
                ))}
                <div className="mt-5 grid max-w-sm ml-auto gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Product total</span>
                    <span>${Number(order.subtotal).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Advance required before dispatch</span>
                    <span>
                      {order.delivery_method !== "local-pickup" && order.advance_percent == null
                        ? "Pending store confirmation"
                        : Number(order.delivery_fee)
                          ? `${Number(order.advance_percent)}% · $${Number(order.delivery_fee).toLocaleString()}`
                          : "Not required"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Delivery estimate</span>
                    <span className="text-right">{order.delivery_estimate || "Pending store confirmation"}</span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--line)] pt-3 text-lg font-semibold">
                    <span>{order.delivery_method === "local-pickup" ? "Balance due at pickup" : "Balance due on delivery"}</span>
                    <span>{order.delivery_method !== "local-pickup" && order.advance_percent == null ? "Confirmed by email" : `$${getBalanceDue(Number(order.subtotal), Number(order.delivery_fee || 0)).toLocaleString()}`}</span>
                  </div>
                </div>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={`/order/receipt?order=${encodeURIComponent(order.order_number)}&email=${encodeURIComponent(order.customer_email)}`}
                  className="inline-flex items-center gap-2 border px-4 py-3 text-sm"
                >
                  <Printer size={15} /> Receipt
                </Link>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 border px-4 py-3 text-sm"
                >
                  <Printer size={15} /> Print page
                </button>
                <Link href="/shop" className="border px-4 py-3 text-sm">
                  Continue shopping
                </Link>
              </div>
            </div>
            <aside className="h-fit border border-[var(--line)] bg-[var(--ivory)] p-7">
              <PackageCheck size={26} />
              <h3 className="mt-4 font-serif text-2xl">Delivery details</h3>
              <p className="mt-3 text-sm leading-6">
                Method:{" "}
                <strong>
                  {String(order.delivery_method).replaceAll("-", " ")}
                </strong>
              </p>
              <p className="mt-2 text-sm leading-6">
                Payment: <strong>{order.delivery_method === "local-pickup" ? "Pay on pickup" : "Advance before dispatch, balance on delivery"}</strong>
              </p>
              <p className="mt-2 text-sm leading-6">
                Payment status:{" "}
                <strong>
                  {paymentLabels[order.payment_status] || order.payment_status}
                </strong>
              </p>
            </aside>
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
