import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/postgres";
import {
  sendEmailNotification,
  sendWhatsAppNotification,
  confirmationEmail,
} from "@/lib/notifications";
import {
  deliveryMethods,
  type DeliveryMethod,
} from "@/lib/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function orderNumber() {
  return `KN-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

class OrderRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const method = body.deliveryMethod as DeliveryMethod;
    const customer = body.customer || {};

    if (!items.length) {
      throw new OrderRequestError("Your shopping bag is empty.");
    }
    if (!deliveryMethods.some((option) => option.id === method)) {
      throw new OrderRequestError("Please choose a delivery method.");
    }
    if (
      !customer.firstName ||
      !customer.lastName ||
      !customer.email ||
      !customer.phone
    ) {
      throw new OrderRequestError(
        "Please complete your name, email and phone.",
      );
    }
    if (
      method !== "local-pickup" &&
      (!customer.address || !customer.city || !customer.state || !customer.zip)
    ) {
      throw new OrderRequestError("Please complete the delivery address.");
    }

    const quantities = new Map<string, number>();
    for (const item of items) {
      const slug = String(item.slug || "").trim();
      if (!slug) {
        throw new OrderRequestError("A cart item is missing its product.");
      }
      const quantity = Math.max(
        1,
        Math.min(20, Math.floor(Number(item.quantity) || 1)),
      );
      quantities.set(slug, (quantities.get(slug) || 0) + quantity);
    }

    const savedOrder = await withTransaction(async (client) => {
      const slugs = [...quantities.keys()].sort();
      const normalized: {
        id: number;
        slug: string;
        name: string;
        price: number;
        quantity: number;
      }[] = [];

      for (const slug of slugs) {
        const result = await client.query<{
          id: number;
          slug: string;
          name: string;
          price: number;
          stock: number;
          sold: number;
        }>(
          "SELECT id,slug,name,price,stock,sold FROM products WHERE slug=$1 FOR UPDATE",
          [slug],
        );
        const product = result.rows[0];
        const quantity = quantities.get(slug)!;
        if (
          !product ||
          Number(product.sold) ||
          Number(product.stock) < quantity
        ) {
          throw new OrderRequestError(
            `${product?.name || slug} does not have enough stock available.`,
            409,
          );
        }
        normalized.push({
          id: Number(product.id),
          slug: product.slug,
          name: product.name,
          price: Number(product.price),
          quantity,
        });
      }

      const subtotal =
        Math.round(
          normalized.reduce(
            (sum, product) => sum + product.price * product.quantity,
            0,
          ) * 100,
        ) / 100;
      const region =
        method === "local-pickup" ? "Local Pickup" : String(customer.state || "").trim();
      const deliveryFee = 0;
      const total = subtotal;
      const now = new Date().toISOString();
      const trackingToken = randomBytes(18).toString("hex");
      const inserted = await client.query<{
        id: number;
        order_number: string;
        customer_email: string;
        customer_name: string;
        phone: string;
        tracking_token: string;
        delivery_method: string;
        delivery_fee: number;
        subtotal: number;
        whatsapp_opt_in: number;
      }>(
        `INSERT INTO orders(
          order_number,customer_name,customer_email,phone,shipping_address,
          delivery_method,delivery_fee,advance_percent,delivery_estimate,
          subtotal,total,payment_method,payment_status,order_status,notes,
          tracking_token,whatsapp_opt_in,created_at,updated_at
        )
        VALUES(
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$18
        )
        RETURNING id,order_number,customer_email,customer_name,phone,
                  tracking_token,delivery_method,delivery_fee,subtotal,
                  whatsapp_opt_in`,
        [
          orderNumber(),
          `${customer.firstName} ${customer.lastName}`.trim(),
          String(customer.email).trim(),
          String(customer.phone).trim(),
          JSON.stringify(
            method === "local-pickup"
              ? { method: "local-pickup" }
              : {
                  address: customer.address,
                  city: customer.city,
                  state: customer.state,
                  zip: customer.zip,
                  country: customer.country || "United States",
                },
          ),
          method,
          deliveryFee,
          method === "local-pickup" ? 0 : null,
          method === "local-pickup" ? "Arrange pickup with the store" : "",
          subtotal,
          total,
          method === "local-pickup"
            ? "cash_on_pickup"
            : "admin_defined_payment_terms",
          method === "local-pickup" ? "cod_pending" : "terms_pending",
          "new",
          String(body.notes || "").slice(0, 1000),
          trackingToken,
          customer.whatsappOptIn === "on" || customer.whatsappOptIn === true
            ? 1
            : 0,
          now,
        ],
      );
      const order = inserted.rows[0];
      if (!order) {
        throw new Error("The order could not be created.");
      }

      for (const product of normalized) {
        await client.query(
          `INSERT INTO order_items(
            order_id,product_id,product_slug,product_name,unit_price,
            quantity,line_total,advance_amount,delivery_region,delivery_time
          )
          VALUES($1,$2,$3,$4,$5,$6,$7,0,$8,'')`,
          [
            order.id,
            product.id,
            product.slug,
            product.name,
            product.price,
            product.quantity,
            product.price * product.quantity,
            region,
          ],
        );
        const updated = await client.query(
          `UPDATE products
           SET stock=stock-$1,
               sold=CASE WHEN stock-$1<=0 THEN 1 ELSE sold END,
               updated_at=$2
           WHERE id=$3 AND stock >= $1`,
          [product.quantity, now, product.id],
        );
        if (updated.rowCount !== 1) {
          throw new OrderRequestError(
            `${product.name} does not have enough stock available.`,
            409,
          );
        }
      }

      await client.query(
        `INSERT INTO order_status_history(
          order_id,status,actor_username,note,created_at
        )
        VALUES($1,'new','customer','Order placed online.',$2)`,
        [order.id, now],
      );

      return order;
    });

    const notifications = [
      sendEmailNotification({
        orderId: Number(savedOrder.id),
        orderNumber: savedOrder.order_number,
        to: savedOrder.customer_email,
        customerName: savedOrder.customer_name,
        kind: "order_confirmation",
        subject: `Kazim Nawrozi — Order ${savedOrder.order_number} received`,
        html: await confirmationEmail(savedOrder),
      }),
    ];
    if (Number(savedOrder.whatsapp_opt_in)) {
      notifications.push(
        sendWhatsAppNotification({
          orderId: Number(savedOrder.id),
          orderNumber: savedOrder.order_number,
          to: savedOrder.phone,
          customerName: savedOrder.customer_name,
          kind: "order_confirmation",
          subtotal: Number(savedOrder.subtotal),
        }),
      );
    }
    await Promise.all(notifications);

    return NextResponse.json(
      {
        ok: true,
        orderNumber: savedOrder.order_number,
        trackingToken: savedOrder.tracking_token,
        deliveryMethod: savedOrder.delivery_method,
        advanceAmount: Number(savedOrder.delivery_fee),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof OrderRequestError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("ORDER CREATION ERROR:", error);
    return NextResponse.json(
      { error: "Unable to place order. Please try again." },
      { status: 500 },
    );
  }
}
