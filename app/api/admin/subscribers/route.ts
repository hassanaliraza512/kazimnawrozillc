import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getHomepageContent } from "@/lib/site-content";
import { getStoreEmailSender } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

export async function GET() {
  if (!(await requirePermission("orders"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM mailing_list_subscribers ORDER BY created_at DESC LIMIT 500")
    .all();
  return NextResponse.json(
    {
      rows,
      emailConfigured: Boolean(process.env.SMTP_HOST && (process.env.SMTP_FROM || process.env.SMTP_USER)),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!(await requirePermission("orders"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      return NextResponse.json({ error: "Choose a valid subscriber." }, { status: 400 });
    }

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM || user;
    if (!host || !from) {
      return NextResponse.json(
        { error: "Email is not configured. Add SMTP_HOST and SMTP_FROM (or SMTP_USER) first." },
        { status: 503 },
      );
    }

    const db = getDb();
    const subscriber = db
      .prepare("SELECT id,email,status FROM mailing_list_subscribers WHERE id=?")
      .get(id) as { id: number; email: string; status: string } | undefined;
    if (!subscriber) {
      return NextResponse.json({ error: "Subscriber not found." }, { status: 404 });
    }
    if (subscriber.status === "approved") {
      return NextResponse.json({ error: "This subscriber is already approved." }, { status: 409 });
    }
    if (subscriber.status !== "pending") {
      return NextResponse.json({ error: "This subscriber is already being processed." }, { status: 409 });
    }

    const claimed = db
      .prepare("UPDATE mailing_list_subscribers SET status='sending',delivery_error='' WHERE id=? AND status='pending'")
      .run(id);
    if (Number(claimed.changes) !== 1) {
      return NextResponse.json({ error: "This subscriber is already being processed." }, { status: 409 });
    }

    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: user && password ? { user, pass: password } : undefined,
      });
      const content = getHomepageContent();
      const brandName = content.brandName.replace(/[\r\n]+/g, " ").trim();
      const safeBrandName = escapeHtml(brandName);
      const publicUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
      const logoUrl = new URL(content.brandLogo, publicUrl).toString();
      const contactLines = [
        content.brandContactEmail ? `Email: ${content.brandContactEmail}` : "",
        content.brandContactPhone ? `Phone: ${content.brandContactPhone}` : "",
        content.brandContactAddress ? `Address: ${content.brandContactAddress}` : "",
      ].filter(Boolean);
      const contactHtml = contactLines.length
        ? `<hr style="border:0;border-top:1px solid #e7e1d8;margin:24px 0"/><p style="margin:0 0 8px"><strong>Questions? Contact us:</strong></p>${contactLines.map((line) => `<p style="margin:4px 0">${escapeHtml(line)}</p>`).join("")}`
        : "";
      await transporter.sendMail({
        from: getStoreEmailSender(brandName, from),
        to: subscriber.email,
        subject: `You're on the list | ${brandName}`,
        text: [
          `Hello,`,
          ``,
          `Your request to receive email updates from ${brandName} has been approved.`,
          `Thank you for subscribing. We'll share new arrivals, collection updates, and stories behind the craft.`,
          ``,
          `With heartfelt thanks,`,
          `The ${brandName} Team`,
          ...(contactLines.length ? ["", "Contact us:", ...contactLines] : []),
        ].join("\n"),
        html: `<div style="max-width:620px;margin:0 auto;padding:32px 24px;color:#27231f;font-family:Arial,Helvetica,sans-serif;line-height:1.65"><div style="margin-bottom:28px;text-align:center"><img src="${escapeHtml(logoUrl)}" alt="${safeBrandName}" width="150" style="display:inline-block;width:150px;height:auto;max-height:120px;object-fit:contain"/></div><p>Hello,</p><h1 style="font-size:26px;font-weight:600;line-height:1.25">You're on the list!</h1><p>Your request to receive email updates from <strong>${safeBrandName}</strong> has been approved.</p><p>Thank you for subscribing. We'll share new arrivals, collection updates, and stories behind the craft.</p><p style="margin-top:28px">With heartfelt thanks,<br/><strong>The ${safeBrandName} Team</strong></p>${contactHtml}</div>`,
      });

      const sentAt = new Date().toISOString();
      db.prepare(
        "UPDATE mailing_list_subscribers SET status='approved',approved_at=?,email_sent_at=?,delivery_error='' WHERE id=?",
      ).run(sentAt, sentAt, id);
      return NextResponse.json({ ok: true });
    } catch (deliveryError) {
      const error = deliveryError instanceof Error ? deliveryError.message : "Email delivery failed.";
      db.prepare(
        "UPDATE mailing_list_subscribers SET status='pending',delivery_error=? WHERE id=?",
      ).run(error.slice(0, 500), id);
      return NextResponse.json({ error: `Email could not be sent: ${error}` }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "Subscriber approval could not be completed." }, { status: 400 });
  }
}