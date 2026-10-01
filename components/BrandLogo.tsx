"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type BrandLogoProps = {
  href?: string;
  className?: string;
  imageClassName?: string;
  compact?: boolean;
  showName?: boolean;
  name?: string;
};

export default function BrandLogo({
  href = "/",
  className = "",
  imageClassName = "",
  compact = false,
  showName = false,
  name,
}: BrandLogoProps) {
  const [brand, setBrand] = useState({ logo: "/logo.jpg", name: "Kazim Nawrozi LLC" });
  const sizeClass = compact ? "h-12 w-auto md:h-14" : "h-16 w-auto md:h-20";

  useEffect(() => {
    let active = true;
    fetch("/api/site-content", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (active) {
          setBrand({
            logo: typeof data.brandLogo === "string" ? data.brandLogo : "/logo.jpg",
            name: typeof data.brandName === "string" ? data.brandName : "Kazim Nawrozi LLC",
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <Link href={href} className={`inline-flex items-center gap-3 ${className}`}>
      <Image
        src={brand.logo}
        alt={`${brand.name} logo`}
        width={compact ? 180 : 260}
        height={compact ? 180 : 260}
        priority
        unoptimized
        className={`${sizeClass} object-contain ${imageClassName}`}
      />
      {showName && (
        <div className="leading-none text-left">
          <span className="block text-base font-semibold tracking-wide text-[var(--charcoal)] md:text-lg">
            {name ?? brand.name}
          </span>
        </div>
      )}
    </Link>
  );
}
