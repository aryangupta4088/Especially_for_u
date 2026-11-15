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

export const categories = [];

export const products = [];

export const occasions = ['Birthday', 'Anniversary', 'Friendship', 'Graduation', 'Celebration', 'Festive', 'Just Because'];

export const reviews = [];

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

export const adminNeedsAttention = [];
export const adminTeam = [];
export const auditLogs = [];
export const notificationLogs = [];
export const sampleOrders = [];
export const sampleRequests = [];

export const howItWorks = [
  { number: '01', title: 'Pick or describe', text: 'Choose a ready-made piece or tell us the idea living in your head.', icon: 'sparkles' },
  { number: '02', title: 'Get a quote', text: 'For custom work, we review your brief and send a clear, friendly quote.', icon: 'message-circle' },
  { number: '03', title: 'Pay in two steps', text: 'Send a 50% UPI advance. We’ll verify it before we begin, then collect the balance at handover.', icon: 'credit-card' },
  { number: '04', title: 'We craft & deliver', text: 'Your piece is made slowly and delivered within Muradnagar.', icon: 'heart-handshake' },
];

export const formatINR = (value) => `₹${Number(value).toLocaleString('en-IN')}`;
