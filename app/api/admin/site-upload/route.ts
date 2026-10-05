import { handleAuthorizedImageUpload } from "@/lib/blob-upload";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleAuthorizedImageUpload(request, "settings", "site");
}
