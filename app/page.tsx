import Link from "next/link";
import { ArrowRight, Heart, ShieldCheck, Truck, Sparkles } from "lucide-react";
import CartLink from "@/components/CartLink";
import FeaturedProductsSlider from "@/components/FeaturedProductsSlider";
import BrandLogo from "@/components/BrandLogo";
import SiteFooter from "@/components/SiteFooter";
import SubscribeForm from "@/components/SubscribeForm";
import { getDbProducts } from "@/lib/db-products";
import { defaultHomepageContent, getHomepageContent } from "@/lib/site-content";
export const dynamic = "force-dynamic";
const collections = [
  {
    name: "Handwoven Rugs",
    category: "rugs",
    image:
      "https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Afghan Kilims",
    category: "kilims",
    image:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Traditional Styles",
    category: "",
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85",
  },
];
export default async function Home() {
  let products: Awaited<ReturnType<typeof getDbProducts>> = [];
  let homepageContent = defaultHomepageContent;
  try {
    products = await getDbProducts();
  } catch {}
  try {
    homepageContent = await getHomepageContent();
  } catch {}
  const featured = products.filter((p) => p.featured);
  const selected = featured.length ? featured : products;
  const newArrivals = products.slice(0, 6);
  return (
    <main className="home-page">
      <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[rgba(255,253,248,.94)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <BrandLogo
            href="/"
            compact
            showName
            className="shrink-0"
          />
          <nav className="hidden gap-8 text-sm md:flex">
            <Link href="/shop">Shop</Link>
            <a href="#story">Our Story</a>
            <a href="#collections">Collections</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="flex items-center gap-5">
            <CartLink />
            <Link
              href="/shop"
              className="border border-[var(--charcoal)] px-5 py-2 text-sm"
            >
              Shop Rugs
            </Link>
          </div>
        </div>
      </header>
      {homepageContent.tickerMessages.length > 0 && (
        <section className="home-ticker" aria-label="Latest headlines">
          <span className="home-ticker-label">Latest</span>
          <p className="sr-only">{homepageContent.tickerMessages.join(". ")}</p>
          <div className="home-ticker-viewport" aria-hidden="true">
            <div className="home-ticker-track">
              {[0, 1].map((copy) => (
                <div className="home-ticker-group" key={copy}>
                  {homepageContent.tickerMessages.map((message, index) => (
                    <span className="home-ticker-item" key={`${copy}-${index}`}>
                      <span className="home-ticker-dot" />
                      {message}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      <section className="home-hero relative min-h-[72vh] overflow-hidden">
        <img
          src={homepageContent.heroImage}
          alt="Afghan handwoven rugs and kilims"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative mx-auto flex min-h-[72vh] max-w-7xl items-end px-6 pb-20 text-white">
          <div className="max-w-3xl">
            <p className="mb-5 text-sm uppercase tracking-[.28em]">
              Every Thread Tells a Story
            </p>
            <p className="mb-5 text-xs uppercase tracking-[.18em] text-white/70">
              {homepageContent.heroEyebrow}
            </p>
            <h1 className="text-5xl leading-tight md:text-7xl">
              {homepageContent.heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/90">
              {homepageContent.heroDescription}
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-flex items-center gap-3 bg-white px-7 py-4 text-sm font-semibold text-[var(--charcoal)]"
            >
              Explore the collection <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
      <section id="collections" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-sm uppercase tracking-[.22em] text-[var(--terracotta)]">
              Collections
            </p>
            <h2 className="mt-2 text-4xl">Find your piece</h2>
          </div>
          <Link
            href="/shop"
            className="hidden items-center gap-2 text-sm md:flex"
          >
            View all <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {collections.map((i) => (
            <Link
              href={i.category ? `/shop?category=${i.category}` : "/shop"}
              key={i.name}
              className="group relative h-[420px] overflow-hidden"
            >
              <img
                src={i.image}
                alt={i.name}
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
              <div className="absolute bottom-0 p-7 text-white">
                <h3 className="text-3xl">{i.name}</h3>
                <span className="mt-2 inline-flex items-center gap-2 text-sm">
                  Explore <ArrowRight size={15} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      {newArrivals.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pb-20">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[.22em] text-[var(--terracotta)]">
              Just added
            </p>
            <h2 className="mt-2 text-4xl">New arrivals</h2>
            <p className="mt-3 text-sm text-[var(--muted)]">
              The latest pieces added to our collection.
            </p>
          </div>
          <FeaturedProductsSlider products={newArrivals} label="new arrivals" />
        </section>
      )}
      <section className="bg-[var(--ivory)] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10">
            <p className="text-sm uppercase tracking-[.22em] text-[var(--terracotta)]">
              Featured
            </p>
            <h2 className="mt-2 text-4xl">Selected pieces</h2>
          </div>
          {selected.length ? (
            <FeaturedProductsSlider products={selected} />
          ) : (
            <p className="text-[var(--muted)]">
              Your featured collection will appear here.
            </p>
          )}
        </div>
      </section>
      <section
        id="story"
        className="mx-auto grid max-w-7xl gap-12 px-6 py-24 md:grid-cols-2 md:items-center"
      >
        <img
          src={collections[0].image}
          alt="Traditional rug detail"
          className="aspect-[4/5] w-full object-cover"
        />
        <div>
          <p className="text-sm uppercase tracking-[.22em] text-[var(--terracotta)]">
            Our story
          </p>
          <h2 className="mt-3 text-5xl leading-tight">
            Tradition, brought home.
          </h2>
          <p className="mt-4 text-sm uppercase tracking-[.2em] text-[var(--terracotta)]">
            Every Thread Tells a Story
          </p>
          <p className="mt-6 leading-8 text-[var(--muted)]">
            Kazim Nawrozi LLC brings Afghan handwoven rugs and kilims to
            customers in the United States. Each piece celebrates traditional
            weaving, natural character, and the individuality that makes a
            handmade rug special.
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-flex items-center gap-2 border-b border-[var(--charcoal)] pb-2 text-sm font-semibold"
          >
            Discover the collection <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <section className="border-y border-[var(--line)] py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 md:grid-cols-4">
          {[
            [
              ShieldCheck,
              "Authentic Craftsmanship",
              "Handwoven pieces with character.",
            ],
            [Sparkles, "Curated Collection", "Selected for quality and style."],
            [Truck, "USA Delivery", "Convenient shipping for your home."],
            [Heart, "Personal Service", "We care about every purchase."],
          ].map(([Icon, title, text]) => {
            const C = Icon as typeof ShieldCheck;
            return (
              <div key={String(title)} className="flex gap-4">
                <C size={23} strokeWidth={1.5} />
                <div>
                  <h3 className="font-semibold">{String(title)}</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    {String(text)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section
        id="contact"
        className="bg-[var(--charcoal)] px-6 py-20 text-white"
      >
        {homepageContent.subscribeEnabled && (
          <div className="mx-auto max-w-7xl text-center">
            <p className="text-sm uppercase tracking-[.22em] text-white/60">
              {homepageContent.brandName}
            </p>
            <h2 className="mt-3 text-4xl">
              {homepageContent.subscribeHeading}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-white/70">
              {homepageContent.subscribeDescription}
            </p>
            <SubscribeForm
              placeholder={homepageContent.subscribePlaceholder}
              buttonLabel={homepageContent.subscribeButtonLabel}
              successMessage={homepageContent.subscribeSuccessMessage}
            />
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
