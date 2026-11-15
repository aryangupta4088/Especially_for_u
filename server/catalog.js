import { categories, deliveryAreas, deliverySlots, storeSettings } from '../src/mockData.js';

// Product records are created in Studio and stored in MySQL; never expose demo
// products as a startup or database fallback.
export const catalogProducts = [];

export const catalogCategories = categories;
export const catalogDeliveryAreas = deliveryAreas;
export const catalogDeliverySlots = deliverySlots;
export const catalogStoreSettings = storeSettings;

export function publicProduct(product) {
  const now = Date.now();
  const startsAt = product.saleStartsAt || product.sale_starts_at;
  const endsAt = product.saleEndsAt || product.sale_ends_at;
  const hasSaleWindow = Boolean(startsAt || endsAt);
  const saleActive = Boolean(product.originalPrice) && (!hasSaleWindow || ((!startsAt || new Date(startsAt).getTime() <= now) && (!endsAt || new Date(endsAt).getTime() >= now)));
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    type: product.type,
    price: saleActive ? product.price : (product.originalPrice ?? product.price),
    originalPrice: saleActive ? (product.originalPrice ?? null) : null,
    saleStartsAt: saleActive ? (startsAt || null) : null,
    saleEndsAt: saleActive ? (endsAt || null) : null,
    startingFrom: Boolean(product.startingFrom),
    badge: product.badge,
    production: product.production,
    description: product.description,
    image: product.image,
    occasions: product.occasions ?? [],
    audience: product.audience,
    customizable: Boolean(product.customizable),
    allowCustomRequest: product.allowCustomRequest !== false,
    isMadeToOrder: product.isMadeToOrder !== false,
    returnable: Boolean(product.returnable),
    disclaimer: product.disclaimer,
    careInstructions: product.careInstructions,
    options: product.options ?? [],
  };
}
