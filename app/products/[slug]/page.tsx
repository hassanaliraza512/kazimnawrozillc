import Link from "next/link";
import { ArrowLeft, Truck, RotateCcw, ShieldCheck } from "lucide-react";
import CartLink from "@/components/CartLink";
import BrandLogo from "@/components/BrandLogo";
import SiteFooter from "@/components/SiteFooter";
import AddToCartButton from "@/components/AddToCartButton";
import InventoryStatus from "@/components/InventoryStatus";
import ProductGallery from "@/components/ProductGallery";
import WishlistButton from "@/components/WishlistButton";
import { notFound } from "next/navigation";
import { getDbProduct } from "@/lib/db-products";
export const dynamic = "force-dynamic";
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getDbProduct(slug);
  if (!product) notFound();
  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <BrandLogo href="/" compact className="shrink-0" />
          <div className="flex items-center gap-6">
            <Link href="/shop" className="text-sm">
              Shop
            </Link>
            <CartLink />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"
        >
          <ArrowLeft size={15} /> Back to collection
        </Link>
        <div className="mt-8 grid gap-12 md:grid-cols-2">
          <ProductGallery
            images={product.images?.length ? product.images : [product.image]}
            name={product.name}
          />
          <div className="py-2">
            {product.new_arrival && (
              <span className="mr-2 inline-flex bg-[var(--ivory)] px-3 py-1 text-xs uppercase tracking-[.16em]">
                New Arrival
              </span>
            )}
            {product.featured && (
              <span className="inline-flex bg-[var(--ivory)] px-3 py-1 text-xs uppercase tracking-[.16em]">
                Featured
              </span>
            )}
            {!product.new_arrival && !product.featured && product.badge && (
              <span className="text-xs uppercase tracking-[.2em] text-[var(--terracotta)]">
                {product.badge}
              </span>
            )}
            <p className="mt-4 text-xs uppercase tracking-[.2em] text-[var(--muted)]">
              {product.category}
            </p>
            <h1 className="mt-2 text-5xl leading-tight">{product.name}</h1>
            <p className="mt-5 text-2xl">
              ${Number(product.price).toLocaleString()}
            </p>
            <div className="mt-5">
              <InventoryStatus stock={product.stock} sold={product.sold} />
            </div>
            <p className="mt-6 leading-8 text-[var(--muted)]">
              {product.description || "Product description coming soon."}
            </p>
            <div className="mt-8 grid grid-cols-2 border-y border-[var(--line)] py-6 text-sm">
              <div>
                <span className="text-[var(--muted)]">Material</span>
                <br />
                <strong>{product.material || "—"}</strong>
              </div>
              <div>
                <span className="text-[var(--muted)]">Dimensions</span>
                <br />
                <strong>{product.dimensions || product.size || "—"}</strong>
              </div>
              <div className="mt-5">
                <span className="text-[var(--muted)]">Origin</span>
                <br />
                <strong>{product.origin || "—"}</strong>
              </div>
              <div className="mt-5">
                <span className="text-[var(--muted)]">Weaving method</span>
                <br />
                <strong>{product.weaving_method || "—"}</strong>
              </div>
              <div className="mt-5">
                <span className="text-[var(--muted)]">Stock quantity</span>
                <br />
                <strong>
                  {product.sold
                    ? "Sold"
                    : Math.max(0, Number(product.stock ?? 0))}
                </strong>
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <AddToCartButton product={product} />
              <WishlistButton
                productSlug={product.slug}
                className="border border-[var(--line)] px-5 text-[var(--muted)] hover:text-[var(--burgundy)]"
              />
            </div>
            <Link
              href="/cart"
              className="mt-3 flex w-full items-center justify-center border border-[var(--charcoal)] px-6 py-4 text-sm font-semibold"
            >
              View bag & checkout
            </Link>
            <div className="mt-10 space-y-5 text-sm">
              <div className="flex gap-4">
                <Truck size={20} />
                <span>
                  <strong>Flexible delivery</strong>
                  <br />
                  Choose Standard Delivery or Local Pickup at checkout.
                </span>
              </div>
              <div className="flex gap-4">
                <RotateCcw size={20} />
                <span>
                  <strong>Returns</strong>
                  <br />
                  See our return policy for eligible items.
                </span>
              </div>
              <div className="flex gap-4">
                <ShieldCheck size={20} />
                <span>
                  <strong>Authenticity</strong>
                  <br />
                  Every listing identifies its material and origin.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
