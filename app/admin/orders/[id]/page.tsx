"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import BrandLogo from "@/components/BrandLogo";
import { Printer } from "lucide-react";
import { getBalanceDue } from "@/lib/delivery";
function getAddressLines(value: unknown): string[] {
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
  const streetLines = [
    fields.address_line1 ?? fields.address,
    fields.address_line2 ?? fields.address2,
  ]
    .filter(
      (line): line is string =>
        typeof line === "string" && Boolean(line.trim()),
    )
    .map((line) => line.trim());
  const locality = [fields.city, fields.state]
    .filter(
      (part): part is string =>
        typeof part === "string" && Boolean(part.trim()),
    )
    .map((part) => part.trim())
    .join(", ");
  const cityLine = [locality, fields.zip ?? fields.postal_code]
    .filter(
      (part): part is string =>
        typeof part === "string" && Boolean(part.trim()),
    )
    .join(" ");
  const country =
    typeof fields.country === "string" ? fields.country.trim() : "";

  return [...streetLines, cityLine, country].filter(Boolean);
}

function formatLabel(value: string) {
  const label = value.replace(/[_-]+/g, " ").trim();
  return label ? label[0].toUpperCase() + label.slice(1) : "Not specified";
}

function formatPaymentStatus(value: string) {
  const labels: Record<string, string> = {
    terms_pending: "Terms Pending",
    advance_pending: "Advance Pending",
    advance_received: "Advance Received",
    cod_pending: "COD Pending",
    paid: "Paid",
    failed: "Failed",
    refunded: "Refunded",
  };
  return labels[value] || formatLabel(value);
}

export default function OrderInvoice() {
  const params = useParams();
  const [id] = useState(String(params.id || ""));
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/orders", { cache: "no-store" })
      .then((response) => response.json())
      .then((orders) =>
        setOrder((orders || []).find((item: any) => String(item.id) === id)),
      );
  }, [id]);

  if (!order)
    return (
      <AdminShell>
        <p>Loading order...</p>
      </AdminShell>
    );

  const addressLines = getAddressLines(order.shipping_address);

  return (
    <AdminShell>
      <div className="invoice-print-page mx-auto max-w-4xl">
        <div className="no-print flex justify-end">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-[var(--charcoal)] px-5 py-3 text-sm text-white"
          >
            <Printer size={15} /> Print invoice
          </button>
        </div>
        <article className="invoice-article mt-5 bg-white p-8 shadow-sm print:shadow-none md:p-12">
          <header className="invoice-header flex flex-col justify-between gap-6 border-b border-[var(--line)] pb-7 md:flex-row">
            <div>
              <BrandLogo href="/admin" className="mb-3" />
              <p className="mt-2 text-sm text-[var(--muted)]">
                Every Thread Tells a Story.
              </p>
            </div>
            <div className="text-sm md:text-right">
              <strong>{order.order_number}</strong>
              <p className="mt-1">
                {new Date(order.created_at).toLocaleString()}
              </p>
              <p className="mt-1 uppercase">{order.order_status}</p>
            </div>
          </header>

          <div className="grid gap-8 py-7 md:grid-cols-2">
            <section>
              <h2 className="text-xs uppercase tracking-wider text-[var(--muted)]">
                Customer information
              </h2>
              <p className="mt-2 font-semibold">{order.customer_name}</p>
              <p>{order.customer_email}</p>
              <p>{order.phone}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                WhatsApp updates: {Number(order.whatsapp_opt_in) ? "Opted in" : "Not opted in"}
              </p>
            </section>
            <section>
              <h2 className="text-xs uppercase tracking-wider text-[var(--muted)]">
                Delivery information
              </h2>
              <address className="mt-2 space-y-1 text-sm leading-6 not-italic">
                {addressLines.length ? (
                  addressLines.map((line, index) => (
                    <span key={index} className="block">
                      {line}
                    </span>
                  ))
                ) : (
                  <span>Address not provided</span>
                )}
              </address>
              <p className="mt-3 text-sm">
                <span className="text-[var(--muted)]">Delivery method</span>
                <br />
                <strong>
                  {formatLabel(String(order.delivery_method || ""))}
                </strong>
              </p>
            </section>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-[var(--line)] text-left">
                <th className="py-3">Product</th>
                <th className="py-3">Qty</th>
                <th className="py-3 text-right">Price</th>
                <th className="py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item: any) => (
                <tr key={item.id} className="border-b border-[var(--line)]">
                  <td className="py-4">{item.product_name}</td>
                  <td className="py-4">{item.quantity}</td>
                  <td className="py-4 text-right">
                    ${Number(item.unit_price).toLocaleString()}
                  </td>
                  <td className="py-4 text-right">
                    ${Number(item.line_total).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto mt-7 grid max-w-sm gap-3 text-sm">
            <div className="flex justify-between">
              <span>Product total</span>
              <span>${Number(order.subtotal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Advance required before dispatch</span>
              <span>
                {order.delivery_method !== "local-pickup" && order.advance_percent == null
                  ? "Set by admin after order"
                  : Number(order.delivery_fee)
                    ? `${Number(order.advance_percent)}% · $${Number(order.delivery_fee).toLocaleString()}`
                    : "Not required"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Delivery estimate</span>
              <span>{order.delivery_estimate || "Not set"}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--line)] pt-4 text-lg font-semibold">
              <span>{order.delivery_method === "local-pickup" ? "Balance due at pickup" : "Balance due on delivery"}</span>
              <span>{order.delivery_method !== "local-pickup" && order.advance_percent == null ? "Set by admin" : `$${getBalanceDue(Number(order.subtotal), Number(order.delivery_fee || 0)).toLocaleString()}`}</span>
            </div>
            <p className="pt-2 text-xs text-[var(--muted)]">
              Payment method:{" "}
              {order.delivery_method === "local-pickup"
                ? "Pay on pickup"
                : "Bank transfer advance, COD balance"} | Payment status:{" "}
              {formatPaymentStatus(String(order.payment_status || ""))}
            </p>
          </div>

          {order.notes && (
            <div className="mt-10 border-t border-[var(--line)] pt-5">
              <h2 className="text-xs uppercase tracking-wider text-[var(--muted)]">
                Order notes
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm">{order.notes}</p>
            </div>
          )}
          <footer className="mt-12 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)]">
            Thank you for choosing Kazim Nawrozi LLC.
          </footer>
        </article>
      </div>
    </AdminShell>
  );
}
