import { NextResponse } from "next/server";
import { ADMIN_COOKIE, authenticateUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Enter your username and password." },
      { status: 400 },
    );
  }

  const username = String(body.username || body.email || "").trim();
  const password = String(body.password || "");
  if (!username || !password) {
    return NextResponse.json(
      { error: "Enter your username and password." },
      { status: 400 },
    );
  }

  try {
    const authenticated = await authenticateUser(username, password);
    if (!authenticated) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({
      ok: true,
      session: authenticated.session,
    });
    response.cookies.set(ADMIN_COOKIE, authenticated.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 604800,
    });
    return response;
  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);
    return NextResponse.json(
      { error: "Sign-in is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
