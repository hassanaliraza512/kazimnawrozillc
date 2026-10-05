import { NextResponse } from "next/server";
import { execute, queryOne } from "@/lib/postgres";
import { getHomepageContent } from "@/lib/site-content";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!(await getHomepageContent()).subscribeEnabled) {
      return NextResponse.json({ error: "Subscriptions are currently closed." }, { status: 403 });
    }

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const now = new Date().toISOString();
    await execute(
      `INSERT INTO mailing_list_subscribers(email,created_at,updated_at)
       VALUES($1,$2,$2)
       ON CONFLICT(email)
       DO UPDATE SET updated_at=EXCLUDED.updated_at,delivery_error=''`,
      [email, now],
    );
    const subscriber = await queryOne<{ status: string }>(
      "SELECT status FROM mailing_list_subscribers WHERE email=$1",
      [email],
    );
    if (!subscriber) {
      throw new Error("Subscriber record was not persisted.");
    }

    return NextResponse.json({ ok: true, status: subscriber.status });
  } catch {
    return NextResponse.json({ error: "Subscription could not be completed." }, { status: 500 });
  }
}