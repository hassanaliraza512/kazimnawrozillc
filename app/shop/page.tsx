import Link from "next/link";
import { Suspense } from "react";
import CartLink from "@/components/CartLink";
import BrandLogo from "@/components/BrandLogo";
import SiteFooter from "@/components/SiteFooter";
import ShopCatalog from "@/components/ShopCatalog";

export default function ShopPage(){
  return <main className="min-h-screen"><header className="border-b border-[var(--line)] bg-[var(--paper)]"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"><BrandLogo href="/" compact className="shrink-0" /><div className="flex items-center gap-6"><Link href="/" className="hidden text-sm sm:block">Home</Link><CartLink/></div></div></header><section className="mx-auto max-w-7xl px-6 pb-16 pt-16"><p className="text-sm uppercase tracking-[.22em] text-[var(--terracotta)]">The Collection</p><div className="mt-3 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><h1 className="text-5xl">Rugs & Kilims</h1><p className="mt-4 max-w-2xl leading-7 text-[var(--muted)]">Explore our curated selection of Afghan handwoven rugs and kilims.</p></div></div><Suspense fallback={<div className="py-12 text-sm text-[var(--muted)]">Loading collection…</div>}><ShopCatalog/></Suspense></section><SiteFooter/></main>
}
