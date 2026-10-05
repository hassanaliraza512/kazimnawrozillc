import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";
import type { Permission } from "@/lib/auth";
import { requirePermission } from "@/lib/auth";

const allowedContentTypes = ["image/jpeg", "image/png", "image/webp"];
const maximumSizeInBytes = 8 * 1024 * 1024;

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

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Image storage is not configured. Connect a public Vercel Blob store to this project and redeploy.",
      },
      { status: 503 },
    );
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid upload request. Please retry the image upload." },
      { status: 400 },
    );
  }

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        const allowedPath = new RegExp(
          `^${folder}/[0-9a-f-]{36}\\.(jpg|png|webp)$`,
          "i",
        );
        if (!allowedPath.test(pathname)) {
          throw new Error("Invalid image upload path.");
        }

        return {
          allowedContentTypes,
          maximumSizeInBytes,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(`${folder.toUpperCase()} IMAGE UPLOAD ERROR:`, error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Image upload could not be started. Please try again.",
      },
      { status: 400 },
    );
  }
}
