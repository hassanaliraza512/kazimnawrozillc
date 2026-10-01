import { NextResponse } from "next/server";
import { audit, getDb } from "@/lib/db";
import { requirePermission } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requirePermission("orders"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = getDb()
    .prepare("SELECT id,order_number,customer_name,customer_email,subtotal,payment_status,order_status,created_at,deleted_at FROM orders WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
    .all();
  return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const actor = await requirePermission("orders");
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id: rawId } = await request.json();
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id < 1) {
      return NextResponse.json({ error: "Choose a valid order." }, { status: 400 });
    }

    const db = getDb();
    const order = db.prepare("SELECT id,order_number FROM orders WHERE id=? AND deleted_at IS NOT NULL").get(id) as { id: number; order_number: string } | undefined;
    if (!order) return NextResponse.json({ error: "Trashed order not found." }, { status: 404 });

    const now = new Date().toISOString();
    db.prepare("UPDATE orders SET deleted_at=NULL,updated_at=? WHERE id=?").run(now, id);
    audit(actor, "ORDER_RESTORED_FROM_TRASH", "order", id, { order_number: order.order_number });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Order could not be restored." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const actor = await requirePermission("orders");
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id: rawId } = await request.json();
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id < 1) {
      return NextResponse.json({ error: "Choose a valid order." }, { status: 400 });
    }

    const db = getDb();
    const order = db.prepare("SELECT id,order_number FROM orders WHERE id=? AND deleted_at IS NOT NULL").get(id) as { id: number; order_number: string } | undefined;
    if (!order) return NextResponse.json({ error: "Trashed order not found." }, { status: 404 });

    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("DELETE FROM orders WHERE id=? AND deleted_at IS NOT NULL").run(id);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }

    audit(actor, "ORDER_PERMANENTLY_DELETED", "order", id, { order_number: order.order_number });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Order could not be permanently deleted." }, { status: 400 });
  }
}