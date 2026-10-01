"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import AdminShell from "@/components/AdminShell";

type TrashedOrder = {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  subtotal: number;
  order_status: string;
  created_at: string;
  deleted_at: string;
};

export default function OrderTrash() {
  const [orders, setOrders] = useState<TrashedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/orders/trash", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Trash could not be loaded.");
      setOrders(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Trash could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function act(order: TrashedOrder, action: "restore" | "delete") {
    if (action === "delete" && !window.confirm(`Permanently delete order ${order.order_number}? This cannot be undone.`)) return;
    setBusyId(order.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/orders/trash", {
        method: action === "restore" ? "PATCH" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Order action failed.");
      setMessage(action === "restore" ? `Order ${order.order_number} restored.` : `Order ${order.order_number} permanently deleted.`);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Order action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell>
      <p className="text-xs uppercase tracking-[.25em] text-[var(--terracotta)]">Order management</p>
      <h1 className="mt-2 text-4xl">Order Trash</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Restore orders to active management or permanently delete them.</p>
      {message && <p role="status" className="mt-5 border border-[var(--line)] bg-[var(--ivory)] p-4 text-sm">{message}</p>}
      {error && <p role="alert" className="mt-5 border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {loading ? (
        <p className="mt-8 text-sm text-[var(--muted)]">Loading trash...</p>
      ) : !orders.length ? (
        <div className="mt-8 border border-dashed border-[var(--line)] p-10 text-center">
          <Trash2 className="mx-auto text-[var(--muted)]" size={24} />
          <h2 className="mt-3 font-serif text-2xl">Trash is empty</h2>
        </div>
      ) : (
        <div className="mt-7 overflow-x-auto border border-[var(--line)]">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-[var(--ivory)] text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4">Order</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Product total</th>
                <th className="p-4">Deleted</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-[var(--line)]">
                  <td className="p-4 font-semibold">{order.order_number}</td>
                  <td className="p-4"><div>{order.customer_name}</div><div className="text-xs text-[var(--muted)]">{order.customer_email}</div></td>
                  <td className="p-4">${Number(order.subtotal).toLocaleString()}</td>
                  <td className="p-4">{new Date(order.deleted_at).toLocaleString()}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => act(order, "restore")} disabled={busyId !== null} className="inline-flex items-center gap-2 border border-[var(--line)] px-3 py-2 disabled:opacity-50">
                        <RotateCcw size={15} /> Restore
                      </button>
                      <button type="button" onClick={() => act(order, "delete")} disabled={busyId !== null} className="inline-flex items-center gap-2 border border-red-200 px-3 py-2 text-red-800 disabled:opacity-50">
                        <Trash2 size={15} /> Delete permanently
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}