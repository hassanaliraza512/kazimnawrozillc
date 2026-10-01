import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const routes = ["", "/shop", "/cart", "/checkout", "/admin/login"];
  return routes.map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: path === "/shop" ? "daily" : "weekly", priority: path === "" ? 1 : path === "/shop" ? 0.9 : 0.5 }));
}
