import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { Permission } from "@/lib/auth";
import { requirePermission } from "@/lib/auth";

const allowedContentTypes = ["image/jpeg", "image/png", "image/webp"];
const maximumSizeInBytes = 4 * 1024 * 1024;

export async function handleAuthorizedImageUpload(
  request: Request,
  permission: Permission,
  folder: "products" | "site",
) {
  try {
    if (!(await requirePermission(permission))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch (error) {
    console.error(`${folder.toUpperCase()} IMAGE UPLOAD AUTH ERROR:`, error);
    return NextResponse.json(
      { error: "Unable to verify upload permissions. Please sign in again." },
      { status: 503 },
    );
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return NextResponse.json(
      { error: "Invalid image upload. Please select the image and retry." },
      { status: 400 },
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Choose an image file to upload." },
      { status: 400 },
    );
  }
  if (!allowedContentTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPG, PNG, and WebP images are allowed." },
      { status: 400 },
    );
  }
  if (file.size > maximumSizeInBytes) {
    return NextResponse.json(
      { error: "Images must be 4 MB or smaller. Please resize and retry." },
      { status: 413 },
    );
  }

  const extension =
    file.type === "image/jpeg"
      ? "jpg"
      : file.type === "image/png"
        ? "png"
        : "webp";

  try {
    const blob = await put(
      `${folder}/${randomUUID()}.${extension}`,
      file,
      {
        access: "private",
        addRandomSuffix: true,
        contentType: file.type,
      },
    );

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error(`${folder.toUpperCase()} IMAGE UPLOAD ERROR:`, error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Image storage rejected the upload: ${error.message}`
            : "Image could not be saved. Check the Blob store configuration and retry.",
      },
      { status: 502 },
    );
  }
}
