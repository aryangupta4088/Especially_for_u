import { categories, deliveryAreas, deliverySlots, storeSettings } from '../src/mockData.js';

// Product records are created in Studio and stored in MySQL; never expose demo
// products as a startup or database fallback.
export const catalogProducts = [];

export const catalogCategories = categories;
export const catalogDeliveryAreas = deliveryAreas;
export const catalogDeliverySlots = deliverySlots;
export const catalogStoreSettings = storeSettings;

export function publicProduct(product) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    type: product.type,
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
    options: (product.options ?? []).map((option) => ({
      label: option.label,
      values: (option.values ?? []).map((value) => ({ name: value.name })),
    })),
  };
}
