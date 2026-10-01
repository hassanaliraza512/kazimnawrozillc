import { getDb } from "./db";
import { getHomepageContent } from "@/lib/site-content";
import { getStoreEmailSender } from "@/lib/email";

export type NotificationKind =
  "order_confirmation" | "status_update" | "admin_alert";

function escapeHtml(input: string) {
  return input.replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ]!,
  );
}

export function statusLabel(s: string) {
  return s.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function recordNotification(args: {
  orderId: number;
  orderNumber: string;
  kind: NotificationKind;
  recipient: string;
  subject: string;
  provider: string;
  sent: number;
  error: string;
}) {
  getDb()
    .prepare(
      `INSERT INTO notifications(order_id,order_number,kind,recipient,subject,provider,sent,error,created_at) VALUES(?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      args.orderId,
      args.orderNumber,
      args.kind,
      args.recipient,
      args.subject,
      args.provider,
      args.sent,
      args.error,
      new Date().toISOString(),
    );
}

export async function sendEmailNotification(args: {
  orderId: number;
  orderNumber: string;
  to: string;
  customerName: string;
  kind: NotificationKind;
  status?: string;
  subject: string;
  html: string;
}) {
  let provider = "local";
  let sent = 0;
  let error = "";
  try {
    const nodemailer = await import("nodemailer");
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM || user;
    if (host && from) {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === "true",
        auth: user && pass ? { user, pass } : undefined,
      });
      await transporter.sendMail({
        from: getStoreEmailSender(getHomepageContent().brandName, from),
        to: args.to,
        subject: args.subject,
        html: args.html,
      });
      provider = "smtp";
      sent = 1;
    } else {
      error =
        "SMTP is not configured; notification was recorded but not emailed.";
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Email delivery failed.";
  }
  recordNotification({
    orderId: args.orderId,
    orderNumber: args.orderNumber,
    kind: args.kind,
    recipient: args.to,
    subject: args.subject,
    provider,
    sent,
    error,
  });
  return { sent, error, provider };
}

function whatsappAddress(phone: string) {
  const raw = phone.trim().replace(/^whatsapp:/i, "");
  const digits = raw.replace(/\D/g, "");
  const e164 = raw.startsWith("+")
    ? `+${digits}`
    : digits.length === 10
      ? `+1${digits}`
      : digits.length === 11 && digits.startsWith("1")
        ? `+${digits}`
        : "";
  return /^\+[1-9]\d{7,14}$/.test(e164) ? `whatsapp:${e164}` : null;
}

export async function sendWhatsAppNotification(args: {
  orderId: number;
  orderNumber: string;
  to: string;
  customerName: string;
  kind: NotificationKind;
  status?: string;
  subtotal: number;
}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const configured = Boolean(accountSid && authToken && from);
  const recipient = whatsappAddress(args.to) || args.to;
  const subject = `Order ${args.orderNumber} WhatsApp update`;
  let provider = configured ? "twilio-whatsapp" : "local";
  let sent = 0;
  let error = "";

  try {
    if (!configured) {
      error = "Twilio WhatsApp is not configured; notification was recorded but not sent.";
    } else if (!whatsappAddress(args.to)) {
      error = "Customer phone must be a valid international number (E.164).";
    } else {
      const message = args.kind === "order_confirmation"
        ? `Hello ${args.customerName}, we received order ${args.orderNumber}. Your product total is $${args.subtotal.toLocaleString()}. We will contact you with any next steps. Reply STOP to opt out.`
        : `Hello ${args.customerName}, order ${args.orderNumber} is now ${statusLabel(args.status || "updated")}. Reply STOP to opt out.`;
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid!)}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            From: from!.startsWith("whatsapp:") ? from! : `whatsapp:${from}`,
            To: recipient,
            Body: message,
          }),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (response.ok) {
        sent = 1;
        provider = "twilio-whatsapp";
      } else {
        const result = await response.json().catch(() => ({}));
        error = typeof result.message === "string"
          ? `Twilio error: ${result.message}`
          : `Twilio WhatsApp request failed with status ${response.status}.`;
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "WhatsApp delivery failed.";
  }

  recordNotification({
    orderId: args.orderId,
    orderNumber: args.orderNumber,
    kind: args.kind,
    recipient,
    subject,
    provider,
    sent,
    error,
  });
  return { sent, error, provider };
}

export function confirmationEmail(order: any) {
  const advance = Number(order.delivery_fee || 0);
  const balanceDue = Math.max(0, Number(order.subtotal) - advance);
  const isPickup = order.delivery_method === "local-pickup";
  const hasAdminTerms = isPickup || order.advance_percent !== null && order.advance_percent !== undefined;
  const siteContent = getHomepageContent();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const logoUrl = new URL(siteContent.brandLogo, `${siteUrl}/`).toString();
  const items = getDb()
    .prepare(
      "SELECT product_slug,product_name,unit_price,quantity,line_total,advance_amount,delivery_time FROM order_items WHERE order_id=? ORDER BY id",
    )
    .all(order.id) as {
      product_slug: string;
      product_name: string;
      unit_price: number;
      quantity: number;
      line_total: number;
      advance_amount: number;
      delivery_time: string;
    }[];
  const itemRows = items.map((item) => {
    const productUrl = new URL(`/products/${encodeURIComponent(item.product_slug)}`, `${siteUrl}/`).toString();
    return `<tr><td style="padding:12px 8px;border-bottom:1px solid #e6dfd2"><a href="${escapeHtml(productUrl)}" style="color:#211f1b;font-weight:600">${escapeHtml(item.product_name)}</a><br/><span style="color:#716b61;font-size:13px">Qty ${item.quantity} · $${Number(item.unit_price).toLocaleString()} each</span></td><td style="padding:12px 8px;border-bottom:1px solid #e6dfd2;text-align:right;white-space:nowrap">$${Number(item.line_total).toLocaleString()}</td></tr>`;
  }).join("");
  const safeBrandName = escapeHtml(siteContent.brandName);
  const trackUrl = new URL(
    `/track-order?order=${encodeURIComponent(order.order_number)}&token=${encodeURIComponent(order.tracking_token || "")}`,
    `${siteUrl}/`,
  ).toString();
  const contactRows = [
    siteContent.brandContactEmail
      ? `<tr><td style="padding:3px 0">Email: <a href="mailto:${escapeHtml(siteContent.brandContactEmail)}" style="color:#211f1b">${escapeHtml(siteContent.brandContactEmail)}</a></td></tr>`
      : "",
    siteContent.brandContactPhone
      ? `<tr><td style="padding:3px 0">Phone: ${escapeHtml(siteContent.brandContactPhone)}</td></tr>`
      : "",
    siteContent.brandContactAddress
      ? `<tr><td style="padding:3px 0">Address: ${escapeHtml(siteContent.brandContactAddress)}</td></tr>`
      : "",
  ].filter(Boolean).join("");
  const bankTransferInfo = isPickup || !hasAdminTerms
    ? ""
    : advance > 0
      ? `<h3 style="margin:24px 0 8px">${Number(order.advance_percent)}% advance payment</h3><p>To proceed with processing and dispatch, transfer <strong>$${advance.toLocaleString()}</strong> using these bank details:</p><p>Bank: ${escapeHtml(siteContent.bankName)}<br/>Account number: ${escapeHtml(siteContent.bankAccountNumber)}<br/>Beneficiary: ${escapeHtml(siteContent.bankBeneficiary)}</p><p>Include order number <strong>${escapeHtml(order.order_number)}</strong> in the transfer reference. The advance is credited toward your product total, not added as an extra fee. Dispatch follows admin verification.</p>`
      : `<p style="margin-top:20px">No advance is required. The product total is due ${isPickup ? "at pickup" : "on delivery"}.</p>`;
  const paymentLabel = isPickup
    ? "Pay on pickup"
    : !hasAdminTerms
      ? "To be confirmed by the store"
      : advance > 0
        ? `${Number(order.advance_percent)}% advance · $${advance.toLocaleString()}`
        : "No advance required";
  const estimateLabel = isPickup
    ? "Arrange pickup with the store"
    : hasAdminTerms
      ? escapeHtml(order.delivery_estimate || "To be confirmed by the store")
      : "To be confirmed by the store";
  const balanceLabel = !isPickup && !hasAdminTerms
    ? "To be confirmed after payment terms are set"
    : `$${balanceDue.toLocaleString()} ${isPickup ? "at pickup" : "on delivery"}`;
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#25231f;line-height:1.6"><div style="text-align:center;padding:8px 0 20px"><img src="${escapeHtml(logoUrl)}" alt="${safeBrandName}" width="160" style="display:inline-block;width:160px;max-height:120px;object-fit:contain"/><p style="margin:10px 0 0;letter-spacing:2px;color:#9a5a42">${safeBrandName}</p></div><h2 style="font-family:Georgia,serif">Order ${escapeHtml(order.order_number)} received</h2><p>Dear ${escapeHtml(order.customer_name)}, thank you for choosing ${safeBrandName}. We have received your order and it is awaiting review.</p><h3 style="margin:24px 0 8px">Your items</h3><table role="presentation" style="width:100%;border-collapse:collapse"><tbody>${itemRows}</tbody></table><div style="margin-top:16px;background:#f7f1e7;padding:18px"><strong>Product total: $${Number(order.subtotal).toLocaleString()}</strong><br/>Payment terms: ${paymentLabel}<br/>Balance due: ${balanceLabel}<br/>Delivery estimate: ${estimateLabel}<br/>Delivery method: ${escapeHtml(statusLabel(order.delivery_method))}</div>${bankTransferInfo}${!isPickup && !hasAdminTerms ? `<p>Our team will email your payment method, any required advance, bank details, and delivery estimate after reviewing your order. Please wait for those instructions before sending payment.</p>` : ""}<p style="margin:24px 0"><a href="${escapeHtml(trackUrl)}" style="display:inline-block;background:#211f1b;color:#fff;text-decoration:none;padding:12px 18px">Track your order</a></p><p>With thanks,<br/><strong>The ${safeBrandName} Team</strong></p>${contactRows ? `<hr style="border:0;border-top:1px solid #e6dfd2;margin:24px 0"/><p style="margin:0 0 8px"><strong>Questions? Contact us:</strong></p><table role="presentation" style="font-size:13px;color:#716b61">${contactRows}</table>` : ""}</div>`;
}

export function statusEmail(order: any, status: string) {
  const isPickup = order.delivery_method === "local-pickup";
  const content = getHomepageContent();
  const brandName = escapeHtml(content.brandName);
  const advancePercent = order.advance_percent == null ? null : Number(order.advance_percent);
  const advance = Number(order.delivery_fee || 0);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const logoUrl = new URL(content.brandLogo, `${siteUrl}/`).toString();
  const trackUrl = new URL(`/track-order?order=${encodeURIComponent(order.order_number)}&token=${encodeURIComponent(order.tracking_token || "")}`, `${siteUrl}/`).toString();
  const paymentInstructions = isPickup
    ? "The product total is due at pickup."
    : advancePercent === null
      ? "Our team will confirm your payment method and any required advance shortly. Please wait for our instructions before sending payment."
      : advancePercent === 0
        ? "No advance is required. The remaining product total is due on delivery."
        : `Please transfer the ${advancePercent}% advance of $${advance.toLocaleString()} to proceed. It is credited toward your product total; the remaining balance is due on delivery.`;
  const bankDetails = !isPickup && advance > 0
    ? `<h3 style="margin:20px 0 8px">Bank transfer details</h3><p>Bank: ${escapeHtml(content.bankName)}<br/>Account number: ${escapeHtml(content.bankAccountNumber)}<br/>Beneficiary: ${escapeHtml(content.bankBeneficiary)}</p><p>Include order number <strong>${escapeHtml(order.order_number)}</strong> in the transfer reference. Dispatch follows admin verification.</p>`
    : "";
  const advanceLabel = isPickup
    ? "Not required for pickup"
    : advancePercent === null
      ? "Pending store confirmation"
      : advancePercent === 0
        ? "No advance required"
        : `${advancePercent}% · $${advance.toLocaleString()}`;
  const deliveryEstimate = isPickup
    ? "Arrange pickup with the store"
    : escapeHtml(order.delivery_estimate || "To be confirmed by the store");
  const contact = [content.brandContactEmail, content.brandContactPhone, content.brandContactAddress]
    .filter(Boolean)
    .map((value) => `<p style="margin:4px 0">${escapeHtml(value)}</p>`)
    .join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#25231f;line-height:1.6"><div style="text-align:center;padding-bottom:20px"><img src="${escapeHtml(logoUrl)}" alt="${brandName}" width="150" style="width:150px;max-height:120px;object-fit:contain"/><p style="color:#9a5a42;letter-spacing:2px">${brandName}</p></div><h2 style="font-family:Georgia,serif">Order ${escapeHtml(order.order_number)} update</h2><p>Dear ${escapeHtml(order.customer_name)}, your order status is now <strong>${escapeHtml(statusLabel(status))}</strong>.</p><div style="background:#f7f1e7;padding:18px"><strong>Product total: $${Number(order.subtotal).toLocaleString()}</strong><br/>Advance: ${advanceLabel}<br/>Delivery estimate: ${deliveryEstimate}<br/>Payment status: ${escapeHtml(statusLabel(order.payment_status))}</div><p>${paymentInstructions}</p>${bankDetails}<p style="margin:24px 0"><a href="${escapeHtml(trackUrl)}" style="display:inline-block;background:#211f1b;color:white;text-decoration:none;padding:12px 18px">View order details</a></p><p>With thanks,<br/><strong>The ${brandName} Team</strong></p>${contact ? `<hr style="border:0;border-top:1px solid #e6dfd2;margin:24px 0"/><p><strong>Contact</strong></p>${contact}` : ""}</div>`;
}
