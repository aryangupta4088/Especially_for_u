# Especially For U — Implementation Plan

## Product direction

The first milestone is a front-end-only visual prototype for a Muradnagar handmade creative studio, built from the two supplied prompts. It prioritizes a polished storefront experience and keeps the data boundary explicit so the later MERN/API implementation can replace `mockData.js` without a visual rewrite.

## Design system

### Design movement
**Dreamy editorial commerce**: the calm, tactile feel of a boutique stationery brand combined with the warmth and imperfection of a soft pastel art studio.

### Core principles
1. **Air over ornament** — generous spacing, quiet surfaces and clear hierarchy make each handmade piece feel considered.
2. **Soft contrast** — deep plum typography carries the UI while pink, orchid, icy and sky accents provide emotional warmth without sacrificing readability.
3. **Editorial asymmetry** — hero cards, bento categories, tilted image stacks and offset sections avoid a generic centered grid.
4. **Personal by default** — copy, chips, timelines and quote states make the experience feel like a conversation with a real maker.

### Color philosophy
`#FFFBFE` is the paper-like base. `#3B2A4A` and `#6B5B7B` are the only body-text colors. Orchid and petal create the soft handmade atmosphere; blush is the ownable call-to-action accent; icy and sky-blue cool the composition so it never becomes all-pink or all-blue.

### Layout paradigm
A scroll-led editorial canvas: full-bleed gradient mesh backgrounds, a low-noise header, asymmetrical bento category tiles, horizontal product rails on mobile, and split storytelling sections. Cards are used as tactile objects, not as a dense grid system.

### Signature elements
- A lavender-petal **stitch mark** in the wordmark and section eyebrows.
- Glass panels with soft plum shadows and a tiny film-grain veil.
- Tilted image stacks and floating craft cards that echo handmade layers.

### Interaction philosophy
Interactions should feel like lifting a paper card: small hover rises, gentle image zooms, springy wishlist hearts, calm toasts and subtle shimmer on primary actions. Every motion has a reduced-motion fallback.

### Animation
Use Framer Motion for 300–450ms fade-up page transitions, staggered card reveals, hover lifts, hero float/parallax, active timeline pulses, and route transitions. Keep animation to opacity/transform where possible; respect `prefers-reduced-motion` in CSS.

### Typography
Fraunces is the display face with occasional italic emphasis; DM Sans handles all UI and body copy. Eyebrows are 11–12px uppercase labels with generous tracking. Display headlines use large responsive clamp sizing and relaxed line-height.

### Brand essence
**Positioning:** Personal, handmade gifts and custom keepsakes for Muradnagar moments, crafted slowly by a student-run studio that listens to the story first.

**Personality:** dreamy, thoughtful, warm.

### Brand voice
Headlines sound like a note tucked into a gift box. CTAs are inviting and specific, never generic.

- “Have an idea? Let’s make it real.”
- “Pick a little something, or tell us the story behind it.”

### Wordmark & logo
A lowercase/Title Case serif wordmark with an italic **For U** and a small stitched petal/star mark between the words. It is rendered as a lockup in the header rather than as a default text logo.

### Signature brand color
**Blush Pop `#FFAFCC`** — the soft, warm accent used for the primary CTA, active states and little moments of delight.

## Architecture

- `src/mockData.js` — all prototype products, categories, reviews, orders, requests, navigation data and helper constants.
- `src/App.jsx` — routes, shared shell, reusable UI primitives, storefront pages and admin surface.
- `src/styles.css` — CSS variables, responsive layout, gradient backgrounds, component styling and reduced-motion rules.
- `public/manus-routes.json` — route manifest for Preview and later publication.
- `app.config.ts` — project logo metadata and durable placeholder configuration.
- `server/` and API integration are intentionally deferred to the next milestone; the UI uses a stable mock-data seam so endpoints can be introduced without changing page contracts.

## Prototype scope delivered in this milestone

Home, Shop, Product Detail, Custom Request, Cart, Checkout, Account, Track Order, About and Admin Dashboard routes with working navigation, filter/search interactions, product detail option pricing, custom request success state, cart persistence for the session, checkout steps, order timeline and responsive mobile navigation.

## Future integration seam

Replace the `mockData` imports with TanStack Query/API hooks as the MERN backend is added. The existing concepts already mirror the master prompt: `STANDARD`, `CUSTOM_FIXED`, `CUSTOM_QUOTE`, INR price formatting, Muradnagar delivery areas, quote/request status, order timeline, and admin status metrics.
