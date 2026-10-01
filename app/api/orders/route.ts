import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendEmailNotification, sendWhatsAppNotification, confirmationEmail } from "@/lib/notifications";
import { randomBytes } from "node:crypto";
import {
  deliveryMethods,
  type DeliveryMethod,
} from "@/lib/delivery";
export const runtime = "nodejs";
function orderNumber() {
  return `KN-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const items = Array.isArray(b.items) ? b.items : [];
    const method = b.deliveryMethod as DeliveryMethod;
    const c = b.customer || {};
    if (!items.length)
      return NextResponse.json(
        { error: "Your shopping bag is empty." },
        { status: 400 },
      );
    if (!deliveryMethods.some((x) => x.id === method))
      return NextResponse.json(
        { error: "Please choose a delivery method." },
        { status: 400 },
      );
    if (!c.firstName || !c.lastName || !c.email || !c.phone)
      return NextResponse.json(
        { error: "Please complete your name, email and phone." },
        { status: 400 },
      );
    if (
      method !== "local-pickup" &&
      (!c.address || !c.city || !c.state || !c.zip)
    )
      return NextResponse.json(
        { error: "Please complete the delivery address." },
        { status: 400 },
      );
    const db = getDb();
    db.exec("BEGIN IMMEDIATE");
    try {
      const normalized: any[] = [];
      for (const i of items) {
        const p = db
          .prepare(`SELECT * FROM products WHERE slug=?`)
          .get(String(i.slug)) as any;
        const q = Math.max(
          1,
          Math.min(20, Math.floor(Number(i.quantity) || 1)),
        );
        if (!p || p.sold || Number(p.stock) < q)
          throw new Error(
            `${p?.name || i.slug} does not have enough stock available.`,
          );
        normalized.push({ p, q });
      }
      const subtotal =
        Math.round(
          normalized.reduce((a, x) => a + Number(x.p.price) * x.q, 0) * 100,
        ) / 100;
      const region = method === "local-pickup" ? "Local Pickup" : String(c.state || "").trim();
      const advanceAmount = 0;
      const total = subtotal;
      const now = new Date().toISOString();
      const trackingToken = randomBytes(18).toString("hex");
      const num = orderNumber();
      const result = db
        .prepare(
          `INSERT INTO orders(order_number,customer_name,customer_email,phone,shipping_address,delivery_method,delivery_fee,advance_percent,delivery_estimate,subtotal,total,payment_method,payment_status,order_status,notes,tracking_token,whatsapp_opt_in,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          num,
          `${c.firstName} ${c.lastName}`.trim(),
          String(c.email),
          String(c.phone),
          JSON.stringify(
            method === "local-pickup"
              ? { method: "local-pickup" }
              : {
                  address: c.address,
                  city: c.city,
                  state: c.state,
                  zip: c.zip,
                  country: c.country || "United States",
                },
          ),
          method,
          advanceAmount,
          method === "local-pickup" ? 0 : null,
          method === "local-pickup" ? "Arrange pickup with the store" : "",
          subtotal,
          total,
          method === "local-pickup"
            ? "cash_on_pickup"
            : "admin_defined_payment_terms",
          method === "local-pickup" ? "cod_pending" : "terms_pending",
          "new",
          String(b.notes || "").slice(0, 1000),
          trackingToken,
          c.whatsappOptIn === "on" || c.whatsappOptIn === true ? 1 : 0,
          now,
          now,
        );
      const orderId = Number(result.lastInsertRowid);
      const oi = db.prepare(
        `INSERT INTO order_items(order_id,product_id,product_slug,product_name,unit_price,quantity,line_total,advance_amount,delivery_region,delivery_time) VALUES(?,?,?,?,?,?,?,?,?,?)`,
      );
      const dec = db.prepare(
        `UPDATE products SET stock=stock-?,sold=CASE WHEN stock-?<=0 THEN 1 ELSE sold END,updated_at=? WHERE id=?`,
      );
      for (const x of normalized) {
        oi.run(
          orderId,
          x.p.id,
          x.p.slug,
          x.p.name,
          Number(x.p.price),
          x.q,
          Number(x.p.price) * x.q,
          0,
          region,
          "",
        );
        dec.run(x.q, x.q, now, x.p.id);
      }
      db.exec("COMMIT");
      const saved = db
        .prepare("SELECT * FROM orders WHERE id=?")
        .get(orderId) as any;
      db.prepare(
        `INSERT INTO order_status_history(order_id,status,actor_username,note,created_at) VALUES(?,?,?,?,?)`,
      ).run(orderId, "new", "customer", "Order placed online.", now);
      const notifications = [sendEmailNotification({
        orderId,
        orderNumber: saved.order_number,
        to: saved.customer_email,
        customerName: saved.customer_name,
        kind: "order_confirmation",
        subject: `Kazim Nawrozi — Order ${saved.order_number} received`,
        html: confirmationEmail(saved),
      })];
      if (Number(saved.whatsapp_opt_in)) {
        notifications.push(sendWhatsAppNotification({
          orderId,
          orderNumber: saved.order_number,
          to: saved.phone,
          customerName: saved.customer_name,
          kind: "order_confirmation",
          subtotal: Number(saved.subtotal),
        }));
      }
      await Promise.all(notifications);
      return NextResponse.json(
        {
          ok: true,
          orderNumber: saved.order_number,
          trackingToken: saved.tracking_token,
          deliveryMethod: saved.delivery_method,
          advanceAmount: Number(saved.delivery_fee),
        },
        { status: 201 },
      );
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unable to place order." },
      { status: 400 },
    );
  }
}
