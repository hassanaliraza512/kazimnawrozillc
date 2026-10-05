import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { getHomepageContent, saveHomepageContent } from "@/lib/site-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requirePermission("settings"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(await getHomepageContent(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PUT(request: Request) {
  if (!(await requirePermission("settings"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const content = await request.json();
    if (typeof content.heroImage !== "string" || !content.heroImage.trim()) {
      return NextResponse.json(
        { error: "Choose or upload a homepage hero image." },
        { status: 400 },
      );
    }

    if (typeof content.brandLogo !== "string" || !content.brandLogo.trim()) {
      return NextResponse.json(
        { error: "Choose or upload a brand logo." },
        { status: 400 },
      );
    }

    const image = content.heroImage.trim();
    if (!image.startsWith("/") && !/^https:\/\//i.test(image)) {
      return NextResponse.json(
        { error: "Hero image must be a local path or secure HTTPS URL." },
        { status: 400 },
      );
    }
    const logo = content.brandLogo.trim();
    if (!logo.startsWith("/") && !/^https:\/\//i.test(logo)) {
      return NextResponse.json(
        { error: "Brand logo must be a local path or secure HTTPS URL." },
        { status: 400 },
      );
    }
    if (typeof content.brandName !== "string" || !content.brandName.trim()) {
      return NextResponse.json(
        { error: "Enter a brand name." },
        { status: 400 },
      );
    }
    if (
      typeof content.bankName !== "string" ||
      !content.bankName.trim() ||
      typeof content.bankAccountNumber !== "string" ||
      !content.bankAccountNumber.trim() ||
      typeof content.bankBeneficiary !== "string" ||
      !content.bankBeneficiary.trim()
    ) {
      return NextResponse.json(
        { error: "Enter the bank name, account number, and beneficiary." },
        { status: 400 },
      );
    }

    return NextResponse.json(await saveHomepageContent(content));
  } catch {
    return NextResponse.json(
      { error: "Homepage settings could not be saved." },
      { status: 400 },
    );
  }
}