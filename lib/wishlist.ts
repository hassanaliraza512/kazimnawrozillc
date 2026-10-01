export const WISHLIST_STORAGE_KEY = 'kazim-nawrozi-wishlist';
export const WISHLIST_CHANGE_EVENT = 'wishlistchange';

export function readWishlist(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored: unknown = JSON.parse(localStorage.getItem(WISHLIST_STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored.filter((slug): slug is string => typeof slug === 'string') : [];
  } catch {
    return [];
  }
}

export function toggleWishlistProduct(productSlug: string): boolean {
  const wishlist = readWishlist();
  const nextWishlist = wishlist.includes(productSlug)
    ? wishlist.filter(slug => slug !== productSlug)
    : [...wishlist, productSlug];

  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(nextWishlist));
  } catch {
    // Keep the current-page control responsive when browser storage is unavailable.
  }

  window.dispatchEvent(new Event(WISHLIST_CHANGE_EVENT));
  return nextWishlist.includes(productSlug);
}