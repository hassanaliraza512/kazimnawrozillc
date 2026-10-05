import { NextResponse } from "next/server";
import { defaultHomepageContent, getHomepageContent } from "@/lib/site-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const content = await getHomepageContent();
  return NextResponse.json(
    {
      brandLogo: content.brandLogo || defaultHomepageContent.brandLogo,
      brandName: content.brandName || defaultHomepageContent.brandName,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}