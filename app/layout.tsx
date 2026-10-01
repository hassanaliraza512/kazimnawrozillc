import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import ChatBot from "@/components/ChatBot";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Kazim Nawrozi LLC | Afghan Handwoven Rugs & Kilims", template: "%s | Kazim Nawrozi LLC" },
  description: "Discover Afghan handwoven rugs and kilims selected for craftsmanship, character, and timeless beauty.",
  keywords: ["Afghan rugs", "Afghan kilims", "handwoven rugs", "Afghanistan rugs", "Kazim Nawrozi LLC"],
  authors: [{ name: "Kazim Nawrozi LLC" }],
  icons: {
    icon: "/logo.jpg",
  },
  openGraph: {
    title: "Kazim Nawrozi LLC | Afghan Handwoven Rugs & Kilims",
    description: "Every Thread Tells a Story — discover Afghan handwoven rugs and kilims.",
    url: siteUrl,
    siteName: "Kazim Nawrozi LLC",
    type: "website",
    images: [{ url: "/logo.jpg", alt: "Kazim Nawrozi LLC logo" }],
  },
  twitter: { card: "summary_large_image", title: "Kazim Nawrozi LLC", description: "Every Thread Tells a Story.", images: ["/logo.jpg"] },
  robots: { index: true, follow: true },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Kazim Nawrozi LLC",
    url: siteUrl,
    slogan: "Every Thread Tells a Story",
    description: "Afghan handwoven rugs and kilims curated for homes in the United States.",
  };
  return <html lang="en"><body><script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}} /><CartProvider>{children}<ChatBot/></CartProvider></body></html>;
}
