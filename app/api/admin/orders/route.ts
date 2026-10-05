import { NextResponse } from "next/server";
import { audit, parseJson } from "@/lib/db";
import { query, queryOne, withTransaction } from "@/lib/postgres";
import { requirePermission } from "@/lib/auth";
import {
  sendEmailNotification,
  sendWhatsAppNotification,
  statusEmail,
} from "@/lib/notifications";
import {
  advancePercentageOptions,
  deliveryEstimateOptions,
} from "@/lib/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function listOrders() {
  const [orders, items, history, notifications] = await Promise.all([
    query<Record<string, any>>(
      "SELECT * FROM orders WHERE deleted_at IS NULL ORDER BY created_at DESC",
    ),
    query<Record<string, any> & { order_id: number }>(
      `SELECT i.* FROM order_items i
       JOIN orders o ON o.id=i.order_id
       WHERE o.deleted_at IS NULL
       ORDER BY i.order_id,i.id`,
    ),
    query<Record<string, any> & { order_id: number }>(
      `SELECT h.order_id,h.status,h.actor_username,h.note,h.created_at
       FROM order_status_history h
       JOIN orders o ON o.id=h.order_id
       WHERE o.deleted_at IS NULL
       ORDER BY h.order_id,h.created_at,h.id`,
    ),
    query<Record<string, any> & { order_id: number }>(
      `SELECT n.order_id,n.kind,n.recipient,n.subject,n.provider,n.sent,n.error,n.created_at
       FROM notifications n
       JOIN orders o ON o.id=n.order_id
       WHERE o.deleted_at IS NULL
       ORDER BY n.order_id,n.created_at DESC`,
    ),
  ]);

  const grouped = <T extends { order_id: number }>(rows: T[]) => {
    const map = new Map<number, T[]>();
    for (const row of rows) {
      const current = map.get(Number(row.order_id)) || [];
      current.push(row);
      map.set(Number(row.order_id), current);
    }
    return map;
  };
  const itemsByOrder = grouped(items);
  const historyByOrder = grouped(history);
  const notificationsByOrder = grouped(notifications);

  return orders.map((order) => ({
    ...order,
    shipping_address: parseJson(order.shipping_address, {}),
    items: itemsByOrder.get(Number(order.id)) || [],
    history: historyByOrder.get(Number(order.id)) || [],
    notifications: notificationsByOrder.get(Number(order.id)) || [],
  }));
}

export async function GET() {
  if (!(await requirePermission("orders"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(await listOrders(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function DELETE(request: Request) {
  const actor = await requirePermission("orders");
  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      return NextResponse.json(
        { error: "Choose a valid order." },
        { status: 400 },
      );
    }

    const deletedAt = new Date().toISOString();
    const order = await queryOne<{ order_number: string }>(
      `UPDATE orders SET deleted_at=$1,updated_at=$1
       WHERE id=$2 AND deleted_at IS NULL
       RETURNING order_number`,
      [deletedAt, id],
    );
    if (!order) {
      return NextResponse.json(
        { error: "Active order not found." },
        { status: 404 },
      );
    }
    await audit(actor, "ORDER_MOVED_TO_TRASH", "order", id, {
      order_number: order.order_number,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("MOVE ORDER TO TRASH ERROR:", error);
    return NextResponse.json(
      { error: "Order could not be moved to trash." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const actor = await requirePermission("orders");
  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const id = Number(body.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ error: "Choose a valid order." }, { status: 400 });
  }

  const allowedPayment = [
    "terms_pending",
    "advance_pending",
    "advance_received",
    "cod_pending",
    "paid",
    "failed",
    "refunded",
  ];
  const allowedStatus = [
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
  if (body.payment_status && !allowedPayment.includes(body.payment_status)) {
    return NextResponse.json(
      { error: "Invalid payment status." },
      { status: 400 },
    );
  }
  if (body.order_status && !allowedStatus.includes(body.order_status)) {
    return NextResponse.json(
      { error: "Invalid order status." },
      { status: 400 },
    );
  }

  const hasAdvancePercent = Object.hasOwn(body, "advancePercent");
  const hasDeliveryEstimate = Object.hasOwn(body, "deliveryEstimate");
  let emailResult: { sent: number; error: string } | null = null;

  try {
    const outcome = await withTransaction(async (client) => {
      const selected = await client.query<Record<string, any>>(
        "SELECT * FROM orders WHERE id=$1 AND deleted_at IS NULL FOR UPDATE",
        [id],
      );
      const order = selected.rows[0];
      if (!order) {
        return { notFound: true as const };
      }

      const advancePercent = hasAdvancePercent
        ? Number(body.advancePercent)
        : Number(order.advance_percent);
      const deliveryEstimate = hasDeliveryEstimate
        ? body.deliveryEstimate === "Custom"
          ? String(body.customDeliveryEstimate || "").trim()
          : String(body.deliveryEstimate).trim()
        : String(order.delivery_estimate || "");
      if (
        hasAdvancePercent &&
        !advancePercentageOptions.includes(
          advancePercent as (typeof advancePercentageOptions)[number],
        ) &&
        advancePercent !== 0
      ) {
        return {
          error: "Choose no advance or a supported advance percentage.",
          status: 400,
        } as const;
      }
      if (
        hasDeliveryEstimate &&
        (!deliveryEstimate ||
          deliveryEstimate.length > 120 ||
          (body.deliveryEstimate !== "Custom" &&
            !deliveryEstimateOptions.includes(
              deliveryEstimate as (typeof deliveryEstimateOptions)[number],
            )))
      ) {
        return {
          error:
            "Choose a valid delivery estimate or enter a custom delivery time up to 120 characters.",
          status: 400,
        } as const;
      }

      const termsChanged =
        (hasAdvancePercent &&
          advancePercent !== Number(order.advance_percent)) ||
        (hasDeliveryEstimate &&
          deliveryEstimate !== String(order.delivery_estimate || ""));
      const now = new Date().toISOString();

      if (termsChanged) {
        const rate =
          order.delivery_method === "local-pickup" ? 0 : Number(advancePercent || 0);
        const amount = Math.round(Number(order.subtotal) * rate) / 100;
        const paymentMethod =
          order.delivery_method === "local-pickup"
            ? "cash_on_pickup"
            : rate > 0
              ? "bank_transfer_advance_and_cash_on_delivery_balance"
              : "cash_on_delivery";
        const paymentStatus =
          order.delivery_method === "local-pickup" || rate === 0
            ? "cod_pending"
            : "advance_pending";
        await client.query(
          `UPDATE orders
           SET advance_percent=$1,delivery_estimate=$2,delivery_fee=$3,
               payment_method=$4,payment_status=$5,updated_at=$6
           WHERE id=$7`,
          [rate, deliveryEstimate, amount, paymentMethod, paymentStatus, now, id],
        );
      }

      if (typeof body.payment_status === "string") {
        await client.query(
          "UPDATE orders SET payment_status=$1,updated_at=$2 WHERE id=$3",
          [body.payment_status, now, id],
        );
      }
      if (
        typeof body.order_status === "string" &&
        body.order_status !== order.order_status
      ) {
        await client.query(
          "UPDATE orders SET order_status=$1,updated_at=$2 WHERE id=$3",
          [body.order_status, now, id],
        );
        await client.query(
          `INSERT INTO order_status_history(
            order_id,status,actor_username,note,created_at
          )
          VALUES($1,$2,$3,'Status updated by staff.',$4)`,
          [id, body.order_status, actor.username, now],
        );

        const wasRestored = ["cancelled", "returned"].includes(
          order.order_status,
        );
        const willRestore = ["cancelled", "returned"].includes(body.order_status);
        const orderItems = await client.query<{ product_id: number; quantity: number }>(
          "SELECT product_id,quantity FROM order_items WHERE order_id=$1",
          [id],
        );
        if (!wasRestored && willRestore) {
          for (const item of orderItems.rows) {
            await client.query(
              "UPDATE products SET stock=stock+$1,sold=0,updated_at=$2 WHERE id=$3",
              [item.quantity, now, item.product_id],
            );
          }
        } else if (wasRestored && !willRestore) {
          for (const item of orderItems.rows) {
            const productResult = await client.query<{
              stock: number;
              name: string;
            }>(
              "SELECT stock,name FROM products WHERE id=$1 FOR UPDATE",
              [item.product_id],
            );
            const product = productResult.rows[0];
            if (!product || Number(product.stock) < Number(item.quantity)) {
              throw new Error(
                `${product?.name || "A product"} does not have enough stock to reactivate this order.`,
              );
            }
            await client.query(
              `UPDATE products
               SET stock=stock-$1,
                   sold=CASE WHEN stock-$1<=0 THEN 1 ELSE sold END,
                   updated_at=$2
               WHERE id=$3`,
              [item.quantity, now, item.product_id],
            );
          }
        }
      }
      if (typeof body.notes === "string") {
        await client.query(
          "UPDATE orders SET notes=$1,updated_at=$2 WHERE id=$3",
          [body.notes.slice(0, 5000), now, id],
        );
      }

      const freshResult = await client.query<Record<string, any>>(
        "SELECT * FROM orders WHERE id=$1",
        [id],
      );
      return {
        order,
        fresh: freshResult.rows[0],
        termsChanged,
        statusChanged:
          typeof body.order_status === "string" &&
          body.order_status !== order.order_status,
        paymentChanged:
          typeof body.payment_status === "string" &&
          body.payment_status !== order.payment_status,
      };
    });

    if ("notFound" in outcome) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if ("error" in outcome) {
      return NextResponse.json(
        { error: outcome.error },
        { status: outcome.status },
      );
    }

    const { order, fresh, termsChanged, statusChanged, paymentChanged } = outcome;
    await audit(actor, "ORDER_UPDATED", "order", id, {
      order_number: order.order_number,
      changes: {
        payment_status: body.payment_status,
        order_status: body.order_status,
        notes: body.notes !== undefined,
      },
    });

    if (termsChanged || paymentChanged || statusChanged) {
      emailResult = await sendEmailNotification({
        orderId: id,
        orderNumber: order.order_number,
        to: order.customer_email,
        customerName: order.customer_name,
        kind: "status_update",
        status: fresh.order_status,
        subject: `Kazim Nawrozi — Order ${order.order_number} details`,
        html: await statusEmail(fresh, fresh.order_status),
      });
    }
    if (statusChanged && Number(order.whatsapp_opt_in)) {
      await sendWhatsAppNotification({
        orderId: id,
        orderNumber: order.order_number,
        to: order.phone,
        customerName: order.customer_name,
        kind: "status_update",
        status: body.order_status,
        subtotal: Number(order.subtotal),
      });
    }

    return NextResponse.json({
      ok: true,
      emailSent: emailResult ? Boolean(emailResult.sent) : null,
      emailError: emailResult?.error || "",
    });
  } catch (error) {
    console.error("ORDER UPDATE ERROR:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Order update failed.",
      },
      { status: 500 },
    );
  }
}
