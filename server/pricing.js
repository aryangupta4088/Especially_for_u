import { z } from 'zod';

export const orderInputSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(180),
    phone: z.string().trim().regex(/^\+?91[6-9]\d{9}$|^[6-9]\d{9}$/, 'Enter a valid Indian mobile number'),
    note: z.string().trim().max(1000).optional().default(''),
  }),
  items: z.array(z.object({
    productId: z.string().trim().min(1).max(80),
    quantity: z.number().int().min(1).max(20),
    selected: z.array(z.object({ label: z.string().max(80), value: z.string().max(120), adjustment: z.number().int().min(0).max(100000) })).max(10).optional().default([]),
    customization: z.record(z.string(), z.unknown()).optional().default({}),
  })).min(1).max(25),
  delivery: z.object({
    area: z.string().trim().min(2).max(160),
    method: z.enum(['campus', 'home']),
    handoverSpot: z.string().trim().min(1).max(120),
    slotId: z.string().trim().max(80).optional().default(''),
    locationText: z.string().trim().min(1).max(240),
    pickupDate: z.string().trim().min(1).max(40),
  }),
  gift: z.object({
    isGift: z.boolean().default(false),
    recipientName: z.string().trim().max(120).optional().default(''),
    recipientPhone: z.string().trim().max(20).optional().default(''),
    message: z.string().trim().max(300).optional().default(''),
    hideSender: z.boolean().default(false),
    giftWrap: z.boolean().default(false),
  }).optional().default({}),
  paymentPlan: z.string().trim().max(60).optional(),
});

export const customRequestSchema = z.object({
  productId: z.string().trim().max(80).optional().default(''),
  title: z.string().trim().min(3).max(160),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(180),
    phone: z.string().trim().regex(/^\+?91[6-9]\d{9}$|^[6-9]\d{9}$/, 'Enter a valid Indian mobile number'),
  }),
  description: z.string().trim().min(10).max(5000),
  neededBy: z.string().trim().max(40).optional().default(''),
  budget: z.string().trim().max(80).optional().default(''),
  referenceUrls: z.array(z.string().url()).max(5).optional().default([]),
  size: z.string().trim().max(120).optional().default(''),
  colours: z.string().trim().max(240).optional().default(''),
  occasion: z.string().trim().max(80).optional().default(''),
});

export function calculateOrder(input, catalog, storeSettings) {
  const lineItems = input.items.map((item) => {
    const product = catalog.find((candidate) => candidate.id === item.productId);
    if (!product) throw new Error(`Product ${item.productId} is unavailable`);
    const optionAdjustment = item.selected.reduce((sum, option) => sum + option.adjustment, 0);
    const unitPrice = product.price + optionAdjustment;
    return {
      productId: product.id,
      productName: product.name,
      type: product.type,
      quantity: item.quantity,
      unitPrice,
      selected: item.selected,
      customization: item.customization,
      lineTotal: unitPrice * item.quantity,
    };
  });

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const hasCustomItem = lineItems.some((item) => item.type === 'CUSTOM_FIXED' || item.type === 'CUSTOM_QUOTE');
  const isManualLocation = input.delivery.area === 'Other location in Muradnagar';
  const deliveryFee = input.delivery.method === 'home' && subtotal < 1000 ? 50 : 0;
  const giftWrapFee = input.gift.giftWrap ? Number(storeSettings.giftWrapPrice || 79) : 0;
  const total = subtotal + deliveryFee + giftWrapFee;
  const advanceDue = hasCustomItem ? Math.ceil(total * 0.5) : total > 1000 ? Math.ceil(total * 0.5) : total > 300 && input.paymentPlan === 'COD_WITH_ADVANCE' ? 100 : input.paymentPlan === 'FULL_ONLINE' ? total : 0;
  const balanceDue = Math.max(0, total - advanceDue);
  const paymentOptions = hasCustomItem || total > 1000 ? ['ADVANCE_50'] : total <= 300 ? ['FULL_ONLINE', 'COD'] : ['FULL_ONLINE', 'COD_WITH_ADVANCE'];

  return {
    lineItems,
    subtotal,
    deliveryFee,
    giftWrapFee,
    total,
    advanceDue,
    balanceDue,
    hasCustomItem,
    locationApproval: isManualLocation ? 'PENDING' : 'NOT_NEEDED',
    paymentOptions,
    paymentPlan: hasCustomItem ? 'ADVANCE_50' : input.paymentPlan || paymentOptions[0],
  };
}
