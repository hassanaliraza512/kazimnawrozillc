"use client";
import Link from "next/link";
import {
  ArrowLeft,
  LockKeyhole,
  ShieldCheck,
  Truck,
  MapPin,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { City, State } from "country-state-city";
import { useCart } from "@/components/CartProvider";
import DeliveryOptions from "@/components/DeliveryOptions";
import BrandLogo from "@/components/BrandLogo";
import SiteFooter from "@/components/SiteFooter";
import { type DeliveryMethod } from "@/lib/delivery";

const usStateCodes = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA",
  "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX",
  "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]);
const usStates = State.getStatesOfCountry("US").filter((state) =>
  usStateCodes.has(state.isoCode),
);

export default function CheckoutPage() {
  const { items } = useCart();
  const [stateName, setStateName] = useState("");
  const [cityName, setCityName] = useState("");
  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("standard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const isPickup = deliveryMethod === "local-pickup";
  const selectedState = usStates.find((state) => state.name === stateName);
  const cities = selectedState
    ? City.getCitiesOfState("US", selectedState.isoCode)
    : [];
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const customer = Object.fromEntries(form.entries());
    try {
      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(({ slug, quantity }) => ({ slug, quantity })),
          customer,
          deliveryMethod,
          notes: customer.notes,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Unable to place order.");
      window.location.href =
        "/checkout/success?order_number=" +
        encodeURIComponent(d.orderNumber || "") +
        "&tracking_token=" +
        encodeURIComponent(d.trackingToken || "") +
        "&delivery_method=" +
        encodeURIComponent(d.deliveryMethod || deliveryMethod) +
        "&advance_amount=" +
        encodeURIComponent(String(d.advanceAmount ?? 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to place order.");
      setLoading(false);
    }
  }
  if (!items.length)
    return (
      <main className="min-h-screen">
        <Header />
        <section className="mx-auto max-w-2xl px-6 py-24 text-center">
          <p className="text-xs uppercase tracking-[.25em] text-[var(--terracotta)]">
            Checkout
          </p>
          <h1 className="mt-3 text-5xl">Your bag is empty.</h1>
          <Link
            href="/shop"
            className="mt-8 inline-flex bg-[var(--charcoal)] px-7 py-4 text-sm font-semibold text-white"
          >
            Explore the collection
          </Link>
        </section>
      </main>
    );
  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"
        >
          <ArrowLeft size={15} /> Back to bag
        </Link>
        <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_390px]">
          <form onSubmit={submit} className="space-y-10">
            <div>
              <p className="text-xs uppercase tracking-[.25em] text-[var(--terracotta)]">
                01 · Customer details
              </p>
              <h1 className="mt-2 text-5xl">Place your order</h1>
              <p className="mt-4 max-w-2xl leading-7 text-[var(--muted)]">
                Place your order first. The store will confirm your payment
                method, any required advance, and delivery estimate by email.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="First name" name="firstName" />
              <Field label="Last name" name="lastName" />
              <Field label="Email address" name="email" type="email" />
              <Field label="Phone" name="phone" type="tel" />
              <label className="flex items-start gap-3 text-sm leading-6 text-[var(--muted)] sm:col-span-2">
                <input
                  type="checkbox"
                  name="whatsappOptIn"
                  className="mt-1 accent-[var(--charcoal)]"
                />
                <span>
                  Send me order confirmations and status updates on WhatsApp. I
                  can reply STOP to opt out. Message and data rates may apply.
                </span>
              </label>
            </div>
            <div className="border-t border-[var(--line)] pt-9">
              <p className="text-xs uppercase tracking-[.25em] text-[var(--terracotta)]">
                02 · Delivery address
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Required for delivery. Local Pickup only needs your contact
                details.
              </p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field
                  label="Address"
                  name="address"
                  className="sm:col-span-2"
                  required={deliveryMethod !== "local-pickup"}
                />
                <label className="grid gap-2 text-sm">
                  <span>State{deliveryMethod !== "local-pickup" ? " *" : ""}</span>
                  <select
                    required={deliveryMethod !== "local-pickup"}
                    name="state"
                    value={stateName}
                    onChange={(event) => {
                      setStateName(event.target.value);
                      setCityName("");
                    }}
                    className="border border-[var(--line)] bg-white px-4 py-3 outline-none focus:border-[var(--charcoal)]"
                  >
                    <option value="">Select a state</option>
                    {usStates.map((state) => (
                      <option key={state.isoCode} value={state.name}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm">
                  <span>City{deliveryMethod !== "local-pickup" ? " *" : ""}</span>
                  <select
                    required={deliveryMethod !== "local-pickup"}
                    disabled={!selectedState}
                    name="city"
                    value={cityName}
                    onChange={(event) => setCityName(event.target.value)}
                    className="border border-[var(--line)] bg-white px-4 py-3 outline-none focus:border-[var(--charcoal)] disabled:cursor-not-allowed disabled:bg-[var(--ivory)]"
                  >
                    <option value="">
                      {selectedState ? "Select a city" : "Select a state first"}
                    </option>
                    {cities.map((city, index) => (
                      <option key={`${city.name}-${index}`} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="ZIP code"
                  name="zip"
                  required={deliveryMethod !== "local-pickup"}
                />
                <label className="grid gap-2 text-sm sm:col-span-2">
                  <span>Country</span>
                  <select
                    name="country"
                    defaultValue="United States"
                    className="border border-[var(--line)] bg-white px-4 py-3"
                  >
                    <option>United States</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="border-t border-[var(--line)] pt-9">
              <p className="text-xs uppercase tracking-[.25em] text-[var(--terracotta)]">
                03 · Delivery method
              </p>
              <div className="mt-6">
                <DeliveryOptions
                  value={deliveryMethod}
                  onChange={setDeliveryMethod}
                />
              </div>
            </div>
            <div className="border-t border-[var(--line)] pt-9">
              <p className="text-xs uppercase tracking-[.25em] text-[var(--terracotta)]">
                04 · Payment
              </p>
              <div className="mt-5 border border-[var(--line)] bg-[var(--ivory)] p-5">
                <div className="flex items-center gap-3">
                  <MapPin size={19} />
                  <div>
                    <strong>
                      {isPickup
                        ? "No advance required for pickup"
                        : "Advance before dispatch, balance at delivery"}
                    </strong>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {isPickup
                        ? "Pay the product total when you collect your order."
                        : "After you place your order, the store will review it and email your payment method, any required advance, bank details, and delivery estimate."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-[var(--line)] pt-9">
              <p className="text-xs uppercase tracking-[.25em] text-[var(--terracotta)]">
                05 · Notes
              </p>
              <textarea
                name="notes"
                rows={4}
                placeholder="Optional delivery notes"
                className="mt-5 w-full resize-none border border-[var(--line)] bg-white px-4 py-3 outline-none focus:border-[var(--charcoal)]"
              />
            </div>
            {error && (
              <div
                role="alert"
                className="border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
              >
                {error}
              </div>
            )}
            <button
              disabled={loading}
              type="submit"
              className="w-full bg-[var(--charcoal)] px-6 py-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading
                ? "Placing order…"
                : `Place Order · $${subtotal.toLocaleString()} product total`}
            </button>
            <p className="flex items-center justify-center gap-2 text-center text-xs leading-5 text-[var(--muted)]">
              <LockKeyhole size={13} /> Your order details are saved securely in
              the store's local database.
            </p>
          </form>
          <aside className="h-fit border border-[var(--line)] bg-[var(--ivory)] p-7 lg:sticky lg:top-24">
            <h2 className="text-2xl">Your order</h2>
            <div className="mt-6 space-y-5">
              {items.map((item) => (
                <div key={item.slug} className="flex gap-4">
                  <img
                    src={item.image || "/product-images/placeholder.svg"}
                    alt={item.name}
                    className="h-20 w-16 object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Qty {item.quantity} · {item.size}
                    </p>
                    <p className="mt-2 text-sm">
                      ${(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-7 space-y-3 border-t border-[var(--line)] pt-5 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Product subtotal</span>
                <span>${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Advance before dispatch</span>
                <span>{isPickup ? "None" : "Confirmed after order"}</span>
              </div>
              <div className="text-xs text-[var(--muted)]">
                {deliveryMethod === "local-pickup"
                  ? "Local pickup requires no advance."
                  : "The store will email any advance amount and payment instructions after reviewing your order."}
              </div>
              <div className="flex justify-between border-t border-[var(--line)] pt-4 text-base font-semibold">
                <span>{isPickup ? "Balance due at pickup" : "Balance due on delivery"}</span>
                <span>{isPickup ? `$${subtotal.toLocaleString()}` : "Confirmed by email"}</span>
              </div>
            </div>
            <div className="mt-7 grid gap-3 text-xs text-[var(--muted)]">
              <div className="flex gap-3">
                <ShieldCheck size={16} />
                <span>The store will confirm your delivery estimate after reviewing the order.</span>
              </div>
              <div className="flex gap-3">
                <Truck size={16} />
                <span>
                  Any advance will be credited toward the product total.
                </span>
              </div>
            </div>
          </aside>
        </div>
      </section>
      <Policies />
      <SiteFooter />
    </main>
  );
}
function Header() {
  return (
    <header className="border-b border-[var(--line)] bg-[var(--paper)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <BrandLogo href="/" compact className="shrink-0" />
        <span className="flex items-center gap-2 text-xs uppercase tracking-[.16em] text-[var(--muted)]">
          <LockKeyhole size={14} /> Secure order
        </span>
      </div>
    </header>
  );
}
function Policies() {
  return (
    <section className="border-t border-[var(--line)] bg-[var(--ivory)] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs uppercase tracking-[.2em] text-[var(--terracotta)]">
          Before you place your order
        </p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <Link href="/shipping">Shipping & Delivery</Link>
          <Link href="/refund-policy">Refund & Return Policy</Link>
          <Link href="/privacy-policy">Privacy Policy</Link>
          <Link href="/terms">Terms & Conditions</Link>
        </div>
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
          By placing an order, you agree to arrange the required advance before
          dispatch for delivery orders and pay the remaining balance on
          delivery or pickup.
        </p>
      </div>
    </section>
  );
}
function Field({
  label,
  name,
  type = "text",
  className = "",
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={`grid gap-2 text-sm ${className}`}>
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <input
        required={required}
        type={type}
        name={name}
        className="border border-[var(--line)] bg-white px-4 py-3 outline-none focus:border-[var(--charcoal)]"
      />
    </label>
  );
}
