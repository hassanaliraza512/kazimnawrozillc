import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getHomepageContent } from "@/lib/site-content";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!getHomepageContent().subscribeEnabled) {
      return NextResponse.json({ error: "Subscriptions are currently closed." }, { status: 403 });
    }

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const db = getDb();
    db
      .prepare(
        `INSERT INTO mailing_list_subscribers(email,created_at,updated_at) VALUES(?,?,?)
         ON CONFLICT(email) DO UPDATE SET updated_at=excluded.updated_at,delivery_error=''`,
      )
      .run(email, new Date().toISOString(), new Date().toISOString());

    const subscriber = db
      .prepare("SELECT status FROM mailing_list_subscribers WHERE email=?")
      .get(email) as { status: string };

    return NextResponse.json({ ok: true, status: subscriber.status });
  } catch {
    return NextResponse.json({ error: "Subscription could not be completed." }, { status: 500 });
  }
}