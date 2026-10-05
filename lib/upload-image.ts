export async function uploadImage(file: File, endpoint: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });
  const responseText = await response.text();

  let result: { url?: unknown; error?: unknown };
  try {
    result = JSON.parse(responseText) as { url?: unknown; error?: unknown };
  } catch {
    const detail = responseText.trim().slice(0, 300);
    throw new Error(
      detail
        ? `Image upload failed (HTTP ${response.status}): ${detail}`
        : `Image upload returned an invalid response (HTTP ${response.status}).`,
    );
  }

  if (!response.ok) {
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : `Image upload failed (HTTP ${response.status}).`,
    );
  }
  if (typeof result.url !== "string" || !result.url) {
    throw new Error("Image storage returned no image URL.");
  }

  return result.url;
}
