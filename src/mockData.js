export const media = {
  hero: '/manus-storage/async-images/1UOgKeG7Xb9ZDODjSJJ9EA/image-1.webp',
  collage: '/manus-storage/async-images/1UOgKeG7Xb9ZDODjSJJ9EA/image-2.webp',
  product1: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=900&q=85',
  product2: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=900&q=85',
  product3: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=85',
  product4: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=900&q=85',
  product5: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=900&q=85',
  product6: 'https://images.unsplash.com/photo-1531988042231-d39a9cc12a9a?auto=format&fit=crop&w=900&q=85',
  product7: 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=85',
  product8: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=900&q=85',
};

export const categories = [
  { id: 'gifts', name: 'Gifts', eyebrow: 'Little joys', description: 'Thoughtful pieces for the people who make life sweeter.', image: media.product2, size: 'wide' },
  { id: 'art', name: 'Custom Art', eyebrow: 'Made from a story', description: 'Paintings and keepsakes that feel like you.', image: media.product6, size: 'tall' },
  { id: 'decor', name: 'Room Décor', eyebrow: 'Soft corners', description: 'Tiny details that change the feeling of a room.', image: media.product5, size: 'standard' },
  { id: 'resin', name: 'Handmade & Resin', eyebrow: 'Cast slowly', description: 'Petals, shimmer and little worlds in clear resin.', image: media.product1, size: 'standard' },
  { id: 'memories', name: 'Memories', eyebrow: 'Keep close', description: 'Polaroids, letters and memory boxes.', image: media.product4, size: 'standard' },
  { id: 'fandom', name: 'Fandom', eyebrow: 'For your universe', description: 'Anime, Marvel and all the stories you love.', image: media.product7, size: 'wide' },
  { id: 'personalized', name: 'Personalized', eyebrow: 'Only yours', description: 'Names, dates and details that make it yours.', image: media.product3, size: 'standard' },
  { id: 'projects', name: 'Projects', eyebrow: 'Make it happen', description: 'School, college and creative project help.', image: media.product6, size: 'standard' },
  { id: 'signature', name: 'Signature', eyebrow: 'The keepsake edit', description: 'Premium creations for the biggest little moments.', image: media.product8, size: 'tall' },
];

export const products = [
  { id: 'p1', slug: 'petal-memory-box', name: 'Petal Memory Box', category: 'memories', type: 'CUSTOM_FIXED', price: 1299, originalPrice: 1599, badge: 'Bestseller', production: 'Ready in 4–6 days', description: 'A keepsake box layered with pressed blooms, tiny notes and the kind of memories you never want to lose.', image: media.product1, occasions: ['ANNIVERSARY', 'BIRTHDAY', 'JUST_BECAUSE'], audience: 'FOR_EVERYONE', customizable: true, premium: false, options: [{ label: 'Lid finish', values: [{ name: 'Clear gloss', adjustment: 0 }, { name: 'Pearl sheen', adjustment: 120 }] }, { label: 'Extra photo', values: [{ name: 'No extra photo', adjustment: 0 }, { name: 'Add one', adjustment: 80 }] }] },
  { id: 'p2', slug: 'soft-bloom-bouquet', name: 'Soft Bloom Bouquet', category: 'gifts', type: 'STANDARD', price: 899, originalPrice: 1099, badge: 'New', production: 'Ready in 2–3 days', description: 'A dreamy bouquet of everlasting blooms, ribbons and small surprises.', image: media.product2, occasions: ['BIRTHDAY', 'CELEBRATION', 'FOR_HER'], audience: 'FOR_HER', customizable: false, premium: false },
  { id: 'p3', slug: 'name-in-the-stars-frame', name: 'Name in the Stars Frame', category: 'art', type: 'CUSTOM_FIXED', price: 1599, originalPrice: null, badge: 'Made to order', production: 'Ready in 6–8 days', description: 'A personalised celestial frame made around a name, date or little promise.', image: media.product3, occasions: ['ANNIVERSARY', 'JUST_BECAUSE'], audience: 'FOR_EVERYONE', customizable: true, premium: false, options: [{ label: 'Frame color', values: [{ name: 'Cloud white', adjustment: 0 }, { name: 'Walnut', adjustment: 180 }] }, { label: 'Foil accent', values: [{ name: 'Silver', adjustment: 0 }, { name: 'Gold', adjustment: 100 }] }] },
  { id: 'p4', slug: 'polaroid-love-ladder', name: 'Polaroid Love Ladder', category: 'memories', type: 'CUSTOM_FIXED', price: 749, originalPrice: null, badge: 'Personalise it', production: 'Ready in 3–5 days', description: 'A little ladder of your favourite moments, finished with twine and tiny charms.', image: media.product4, occasions: ['FRIENDSHIP', 'ANNIVERSARY', 'GRADUATION'], audience: 'FOR_EVERYONE', customizable: true, premium: false, options: [{ label: 'Photo count', values: [{ name: '6 photos', adjustment: 0 }, { name: '10 photos', adjustment: 160 }] }] },
  { id: 'p5', slug: 'moonlit-room-lamp', name: 'Moonlit Room Lamp', category: 'decor', type: 'STANDARD', price: 2199, originalPrice: 2499, badge: 'Soft glow', production: 'Ready in 5–7 days', description: 'A warm little lamp for late-night ideas, slow mornings and cozy corners.', image: media.product5, occasions: ['JUST_BECAUSE', 'FESTIVE'], audience: 'FOR_EVERYONE', customizable: false, premium: false },
  { id: 'p6', slug: 'custom-story-painting', name: 'Custom Story Painting', category: 'art', type: 'CUSTOM_QUOTE', price: 2500, startingFrom: true, badge: 'Quote only', production: 'Crafted in 7–14 days', description: 'Tell us the scene, feeling or memory. We will turn it into a one-of-one painting.', image: media.product6, occasions: ['ANNIVERSARY', 'GRADUATION', 'JUST_BECAUSE'], audience: 'FOR_EVERYONE', customizable: true, premium: true },
  { id: 'p7', slug: 'resin-phone-cover', name: 'Pressed Bloom Phone Cover', category: 'personalized', type: 'CUSTOM_FIXED', price: 699, originalPrice: 799, badge: 'Customisable', production: 'Ready in 4–5 days', description: 'Pressed petals sealed in clear resin, with your name or favourite colour story.', image: media.product7, occasions: ['BIRTHDAY', 'FRIENDSHIP', 'JUST_BECAUSE'], audience: 'FOR_EVERYONE', customizable: true, premium: false, options: [{ label: 'Phone model', values: [{ name: 'iPhone 15', adjustment: 0 }, { name: 'Samsung S24', adjustment: 0 }, { name: 'Other model', adjustment: 60 }] }, { label: 'Finish', values: [{ name: 'Clear gloss', adjustment: 0 }, { name: 'Pearl shimmer', adjustment: 100 }] }] },
  { id: 'p8', slug: 'everyday-hoop-set', name: 'Everyday Hoop Set', category: 'resin', type: 'STANDARD', price: 499, originalPrice: null, badge: 'Easy gifting', production: 'Ready in 2–3 days', description: 'Lightweight, soft-coloured hoops that bring a little handmade glow to everyday looks.', image: media.product8, occasions: ['BIRTHDAY', 'FOR_HER'], audience: 'FOR_HER', customizable: false, premium: false },
  { id: 'p9', slug: 'fandom-shadow-box', name: 'Fandom Shadow Box', category: 'fandom', type: 'CUSTOM_QUOTE', price: 3000, startingFrom: true, badge: 'Tell us your universe', production: 'Crafted in 8–12 days', description: 'A layered display piece for the characters, quotes and worlds that live rent-free in your heart.', image: media.product3, occasions: ['BIRTHDAY', 'JUST_BECAUSE'], audience: 'FOR_EVERYONE', customizable: true, premium: true },
  { id: 'p10', slug: 'study-desk-sun-catcher', name: 'Study Desk Sun Catcher', category: 'decor', type: 'STANDARD', price: 599, originalPrice: 699, badge: 'Small joy', production: 'Ready in 2–4 days', description: 'A small prism of colour for the desk where all the big ideas happen.', image: media.product5, occasions: ['GRADUATION', 'JUST_BECAUSE'], audience: 'FOR_EVERYONE', customizable: false, premium: false },
  { id: 'p11', slug: 'custom-chocolate-bouquet', name: 'Chocolate & Photo Bouquet', category: 'gifts', type: 'CUSTOM_FIXED', price: 1099, originalPrice: 1299, badge: 'Crowd favourite', production: 'Ready in 3–5 days', description: 'A bouquet of favourite chocolates, photos and tiny notes, made for the sweetest reveal.', image: media.product2, occasions: ['BIRTHDAY', 'CELEBRATION', 'FOR_HER'], audience: 'FOR_EVERYONE', customizable: true, premium: false, options: [{ label: 'Chocolate mood', values: [{ name: 'Classic mix', adjustment: 0 }, { name: 'Premium mix', adjustment: 260 }] }] },
  { id: 'p12', slug: 'miniature-room-diorama', name: 'Miniature Room Diorama', category: 'signature', type: 'CUSTOM_QUOTE', price: 6500, startingFrom: true, badge: 'Signature', production: 'Crafted in 14–21 days', description: 'A tiny room built around a real place, a shared memory or an imagined future.', image: media.product1, occasions: ['ANNIVERSARY', 'GRADUATION', 'JUST_BECAUSE'], audience: 'FOR_EVERYONE', customizable: true, premium: true },
  { id: 'p13', slug: 'campus-bestie-card-set', name: 'Campus Bestie Card Set', category: 'projects', type: 'STANDARD', price: 299, originalPrice: null, badge: 'Made for friends', production: 'Ready in 1–2 days', description: 'A set of illustrated cards for the person who makes campus feel like home.', image: media.product4, occasions: ['FRIENDSHIP', 'GRADUATION'], audience: 'FOR_EVERYONE', customizable: false, premium: false },
  { id: 'p14', slug: 'custom-name-plate', name: 'Cloud Name Plate', category: 'personalized', type: 'CUSTOM_FIXED', price: 899, originalPrice: null, badge: 'New', production: 'Ready in 5–7 days', description: 'A softly sculpted name plate for desks, doors and your favourite little corner.', image: media.product7, occasions: ['BIRTHDAY', 'JUST_BECAUSE'], audience: 'FOR_EVERYONE', customizable: true, premium: false, options: [{ label: 'Size', values: [{ name: 'Small', adjustment: 0 }, { name: 'Large', adjustment: 220 }] }] },
  { id: 'p15', slug: 'resin-preserved-flower-frame', name: 'Resin Flower Frame', category: 'resin', type: 'CUSTOM_FIXED', price: 1899, originalPrice: 2199, badge: 'Pressed by hand', production: 'Ready in 7–9 days', description: 'A clear resin frame that preserves a bloom in its softest season.', image: media.product1, occasions: ['ANNIVERSARY', 'FESTIVE'], audience: 'FOR_EVERYONE', customizable: true, premium: false, options: [{ label: 'Bloom palette', values: [{ name: 'Blush garden', adjustment: 0 }, { name: 'Blue meadow', adjustment: 0 }, { name: 'Custom palette', adjustment: 120 }] }] },
  { id: 'p16', slug: 'signature-memory-trunk', name: 'Signature Memory Trunk', category: 'signature', type: 'CUSTOM_QUOTE', price: 10000, startingFrom: true, badge: 'Signature', production: 'Crafted in 21–30 days', description: 'A premium memory trunk that gathers letters, photographs, objects and a whole story in one heirloom.', image: media.product6, occasions: ['ANNIVERSARY', 'GRADUATION'], audience: 'FOR_EVERYONE', customizable: true, premium: true },
].map((product) => ({
  ...product,
  allowCustomRequest: product.allowCustomRequest ?? true,
  isMadeToOrder: product.isMadeToOrder ?? true,
  returnable: product.returnable ?? product.type === 'STANDARD',
  disclaimer: product.disclaimer ?? 'Handmade: slight variations in colour and finish are normal.',
  careInstructions: product.careInstructions ?? 'Keep away from direct moisture and store with care.',
}));

export const occasions = ['Birthday', 'Anniversary', 'Friendship', 'Graduation', 'Celebration', 'Festive', 'Just Because'];

export const reviews = [
  { name: 'Riya', product: 'Petal Memory Box', quote: 'It felt like opening a tiny museum of us. The little details were perfect.', rating: 5 },
  { name: 'Aarav', product: 'Polaroid Love Ladder', quote: 'The team understood the vibe from one message and made it even sweeter.', rating: 5 },
  { name: 'Mehak', product: 'Pressed Bloom Phone Cover', quote: 'The petals look like they are floating. Everyone on campus asks where it is from.', rating: 5 },
];

export const deliveryAreas = [
  'KIET Group of Institutions, Muradnagar (campus)',
  'Civil Lines',
  'Main Market',
  'Other location in Muradnagar',
];

export const deliverySlots = [
  { id: 'slot-1', label: '4 to 6 PM · Main Gate', area: 'KIET Group of Institutions, Muradnagar (campus)', days: 'Mon–Sat', remaining: 5 },
  { id: 'slot-2', label: '6 to 8 PM · Canteen', area: 'KIET Group of Institutions, Muradnagar (campus)', days: 'Mon–Fri', remaining: 3 },
  { id: 'slot-3', label: '5 to 7 PM · Home delivery', area: 'Civil Lines + Main Market', days: 'Tue–Sun', remaining: 6 },
];

export const storeSettings = {
  storeStatus: 'OPEN', acceptingCustomRequests: true,
  pauseMessage: 'Taking a short break for exams, back on 20 Nov.',
  announcementBar: { text: 'Muradnagar-made, KIET-campus ready · custom requests open', link: '/custom-request', isActive: true },
  timezone: 'Asia/Kolkata', minNoticeHours: 24, orderCutoffTime: '20:00',
  dailyOrderCapacity: 25, dailyCustomCapacity: 8, maxActiveProductionOrders: 30,
  unpaidAutoCancelHours: 24, quoteExpiryDays: 3, balanceReminderDays: 1, giftWrapPrice: 79,
  pricesIncludeTax: true, testMode: true,
  policy: { customerCanCancelUntil: 'CONFIRMED', editWindowHours: 4, beforeProductionRefund: 100, inProductionRefund: 0, readyRefund: 0 },
};

export const cmsPages = [
  { slug: 'about-us', title: 'About Us', status: 'Published', meta: 'The hands and heart behind Especially For U.', note: 'REVIEW BEFORE PUBLISHING' },
  { slug: 'terms-and-conditions', title: 'Terms & Conditions', status: 'Draft', meta: 'Handmade variations, custom work and customer responsibilities.', note: 'REVIEW BEFORE PUBLISHING' },
  { slug: 'privacy-policy', title: 'Privacy Policy', status: 'Draft', meta: 'What we collect, why we need it and how customers can request their data.', note: 'REVIEW BEFORE PUBLISHING' },
  { slug: 'refund-and-cancellation-policy', title: 'Refund & Cancellation Policy', status: 'Draft', meta: 'Stage-based refund guidance for ready-made and custom work.', note: 'REVIEW BEFORE PUBLISHING' },
  { slug: 'shipping-and-delivery-policy', title: 'Shipping & Delivery Policy', status: 'Draft', meta: 'Muradnagar-only delivery, campus handover and manual location approval.', note: 'REVIEW BEFORE PUBLISHING' },
  { slug: 'contact-us', title: 'Contact Us', status: 'Published', meta: 'WhatsApp, email and the studio response window.', note: 'Review contact details before launch' },
];

export const faqs = [
  { question: 'Do you deliver outside Muradnagar?', answer: 'Not at launch. Other locations in Muradnagar can be requested manually; areas outside Muradnagar are not accepted.' },
  { question: 'Can I request a custom version of a ready-made product?', answer: 'Yes. Every product has a Request Custom Version option so the studio can review your changes and send a manual quote.' },
  { question: 'When can I cancel?', answer: 'You can cancel until the order is confirmed. Once production starts, the refund depends on the policy stage shown on your order.' },
];

export const adminNeedsAttention = [
  { label: 'Location approval pending', detail: 'EFU-1044 · Other location in Muradnagar', tone: 'blush' },
  { label: 'Unpaid balance', detail: 'EFU-1042 · ₹800 due at handover', tone: 'icy' },
  { label: 'Quote expires tomorrow', detail: 'CR-1041 · Dev Malhotra', tone: 'soft' },
  { label: 'Payment issue', detail: 'EFU-1037 · webhook retry needed', tone: 'signature' },
];

export const adminTeam = [
  { name: 'Ananya Sharma', role: 'owner', detail: 'Everything, including settings and refunds' },
  { name: 'Riya Verma', role: 'manager', detail: 'Operations, quotes and orders' },
  { name: 'Kabir Singh', role: 'staff', detail: 'Orders, requests and customer messages' },
  { name: 'Mehak Gupta', role: 'viewer', detail: 'Read-only access' },
];

export const auditLogs = [
  { action: 'Location approval updated', actor: 'Ananya Sharma', entity: 'EFU-1044', at: 'Today · 6:42 PM' },
  { action: 'Custom quote sent', actor: 'Riya Verma', entity: 'Q-1041', at: 'Today · 4:15 PM' },
  { action: 'Sale price changed', actor: 'Ananya Sharma', entity: 'Petal Memory Box', at: 'Yesterday · 8:06 PM' },
];

export const notificationLogs = [
  { channel: 'Email', type: 'Quote expiring', recipient: 'Dev Malhotra', status: 'Delivered', attempts: 1 },
  { channel: 'WhatsApp', type: 'Location approval', recipient: 'Sana Kapoor', status: 'Queued', attempts: 0 },
  { channel: 'Email', type: 'Payment captured', recipient: 'Riya Sharma', status: 'Delivered', attempts: 1 },
];

export const sampleOrders = [
  { id: 'EFU-1042', customer: 'Riya Sharma', total: 1599, status: 'IN PRODUCTION', payment: 'ADVANCE PAID', item: 'Petal Memory Box', date: '02 Oct 2026', location: 'KIET · Main Gate', locationApproval: 'APPROVED', balanceDue: 800 },
  { id: 'EFU-1041', customer: 'Aarav Verma', total: 899, status: 'READY', payment: 'PAID', item: 'Soft Bloom Bouquet', date: '01 Oct 2026', location: 'Civil Lines', locationApproval: 'NOT_NEEDED', balanceDue: 0 },
  { id: 'EFU-1040', customer: 'Mehak Gupta', total: 799, status: 'CONFIRMED', payment: 'PAID', item: 'Pressed Bloom Phone Cover', date: '30 Sep 2026', location: 'Main Market', locationApproval: 'NOT_NEEDED', balanceDue: 0 },
  { id: 'EFU-1039', customer: 'Kabir Singh', total: 299, status: 'DELIVERED', payment: 'PAID', item: 'Campus Bestie Card Set', date: '28 Sep 2026', location: 'KIET · Canteen', locationApproval: 'APPROVED', balanceDue: 0 },
];

export const sampleRequests = [
  { id: 'CR-1042', title: 'A tiny version of our first café', customer: 'Sana Kapoor', status: 'UNDER REVIEW', budget: '₹3,000 – ₹5,000', neededBy: '18 Oct 2026', image: media.product6 },
  { id: 'CR-1041', title: 'A celestial birthday gift', customer: 'Dev Malhotra', status: 'QUOTE SENT', budget: '₹1,500 – ₹2,500', neededBy: '12 Oct 2026', image: media.product3 },
  { id: 'CR-1040', title: 'Fandom shelf piece', customer: 'Ishita Jain', status: 'REQUESTED', budget: '₹2,000 – ₹4,000', neededBy: '25 Oct 2026', image: media.product1 },
];

export const howItWorks = [
  { number: '01', title: 'Pick or describe', text: 'Choose a ready-made piece or tell us the idea living in your head.', icon: 'sparkles' },
  { number: '02', title: 'Get a quote', text: 'For custom work, we review your brief and send a clear, friendly quote.', icon: 'message-circle' },
  { number: '03', title: 'Pay securely', text: 'Pay online with Razorpay. Custom orders start with a simple advance.', icon: 'credit-card' },
  { number: '04', title: 'We craft & deliver', text: 'Your piece is made slowly and delivered within Muradnagar.', icon: 'heart-handshake' },
];

export const formatINR = (value) => `₹${Number(value).toLocaleString('en-IN')}`;
