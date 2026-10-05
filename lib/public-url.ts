function configuredOrigin(value: string, name: string) {
  const candidate = value.startsWith("http") ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error(`${name} must be a valid public site URL.`);
  }

  if (
    url.protocol !== "https:" &&
    !(process.env.NODE_ENV !== "production" && url.hostname === "localhost")
  ) {
    throw new Error(`${name} must use HTTPS.`);
  }

  return url.origin;
}

export function getPublicSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    return configuredOrigin(
      process.env.NEXT_PUBLIC_SITE_URL.trim(),
      "NEXT_PUBLIC_SITE_URL",
    );
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()) {
    return configuredOrigin(
      process.env.VERCEL_PROJECT_PRODUCTION_URL.trim(),
      "VERCEL_PROJECT_PRODUCTION_URL",
    );
  }

  if (process.env.VERCEL_URL?.trim()) {
    return configuredOrigin(process.env.VERCEL_URL.trim(), "VERCEL_URL");
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  throw new Error(
    "Set NEXT_PUBLIC_SITE_URL or configure the Vercel deployment URL to generate links in email.",
  );
}

export function getPublicAssetUrl(assetPath: string) {
  const siteUrl = getPublicSiteUrl();
  let url: URL;
  try {
    url = new URL(assetPath, `${siteUrl}/`);
  } catch {
    throw new Error("The configured email image URL is invalid.");
  }

  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("Email image URLs must use HTTPS.");
  }

  return url.toString();
}
