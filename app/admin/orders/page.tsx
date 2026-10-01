"use client";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import Link from "next/link";
import { Search, Printer, ChevronRight, X, Trash2 } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { advancePercentageOptions, deliveryEstimateOptions, getBalanceDue } from "@/lib/delivery";

type O = {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  phone?: string;
  shipping_address: any;
  items: any[];
  subtotal: number;
  delivery_fee: number;
  advance_percent: number | null;
  delivery_estimate: string;
  total: number;
  payment_status: string;
  order_status: string;
  delivery_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};
function addressText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}
function formatAddress(value: unknown): string[] {
  let address = value;
  if (typeof address === "string") {
    const rawAddress = address;
    try {
      address = JSON.parse(rawAddress);
    } catch {
      return rawAddress.trim() ? [rawAddress.trim()] : [];
    }
  }
  if (!address || typeof address !== "object" || Array.isArray(address))
    return [];
  const fields = address as Record<string, unknown>;
  const street = [
    fields.address_line1 ?? fields.address,
    fields.address_line2 ?? fields.address2,
  ]
    .map(addressText)
    .filter(Boolean);
  const locality = [fields.city, fields.state]
    .map(addressText)
    .filter(Boolean)
    .join(", ");
  const cityLine = [locality, addressText(fields.zip ?? fields.postal_code)]
    .filter(Boolean)
    .join(" ");
  return [...street, cityLine, addressText(fields.country)].filter(Boolean);
}
const statuses = [
  "all",
  "new",
  "confirmed",
  "processing",
  "ready",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
  "refund_requested",
];
const payments = [
  "all",
  "terms_pending",
  "advance_pending",
  "advance_received",
  "cod_pending",
  "paid",
  "failed",
  "refunded",
];
const paymentLabels: Record<string, string> = {
  terms_pending: "Terms Pending",
  advance_pending: "Advance Pending",
  advance_received: "Advance Received",
  cod_pending: "COD Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};
export default function Orders() {
  const [orders, setOrders] = useState<O[]>([]),
    [loading, setLoading] = useState(true),
    [selected, setSelected] = useState<O | null>(null),
    [q, setQ] = useState(""),
    [status, setStatus] = useState("all"),
    [payment, setPayment] = useState("all"),
    [msg, setMsg] = useState(""),
    [notes, setNotes] = useState(""),
    [advancePercent, setAdvancePercent] = useState(""),
    [deliveryEstimate, setDeliveryEstimate] = useState(""),
    [customDeliveryEstimate, setCustomDeliveryEstimate] = useState(""),
    [savingTerms, setSavingTerms] = useState(false);
  async function load(): Promise<O[]> {
    setLoading(true);
    const r = await fetch("/api/admin/orders", { cache: "no-store" });
    const d = await r.json();
    const loadedOrders = Array.isArray(d) ? d : [];
    setOrders(loadedOrders);
    setLoading(false);
    return loadedOrders;
  }
  useEffect(() => {
    load();
  }, []);
  const filtered = useMemo(
    () =>
      orders.filter(
        (o) =>
          (status === "all" || o.order_status === status) &&
          (payment === "all" || o.payment_status === payment) &&
          `${o.order_number} ${o.customer_name} ${o.customer_email} ${o.phone || ""}`
            .toLowerCase()
            .includes(q.toLowerCase()),
      ),
    [orders, status, payment, q],
  );
  async function update(id: number, field: string, value: string) {
    const r = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value }),
    });
    const data = await r.json();
    setMsg(
      !r.ok
        ? data.error || "Could not update order."
        : data.emailSent
          ? "Order updated and customer emailed."
          : data.emailError
            ? `Order updated, but customer email failed: ${data.emailError}`
            : "Order updated.",
    );
    if (r.ok) {
      const loadedOrders = await load();
      const fresh = loadedOrders.find((x) => x.id === id);
      if (fresh) setSelected({ ...fresh, [field]: value } as O);
    }
  }
  async function moveToTrash(order: O) {
    if (!window.confirm(`Move order ${order.order_number} to Trash? You can restore it later.`)) return;
    const response = await fetch("/api/admin/orders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: order.id }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMsg(data.error || "Order could not be moved to trash.");
      return;
    }
    if (selected?.id === order.id) setSelected(null);
    await load();
    setMsg(`Order ${order.order_number} moved to Trash. Restore it from Admin → Trash.`);
  }
  function open(o: O) {
    setSelected(o);
    setNotes(o.notes || "");
    setAdvancePercent(o.advance_percent == null ? "" : String(o.advance_percent));
    if (o.delivery_estimate && !deliveryEstimateOptions.includes(o.delivery_estimate as typeof deliveryEstimateOptions[number])) {
      setDeliveryEstimate("Custom");
      setCustomDeliveryEstimate(o.delivery_estimate);
    } else {
      setDeliveryEstimate(o.delivery_estimate || "");
      setCustomDeliveryEstimate("");
    }
    setMsg("");
  }
  async function saveTerms() {
    if (!selected || advancePercent === "" || !deliveryEstimate || (deliveryEstimate === "Custom" && !customDeliveryEstimate.trim())) return;
    setSavingTerms(true);
    setMsg("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          advancePercent: Number(advancePercent),
          deliveryEstimate,
          customDeliveryEstimate,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Order terms could not be saved.");
      const loadedOrders = await load();
      const fresh = loadedOrders.find((order) => order.id === selected.id);
      if (fresh) setSelected(fresh);
      setMsg(data.emailSent
        ? "Order terms saved and emailed to the customer."
        : data.emailError
          ? `Terms saved, but the email was not sent: ${data.emailError}`
          : "Order terms saved; no customer email was needed.");
    } catch (saveError) {
      setMsg(saveError instanceof Error ? saveError.message : "Order terms could not be saved.");
    } finally {
      setSavingTerms(false);
    }
  }
  async function saveNotes() {
    if (!selected) return;
    const r = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, notes }),
    });
    setMsg(r.ok ? "Notes saved." : "Could not save notes.");
    if (r.ok) {
      setSelected({ ...selected, notes });
      load();
    }
  }
  return (
    <AdminShell>
      <div>
        <p className="text-xs uppercase tracking-[.25em] text-[var(--terracotta)]">
          Commerce
        </p>
        <h1 className="mt-2 text-4xl">Order Management</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Manage COD orders, delivery, inventory, payments and fulfillment from
          one place.
        </p>
      </div>
      <div className="mt-7 grid gap-3 md:grid-cols-[1fr_190px_190px]">
        <label className="flex items-center gap-2 border border-[var(--line)] bg-white px-3">
          <Search size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search order, customer, email…"
            className="w-full bg-transparent py-3 text-sm outline-none"
          />
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-[var(--line)] bg-white px-3 py-3 text-sm"
        >
          {statuses.map((x) => (
            <option key={x} value={x}>
              {x === "all" ? "All order statuses" : x.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select
          value={payment}
          onChange={(e) => setPayment(e.target.value)}
          className="border border-[var(--line)] bg-white px-3 py-3 text-sm"
        >
          {payments.map((x) => (
            <option key={x} value={x}>
              {x === "all" ? "All payment statuses" : paymentLabels[x]}
            </option>
          ))}
        </select>
      </div>
      {msg && <div className="mt-4 bg-[var(--ivory)] p-4 text-sm">{msg}</div>}
      {loading ? (
        <p className="py-12 text-[var(--muted)]">Loading orders…</p>
      ) : filtered.length === 0 ? (
        <div className="mt-8 border border-dashed border-[var(--line)] p-10 text-center">
          <h2 className="font-serif text-2xl">No matching orders</h2>
        </div>
      ) : (
        <div className="mt-7 overflow-x-auto border border-[var(--line)]">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="bg-[var(--ivory)] text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4">Order</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Product total</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Fulfillment</th>
                <th className="p-4">Date</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-[var(--line)]">
                  <td className="p-4 font-semibold">
                    {o.order_number}
                    <div className="mt-1 text-xs font-normal text-[var(--muted)]">
                      {o.items.length} item{o.items.length === 1 ? "" : "s"}
                    </div>
                  </td>
                  <td className="p-4">
                    <div>{o.customer_name}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {o.customer_email}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      {o.phone || ""}
                    </div>
                  </td>
                  <td className="p-4">${Number(o.subtotal).toLocaleString()}</td>
                  <td className="p-4">
                    <select
                      value={o.payment_status}
                      onChange={(e) =>
                        update(o.id, "payment_status", e.target.value)
                      }
                      className="border px-2 py-2"
                    >
                      <option value="terms_pending">Terms Pending</option>
                      <option value="advance_pending">Advance Pending</option>
                      <option value="advance_received">Advance Received</option>
                      <option value="cod_pending">COD Pending</option>
                      <option value="paid">Paid</option>
                      <option value="refunded">Refunded</option>
                      <option value="failed">Failed</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <select
                      value={o.order_status}
                      onChange={(e) => update(o.id, "order_status", e.target.value)}
                      className="border px-2 py-2"
                    >
                      <option value="new">New</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="ready">Ready</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="returned">Returned</option>
                      <option value="refund_requested">Refund Requested</option>
                    </select>
                  </td>
                  <td className="p-4">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => open(o)}
                        className="inline-flex items-center gap-1 border px-3 py-2"
                      >
                        Details <ChevronRight size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveToTrash(o)}
                        aria-label={`Move order ${o.order_number} to trash`}
                        title="Move to trash"
                        className="inline-flex h-10 w-10 items-center justify-center border border-red-200 text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/40 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="mx-auto mt-4 max-h-[92vh] max-w-4xl overflow-y-auto bg-[var(--paper)] p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <BrandLogo href="/admin" compact className="mb-3" />
                <p className="text-xs uppercase tracking-[.2em] text-[var(--terracotta)]">
                  Order
                </p>
                <h2 className="font-serif text-3xl">{selected.order_number}</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Created {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/admin/orders/${selected.id}`}
                  className="border px-3 py-2 text-sm"
                >
                  Open full order
                </Link>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 border px-3 py-2 text-sm"
                >
                  <Printer size={15} /> Print
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="border px-3 py-2"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
            <div className="mt-7 grid gap-5 md:grid-cols-3 text-sm">
              <Info a="Customer" b={selected.customer_name} />
              <Info a="Email" b={selected.customer_email} />
              <Info a="Phone" b={selected.phone || "Not provided"} />
              <Info
                a="Delivery"
                b={selected.delivery_method || "Not specified"}
              />
              <Info
                a="Payment"
                b={paymentLabels[selected.payment_status] || selected.payment_status}
              />
              <Info a="Status" b={selected.order_status} />
            </div>
            <div className="mt-8">
              <h3 className="font-serif text-xl">Items</h3>
              <div className="mt-3 divide-y border border-[var(--line)]">
                {selected.items.map((i) => (
                  <div
                    key={i.id}
                    className="flex justify-between gap-4 p-4 text-sm"
                  >
                    <div>
                      <strong>{i.product_name}</strong>
                      <div className="text-xs text-[var(--muted)]">
                        Qty {i.quantity} · $
                        {Number(i.unit_price).toLocaleString()} each
                      </div>
                    </div>
                    <strong>${Number(i.line_total).toLocaleString()}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-7 grid gap-3 border-t border-[var(--line)] pt-5 text-sm md:max-w-sm md:ml-auto">
              <Info
                a="Product total"
                b={`$${Number(selected.subtotal).toLocaleString()}`}
              />
              <Info
                a="Advance required before dispatch"
                b={
                  selected.delivery_method !== "local-pickup" && selected.advance_percent == null
                    ? "Pending admin confirmation"
                    : Number(selected.delivery_fee)
                      ? `${Number(selected.advance_percent)}% · $${Number(selected.delivery_fee).toLocaleString()}`
                      : "No advance required"
                }
              />
              <Info a="Delivery estimate" b={selected.delivery_estimate || "Pending admin confirmation"} />
              <Info
                a={selected.delivery_method === "local-pickup" ? "Balance due at pickup" : "Balance due on delivery"}
                b={selected.delivery_method !== "local-pickup" && selected.advance_percent == null ? "Confirmed by email" : `$${getBalanceDue(Number(selected.subtotal), Number(selected.delivery_fee || 0)).toLocaleString()}`}
              />
            </div>
            <section className="mt-8 border border-[var(--line)] bg-white p-5">
              <h3 className="font-serif text-xl">Payment &amp; delivery instructions</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Choose the advance and delivery estimate for this order. Saving emails the customer with these terms and the store bank details.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span>Required advance</span>
                  <select
                    value={advancePercent}
                    onChange={(event) => setAdvancePercent(event.target.value)}
                    disabled={selected.delivery_method === "local-pickup"}
                    className="border border-[var(--line)] bg-[var(--paper)] px-3 py-3 disabled:opacity-60"
                  >
                    <option value="">Select advance</option>
                    <option value="0">No advance</option>
                    {advancePercentageOptions.map((percentage) => (
                      <option key={percentage} value={percentage}>{percentage}%</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm">
                  <span>Delivery estimate</span>
                  <select
                    value={deliveryEstimate}
                    onChange={(event) => {
                      setDeliveryEstimate(event.target.value);
                      if (event.target.value !== "Custom") setCustomDeliveryEstimate("");
                    }}
                    className="border border-[var(--line)] bg-[var(--paper)] px-3 py-3"
                  >
                    <option value="">Select delivery estimate</option>
                    {deliveryEstimateOptions.map((estimate) => (
                      <option key={estimate} value={estimate}>{estimate}</option>
                    ))}
                  </select>
                </label>
              </div>
              {deliveryEstimate === "Custom" && (
                <label className="mt-4 grid max-w-xl gap-2 text-sm">
                  <span>Custom delivery time</span>
                  <input
                    required
                    maxLength={120}
                    value={customDeliveryEstimate}
                    onChange={(event) => setCustomDeliveryEstimate(event.target.value)}
                    placeholder="e.g. Delivery scheduled for October 18"
                    className="border border-[var(--line)] bg-[var(--paper)] px-3 py-3"
                  />
                </label>
              )}
              {advancePercent !== "" && Number(advancePercent) > 0 && (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  Advance to request: ${((Number(selected.subtotal) * Number(advancePercent)) / 100).toLocaleString()}
                </p>
              )}
              {msg && <p role="status" className="mt-3 text-sm text-[var(--muted)]">{msg}</p>}
              <button
                type="button"
                onClick={saveTerms}
                disabled={savingTerms || advancePercent === "" || !deliveryEstimate || (deliveryEstimate === "Custom" && !customDeliveryEstimate.trim())}
                className="mt-4 bg-[var(--charcoal)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingTerms ? "Saving and sending..." : "Save terms & notify customer"}
              </button>
            </section>
            <div className="mt-8">
              <h3 className="font-serif text-xl">Delivery address</h3>
              <address className="mt-3 bg-[var(--ivory)] p-4 text-sm leading-6 not-italic">
                {formatAddress(selected.shipping_address).length ? (
                  formatAddress(selected.shipping_address).map(
                    (line, index) => (
                      <span key={index} className="block">
                        {line}
                      </span>
                    ),
                  )
                ) : (
                  <span>Address not provided</span>
                )}
              </address>
              <p className="mt-3 text-sm">
                <span className="text-[var(--muted)]">Delivery method</span>
                <br />
                <strong>
                  {selected.delivery_method
                    ? selected.delivery_method
                        .replaceAll("_", " ")
                        .replace(/\b\w/g, (char) => char.toUpperCase())
                    : "Not specified"}
                </strong>
              </p>
            </div>
            <div className="mt-8">
              <h3 className="font-serif text-xl">Internal notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="mt-3 w-full border border-[var(--line)] bg-white p-3 text-sm"
                placeholder="Staff-only notes about delivery, calls, payment or return..."
              />
              <button
                onClick={saveNotes}
                className="mt-3 bg-[var(--charcoal)] px-5 py-3 text-sm text-white"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
function Info({ a, b }: { a: string; b: string }) {
  return (
    <div>
      <span className="text-xs uppercase tracking-wider text-[var(--muted)]">
        {a}
      </span>
      <div className="mt-1 font-medium">{b}</div>
    </div>
  );
}
