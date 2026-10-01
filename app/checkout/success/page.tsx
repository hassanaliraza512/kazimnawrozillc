"use client";
import Link from "next/link";
import { CheckCircle2, PackageCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import BrandLogo from "@/components/BrandLogo";
import SiteFooter from "@/components/SiteFooter";
import { useSearchParams } from "next/navigation";
export default function Success() {
  const { clearCart } = useCart();
  const params = useSearchParams();
  const order = params.get("order_number") || "";
  const token = params.get("tracking_token") || "";
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const deliveryMethod =
    orderDetails?.delivery_method || params.get("delivery_method") || "";
  const advanceAmount = Number(
    orderDetails?.delivery_fee ?? params.get("advance_amount") ?? 0,
  );
  const bankDetails = orderDetails?.bankDetails;
  const advanceRequired = deliveryMethod !== "local-pickup" && advanceAmount > 0;
  const termsPending = deliveryMethod !== "local-pickup" && orderDetails?.advance_percent == null;
  useEffect(() => {
    clearCart();
    if (!order || !token) return;
    fetch(
      `/api/orders/track?order=${encodeURIComponent(order)}&token=${encodeURIComponent(token)}`,
    )
      .then((response) => response.json())
      .then((data) => {
        if (!data.error) setOrderDetails(data);
      });
  }, [clearCart, order, token]);
  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <BrandLogo href="/" compact className="shrink-0" />
          <span className="text-xs uppercase tracking-[.16em] text-[var(--muted)]">
            Order confirmation
          </span>
        </div>
      </header>
      <section className="mx-auto max-w-2xl px-6 py-24 text-center">
        <CheckCircle2 className="mx-auto" size={58} strokeWidth={1.1} />
        <p className="mt-7 text-xs uppercase tracking-[.25em] text-[var(--terracotta)]">
          Order received
        </p>
        <h1 className="mt-3 text-5xl">Thank you.</h1>
        <p className="mx-auto mt-6 max-w-xl leading-7 text-[var(--muted)]">
          {advanceRequired
            ? `Your order has been received. Transfer the ${orderDetails?.advance_percent}% advance below; it is credited toward your product total. Dispatch follows admin verification, and the remaining balance is due on delivery.`
            : termsPending
              ? "Your order has been received. The store will review it and email any required advance, payment method, bank details, and delivery estimate."
              : deliveryMethod === "local-pickup"
                ? "Your order has been received. The product total is due when you collect your order."
                : "Your order has been received. No advance is required; the product total is due on delivery."}
        </p>
        {order && (
          <div className="mx-auto mt-8 max-w-md border border-[var(--line)] bg-[var(--ivory)] p-5 text-left">
            <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
              Order number
            </p>
            <p className="mt-2 text-xl font-semibold">{order}</p>
          </div>
        )}
        {order && token && (
          <Link
            href={`/track-order?order=${encodeURIComponent(order)}&token=${encodeURIComponent(token)}`}
            className="mx-auto mt-5 block max-w-md border border-[var(--line)] p-4 text-left text-sm font-semibold"
          >
            Track your order online →
          </Link>
        )}
        {advanceRequired && (
          <section className="mx-auto mt-6 max-w-md border border-[var(--line)] bg-[var(--ivory)] p-6 text-left">
            <p className="text-xs uppercase tracking-[.2em] text-[var(--terracotta)]">
              Required advance transfer
            </p>
            <h2 className="mt-2 font-serif text-2xl">Bank details</h2>
            {bankDetails ? (
              <>
                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--muted)]">Advance to pay</dt>
                    <dd className="font-semibold">${advanceAmount.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--muted)]">Bank</dt>
                    <dd className="font-semibold">{bankDetails.bankName}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--muted)]">Account number</dt>
                    <dd className="font-semibold">{bankDetails.bankAccountNumber}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--muted)]">Beneficiary</dt>
                    <dd className="font-semibold">{bankDetails.bankBeneficiary}</dd>
                  </div>
                </dl>
                <p className="mt-5 border-t border-[var(--line)] pt-4 text-xs leading-5 text-[var(--muted)]">
                  Include your order number in the transfer reference. Your order
                  will be dispatched after an admin verifies the advance.
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-[var(--muted)]">Loading bank details...</p>
            )}
          </section>
        )}
        <div className="mx-auto mt-5 flex max-w-md items-center gap-4 border border-[var(--line)] p-5 text-left">
          <PackageCheck size={25} />
          <p className="text-sm leading-6">
            Payment: <strong>{advanceRequired ? `${orderDetails?.advance_percent}% advance, balance on delivery` : termsPending ? "Terms pending store review" : deliveryMethod === "local-pickup" ? "Pay on pickup" : "Pay on delivery"}</strong>.
            The advance is part of the product price, not an extra fee.
          </p>
        </div>
        <Link
          href="/shop"
          className="mt-9 inline-flex bg-[var(--charcoal)] px-7 py-4 text-sm font-semibold text-white"
        >
          Continue shopping
        </Link>
      </section>
      <SiteFooter />
    </main>
  );
}
