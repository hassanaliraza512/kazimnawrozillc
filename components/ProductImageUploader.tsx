"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";

const maximumSizeInBytes = 8 * 1024 * 1024;

function extensionFor(file: File) {
  switch (file.type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      throw new Error("Only JPG, PNG, and WebP images are allowed.");
  }
}

export default function ProductImageUploader({
  images,
  onChange,
}: {
  images: string[];
  onChange: (value: string[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function uploadImages(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    setBusy(true);
    setMessage("");
    const uploaded: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (file.size > maximumSizeInBytes) {
          throw new Error(`${file.name} is larger than the 8 MB image limit.`);
        }

        const extension = extensionFor(file);
        const blob = await upload(
          `products/${crypto.randomUUID()}.${extension}`,
          file,
          {
            access: "public",
            contentType: file.type,
            handleUploadUrl: "/api/admin/upload",
            multipart: file.size > 4.5 * 1024 * 1024,
          },
        );
        uploaded.push(blob.url);
        onChange([...images, ...uploaded]);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Image upload failed.",
      );
    } finally {
      setBusy(false);
      if (input.current) {
        input.current.value = "";
      }
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="inline-flex items-center gap-2 border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold disabled:opacity-50"
      >
        <input
          ref={input}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => uploadImages(event.target.files)}
        />
        {busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Upload size={16} />
        )}
        {busy ? "Uploading…" : "Upload from device"}
      </button>
      <p className="text-xs text-[var(--muted)]">
        Images are stored in Vercel Blob. JPG, PNG or WebP · 8 MB max each.
      </p>
      {message && <p className="text-sm text-red-700">{message}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((url, index) => (
          <div
            key={`${url}${index}`}
            className="relative overflow-hidden border border-[var(--line)]"
          >
            <img
              src={url}
              alt={`Product ${index + 1}`}
              className="aspect-square w-full object-cover"
            />
            <button
              type="button"
              onClick={() =>
                onChange(images.filter((_, imageIndex) => imageIndex !== index))
              }
              className="absolute right-2 top-2 rounded-full bg-white p-1 shadow"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
