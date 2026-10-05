import { NextResponse } from "next/server";
import { audit } from "@/lib/db";
import { query, withTransaction } from "@/lib/postgres";
import { requirePermission } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requirePermission("orders"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await query(
    `SELECT id,order_number,customer_name,customer_email,subtotal,
            payment_status,order_status,created_at,deleted_at
     FROM orders
     WHERE deleted_at IS NOT NULL
     ORDER BY deleted_at DESC`,
  );
  return NextResponse.json(rows, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PATCH(request: Request) {
  const actor = await requirePermission("orders");
  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id: rawId } = await request.json();
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id < 1) {
      return NextResponse.json(
        { error: "Choose a valid order." },
        { status: 400 },
      );
    }

    const restored = await withTransaction(async (client) => {
      const order = await client.query<{ id: number; order_number: string }>(
        "SELECT id,order_number FROM orders WHERE id=$1 AND deleted_at IS NOT NULL FOR UPDATE",
        [id],
      );
      const found = order.rows[0];
      if (!found) {
        return null;
      }

      await client.query(
        "UPDATE orders SET deleted_at=NULL,updated_at=$1 WHERE id=$2",
        [new Date().toISOString(), id],
      );
      return found;
    });
    if (!restored) {
      return NextResponse.json(
        { error: "Trashed order not found." },
        { status: 404 },
      );
    }
    await audit(actor, "ORDER_RESTORED_FROM_TRASH", "order", id, {
      order_number: restored.order_number,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Order could not be restored." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const actor = await requirePermission("orders");
  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id: rawId } = await request.json();
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id < 1) {
      return NextResponse.json(
        { error: "Choose a valid order." },
        { status: 400 },
      );
    }

    const removed = await withTransaction(async (client) => {
      const order = await client.query<{ order_number: string }>(
        "SELECT order_number FROM orders WHERE id=$1 AND deleted_at IS NOT NULL FOR UPDATE",
        [id],
      );
      const found = order.rows[0];
      if (!found) {
        return null;
      }
      await client.query(
        "DELETE FROM orders WHERE id=$1 AND deleted_at IS NOT NULL",
        [id],
      );
      return found;
    });
    if (!removed) {
      return NextResponse.json(
        { error: "Trashed order not found." },
        { status: 404 },
      );
    }

    await audit(actor, "ORDER_PERMANENTLY_DELETED", "order", id, {
      order_number: removed.order_number,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Order could not be permanently deleted." },
      { status: 400 },
    );
  }
}
