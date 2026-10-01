"use client";
import { deliveryMethods, type DeliveryMethod } from "@/lib/delivery";

export default function DeliveryOptions({
  value,
  onChange,
}: {
  value: DeliveryMethod;
  onChange: (v: DeliveryMethod) => void;
}) {
  return (
    <div className="grid gap-3">
      {deliveryMethods.map((m) => {
        const isPickup = m.id === "local-pickup";
        return (
          <label
            key={m.id}
            className={`flex cursor-pointer items-start gap-4 border p-4 ${value === m.id ? "border-[var(--charcoal)] bg-[var(--ivory)]" : "border-[var(--line)] bg-white"}`}
          >
            <input
              type="radio"
              name="deliveryMethod"
              value={m.id}
              checked={value === m.id}
              onChange={() => onChange(m.id)}
              className="mt-1"
            />
            <span className="flex-1">
              <span className="flex flex-col justify-between gap-1 sm:flex-row">
                <strong>{m.name}</strong>
                <strong>{isPickup ? "No advance" : "Terms confirmed after order"}</strong>
              </span>
              <span className="mt-1 block text-sm text-[var(--muted)]">
                {m.detail}
              </span>
              {!isPickup && (
                <span className="mt-1 block text-xs text-[var(--terracotta)]">
                  The store will confirm any advance and delivery estimate after reviewing your order.
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}
