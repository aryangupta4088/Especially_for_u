import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle, ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, Bell, Camera, CalendarDays,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleUserRound, ClipboardList, Clock3, CreditCard,
  Download, Edit3, FileImage, FileText, Filter, Heart, HeartHandshake, LayoutDashboard, LockKeyhole, LogOut,
  MapPin, Menu, MessageCircle, Minus, Package, Palette, PhoneCall, Plus, Printer, RefreshCw, Search,
  Send, Settings, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, Star, Tag, Trash2, Truck,
  UploadCloud, UserRound, UserPlus, Users, WandSparkles, X, Zap,
} from 'lucide-react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  adminNeedsAttention, adminTeam, auditLogs, categories as mockCategories, cmsPages, deliveryAreas, deliverySlots,
  faqs, formatINR, howItWorks, media, notificationLogs, occasions, products as mockProducts, reviews, sampleOrders,
  sampleRequests, storeSettings,
} from './mockData';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import { Navigate } from 'react-router-dom';

const pageTransition = { duration: 0.42, ease: [0.22, 1, 0.36, 1] };

const Icon = ({ name, size = 18 }) => {
  const icons = { sparkles: Sparkles, 'message-circle': MessageCircle, 'credit-card': CreditCard, 'heart-handshake': HeartHandshake };
  const Component = icons[name] || Sparkles;
  return <Component size={size} strokeWidth={1.7} />;
};

const useApp = () => window.__efuApp;

function useLiveData() {
  const [products, setProducts] = useState(mockProducts);
  const [categories, setCategories] = useState(mockCategories);
  const [settings, setSettings] = useState(storeSettings);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch('/api/products').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/categories').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/settings/public').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([p, c, s]) => {
      if (!alive) return;
      if (p?.products?.length) setProducts(p.products);
      if (c?.categories?.length) setCategories(c.categories);
      if (s?.settings) setSettings(s.settings);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, []);
  return { products, categories, settings, loaded };
}

function Button({ children, variant = 'primary', icon, type = 'button', onClick, className = '', as: Component = 'button', to }) {
  const content = <>{children}{icon && <span className="button-icon">{icon}</span>}</>;
  const classes = `button button-${variant} ${className}`;
  if (Component === Link) return <Link to={to} className={classes}>{content}</Link>;
  return <button type={type} onClick={onClick} className={classes}>{content}</button>;
}

function Badge({ children, tone = 'soft' }) { return <span className={`badge badge-${tone}`}>{children}</span>; }

function GlassCard({ children, className = '', as: Component = 'div' }) {
  return <Component className={`glass-card ${className}`}>{children}</Component>;
}

function SectionHeading({ eyebrow, title, body, align = 'left', action }) {
  return <div className={`section-heading align-${align}`}>
    <div>
      {eyebrow && <p className="eyebrow"><span className="eyebrow-mark">✦</span>{eyebrow}</p>}
      <h2>{title}</h2>
      {body && <p className="section-body">{body}</p>}
    </div>
    {action}
  </div>;
}

function PriceTag({ product, price }) {
  const current = price ?? product.price;
  return <div className="price-tag">
    {product.originalPrice && <span className="original-price">{formatINR(product.originalPrice)}</span>}
    <strong>{product.startingFrom ? 'From ' : ''}{formatINR(current)}</strong>
  </div>;
}

function GradientBackground({ variant = 'home', children, className = '' }) {
  return <div className={`page-bg page-bg-${variant} ${className}`}>
    <div className="mesh-blob blob-a" />
    <div className="mesh-blob blob-b" />
    <div className="mesh-blob blob-c" />
    <div className="grain" />
    {children}
  </div>;
}

function AnnouncementBar({ settings = storeSettings }) {
  if (!settings.announcementBar?.isActive) return null;
  return <div className="announcement-bar"><span>{settings.announcementBar.text}</span><Link to={settings.announcementBar.link}>See how it works <ArrowUpRight size={13} /></Link></div>;
}

function Navbar({ cartCount, wishlistCount, settings }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  const isAdmin = user && (user.email === 'aryangupta75990@gmail.com' || user.email === 'heychosenforu@gmail.com');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => setMenuOpen(false), [location.pathname]);

  const links = [
    ['Home', '/'],
    ['Shop', '/shop'],
    ['Custom Request', '/custom-request'],
    ['About', '/about'],
    ['Track Order', '/track-order'],
  ];

  return (
    <>
      <AnnouncementBar settings={settings} />
      <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="container nav-inner">
          <Link to="/" className="wordmark" aria-label="Especially For U home">
            <span>Especially</span><em>For U</em><i>✦</i>
          </Link>

          <nav className="desktop-nav" aria-label="Primary navigation">
            {links.map(([label, to]) => (
              <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="nav-actions">
            <Link to="/shop" className="icon-button" aria-label="Search">
              <Search size={18} />
            </Link>

            {user ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {isAdmin && (
                  <Link
                    to="/admin"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: 'rgba(197, 90, 131, 0.12)',
                      border: '1px solid rgba(197, 90, 131, 0.25)',
                      color: '#b24d76',
                      fontSize: '11px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                    title="Studio Desk Admin"
                  >
                    👑 Studio Desk
                  </Link>
                )}
                <Link
                  to="/account"
                  className="icon-button nav-account"
                  aria-label="My Account"
                  title={`Account: ${user.name || user.email}`}
                >
                  <CircleUserRound size={18} />
                </Link>
                <button
                  onClick={() => { logout(); navigate('/', { replace: true }); }}
                  className="icon-button"
                  title={`Sign out ${user.name || user.email}`}
                  aria-label="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Link
                  to="/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 14px',
                    borderRadius: '999px',
                    background: 'rgba(90, 63, 86, 0.08)',
                    color: 'var(--ink)',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all .15s ease',
                  }}
                >
                  Sign in
                </Link>
              </div>
            )}

            <Link to="/cart" className="icon-button nav-cart" aria-label="Cart">
              <ShoppingBag size={18} />
              {cartCount > 0 && <span className="count-badge">{cartCount}</span>}
            </Link>

            <button className="icon-button menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu size={20} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div className="mobile-menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mobile-menu-head">
                <span className="wordmark"><span>Especially</span><em>For U</em></span>
                <button className="icon-button" onClick={() => setMenuOpen(false)}><X size={20} /></button>
              </div>
              <div className="mobile-links">
                {links.map(([label, to]) => (
                  <NavLink key={to} to={to} onClick={() => setMenuOpen(false)}>
                    {label}<ArrowUpRight size={18} />
                  </NavLink>
                ))}
              </div>

              {user ? (
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)', marginTop: '12px' }}>
                  <div className="mobile-menu-note" style={{ marginBottom: '10px' }}>
                    <span>Signed in as</span><strong>{user.name || user.email}</strong>
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <NavLink to="/account" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '10px', background: 'rgba(90,63,86,.05)', textDecoration: 'none', color: 'var(--ink)', fontSize: '13px', fontWeight: 500 }}>
                      My Account & Orders <ArrowRight size={14} />
                    </NavLink>
                    {isAdmin && (
                      <NavLink to="/admin" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '10px', background: 'rgba(197,90,131,.12)', textDecoration: 'none', color: '#b24d76', fontSize: '13px', fontWeight: 600 }}>
                        👑 Studio Admin Desk <ArrowRight size={14} />
                      </NavLink>
                    )}
                    <button
                      onClick={() => { logout(); setMenuOpen(false); navigate('/', { replace: true }); }}
                      style={{ marginTop: '4px', padding: '8px', borderRadius: '10px', border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', color: 'var(--muted)', fontSize: '12px' }}
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)', marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="button"
                    style={{ textAlign: 'center', justifyContent: 'center', minHeight: '38px', fontSize: '13px' }}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMenuOpen(false)}
                    className="button button-secondary"
                    style={{ textAlign: 'center', justifyContent: 'center', minHeight: '38px', fontSize: '13px' }}
                  >
                    Sign Up
                  </Link>
                </div>
              )}

              <div className="mobile-menu-note" style={{ marginTop: '16px' }}>
                <span>Delivering in</span><strong>Muradnagar, with love.</strong>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}

function Footer() {
  return <footer className="site-footer">
    <div className="container footer-grid">
      <div className="footer-brand"><Link to="/" className="wordmark"><span>Especially</span><em>For U</em><i>✦</i></Link><p>Handmade gifts, soft keepsakes and tiny worlds made especially for your people.</p><Badge tone="icy">Delivering only in Muradnagar</Badge></div>
      <div><p className="footer-label">Explore</p><Link to="/shop">Shop ready-made</Link><Link to="/custom-request">Create something custom</Link><Link to="/about">Our story</Link></div>
      <div><p className="footer-label">Need a little help?</p><Link to="/track-order">Track an order</Link><Link to="/pages/faq">FAQs</Link><a href="mailto:hello@especiallyforu.in">hello@especiallyforu.in</a><a href="https://wa.me/919999999999">WhatsApp us</a></div>
      <div className="footer-social"><p className="footer-label">Find us in the wild</p><div className="social-row"><a href="https://instagram.com" aria-label="Instagram"><Camera size={18} /></a><a href="https://wa.me/919999999999" aria-label="WhatsApp"><MessageCircle size={18} /></a></div><p className="small-note">Made with soft corners and a lot of care.</p></div>
    </div>
    <div className="container footer-bottom">
      <span>© 2026 Especially For U</span>
      <span>Made Especially For You.</span>
      <span>
        <Link to="/pages/privacy-policy">Privacy</Link> · <Link to="/pages/terms-and-conditions">Terms</Link> · <Link to="/pages/refund-and-cancellation-policy">Refunds</Link> · <Link to="/admin" style={{ color: '#b24d76', fontWeight: 600 }}>Studio Admin</Link>
      </span>
    </div>
  </footer>;
}

function WhatsAppFloat() { return <a className="whatsapp-float" href="https://wa.me/919999999999" aria-label="Chat on WhatsApp"><MessageCircle size={21} /><span>Say hello</span></a>; }

function ProductCard({ product, onAdd, onWish, isWished, categories = mockCategories }) {
  const navigate = useNavigate();
  const cta = product.type === 'CUSTOM_QUOTE' ? 'Request quote' : product.type === 'CUSTOM_FIXED' ? 'Customize' : 'Add to cart';
  const handlePrimary = () => product.type === 'CUSTOM_QUOTE' ? navigate(`/custom-request?product=${product.slug}`) : onAdd(product);
  return <motion.article className={`product-card ${product.premium ? 'product-premium' : ''}`} whileHover={{ y: -7 }} transition={pageTransition}>
    <div className="product-image-wrap">
      <Link to={`/product/${product.slug}`} className="product-image-link"><img src={product.image} alt={product.name} loading="lazy" /></Link>
      <div className="product-topline"><Badge tone={product.premium ? 'signature' : product.badge === 'New' ? 'icy' : 'soft'}>{product.badge}</Badge><button className={`heart-button ${isWished ? 'is-wished' : ''}`} onClick={() => onWish(product)} aria-label={`Save ${product.name}`}><Heart size={17} fill={isWished ? 'currentColor' : 'none'} /></button></div>
      <Link to={`/product/${product.slug}`} className="quick-view">{product.type === 'CUSTOM_QUOTE' ? 'View brief' : 'Quick view'} <ArrowUpRight size={15} /></Link>
    </div>
    <div className="product-copy"><div className="product-meta"><span>{categories.find((category) => category.id === product.category || category.slug === product.category)?.name}</span><span className="dot">·</span><span>{product.production}</span></div><Link to={`/product/${product.slug}`} className="product-name">{product.name}</Link><p className="product-description">{product.description}</p><div className="product-bottom"><PriceTag product={product} /><Button variant="mini" onClick={handlePrimary}>{cta}</Button></div>{product.allowCustomRequest !== false && <Link className="custom-version-link" to={`/custom-request?product=${product.slug}`}><WandSparkles size={13} /> Request Custom Version</Link>}</div>
  </motion.article>;
}

function CategoryCard({ category, index }) {
  return <motion.div className={`category-card category-${category.size}`} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: index * 0.04, ...pageTransition }} whileHover={{ rotate: index % 2 ? -1.2 : 1.2, y: -4 }}>
    <Link to={`/category/${category.id}`}><img src={category.image} alt={category.name} loading="lazy" /><div className="category-overlay" /><div className="category-copy"><span className="eyebrow">{category.eyebrow}</span><h3>{category.name}</h3><p>{category.description}</p><span className="circle-arrow"><ArrowUpRight size={17} /></span></div></Link>
  </motion.div>;
}

function Marquee() { return <div className="marquee"><div className="marquee-track">{Array.from({ length: 2 }).map((_, index) => <span key={index}>Handmade <b>✦</b> Customized <b>✦</b> Made for you <b>✦</b> Muradnagar <b>✦</b> Slow crafted <b>✦</b></span>)}</div></div>; }

function Timeline({ compact = false }) {
  const steps = ['Confirmed', 'In production', 'Ready', 'Out for delivery', 'Delivered'];
  const active = 2;
  return <div className={`timeline ${compact ? 'timeline-compact' : ''}`}>{steps.map((step, index) => <div className={`timeline-step ${index <= active ? 'is-done' : ''} ${index === active ? 'is-active' : ''}`} key={step}><div className="timeline-dot">{index < active ? <Check size={13} /> : index === active ? <span /> : ''}</div><span>{step}</span>{index < steps.length - 1 && <div className="timeline-line" />}</div>)}</div>;
}

function HomePage({ live }) {
  const { addToCart, onWish, wishlist } = useApp();
  const products = live?.products?.length ? live.products : mockProducts;
  const categories = live?.categories?.length ? live.categories : mockCategories;
  const settings = live?.settings || storeSettings;
  const featured = products.slice(0, 4);
  return <GradientBackground variant="home"><Navbar cartCount={useApp().cart.length} wishlistCount={wishlist.length} settings={settings} /><main>
    <section className="hero-section"><div className="hero-image"><img src={media.hero} alt="Pastel handmade crafts arranged on a table" /></div><div className="hero-overlay" /><div className="container hero-content"><div className="hero-copy"><p className="eyebrow hero-eyebrow"><span className="eyebrow-mark">✦</span> Small studio · big feelings</p><h1>Made <em>Especially</em><br />For U <span className="sparkle-inline">✦</span></h1><p className="hero-subtitle">{settings.tagline || 'Custom gifts, handmade creations & little things made just for you.'}</p><div className="hero-actions"><Button as={Link} to="/shop" icon={<ArrowRight size={17} />}>Shop ready-made</Button><Button as={Link} to="/custom-request" variant="secondary" icon={<WandSparkles size={17} />}>Create something custom</Button></div><div className="hero-note"><span className="hero-note-mark">♡</span><span>Made slowly in Muradnagar<br /><strong>for your favourite people.</strong></span></div></div><div className="floating-card floating-card-one"><img src={media.product2} alt="Soft pastel paper flowers" /><span>for her · ₹899</span></div><div className="floating-card floating-card-two"><img src={media.product1} alt="Pressed flower keepsake" /><span>made to order</span></div></div><a href="#explore" className="scroll-cue"><span>Scroll to explore</span><ArrowDown size={16} /></a></section>
    <Marquee />
    <section className="section section-explore" id="explore"><div className="container"><SectionHeading eyebrow="Made by hand, chosen by heart" title={<>Explore our <em>creations</em></>} body="From a tiny note card to a whole little world — find something that feels like them." action={<Button as={Link} to="/shop" variant="ghost" icon={<ArrowUpRight size={16} />}>See all pieces</Button>} /><div className="category-bento">{categories.map((category, index) => <CategoryCard category={category} index={index} key={category.id} />)}</div></div></section>
    <section className="section section-featured"><div className="container"><SectionHeading eyebrow="A little something special" title={<>Made Especially <em>For U</em></>} body="Our most-loved handmade pieces, ready to become part of your story." action={<Button as={Link} to="/shop" variant="ghost" icon={<ArrowRight size={16} />}>Shop all</Button>} /><div className="product-grid featured-grid">{featured.map((product) => <ProductCard product={product} key={product.id} onAdd={addToCart} onWish={onWish} isWished={wishlist.includes(product.id)} categories={categories} />)}</div></div></section>
    <section className="section custom-feature"><div className="container custom-feature-inner"><div className="custom-feature-copy"><p className="eyebrow"><span className="eyebrow-mark">✦</span> The custom corner</p><h2>Have an idea?<br /><em>Let’s make it real.</em></h2><p>Tell us the story, the colours, the tiny detail you can’t stop thinking about. We’ll turn it into something you can hold.</p><Button as={Link} to="/custom-request" icon={<ArrowUpRight size={17} />}>Start a request</Button><div className="custom-feature-foot"><span>01</span><span className="foot-line" /><span>Made for your moment</span></div></div><div className="custom-image-stack"><div className="stack-card stack-back"><img src={media.product3} alt="Pastel handmade art" /></div><div className="stack-card stack-middle"><img src={media.collage} alt="Layered handmade craft details" /></div><div className="stack-card stack-front"><img src={media.product4} alt="Polaroid memory keepsake" /><span className="stack-tag">your story, made tangible</span></div></div></div></section>
    <section className="section section-occasions"><div className="container"><SectionHeading eyebrow="Shop by feeling" title={<>For all the <em>little occasions</em></>} body="A thoughtful something for the birthday, the almost-anniversary, or the random Tuesday that deserves a little sparkle." /><div className="occasion-chips">{occasions.map((occasion, index) => <Link key={occasion} to={`/occasion/${occasion.toLowerCase().replaceAll(' ', '-')}`} className={`occasion-chip ${index === 0 ? 'is-active' : ''}`}>{occasion}<ArrowUpRight size={14} /></Link>)}</div><div className="occasion-rail">{products.slice(4, 8).map((product) => <ProductCard product={product} key={product.id} onAdd={addToCart} onWish={onWish} isWished={wishlist.includes(product.id)} categories={categories} />)}</div></div></section>
    <section className="section how-section"><div className="container"><SectionHeading align="center" eyebrow="The easy, lovely part" title={<>How it <em>works</em></>} body="No mystery, no awkward forms. Just a simple path from your idea to something real." /><div className="how-grid">{howItWorks.map((step, index) => <motion.div className="how-step" key={step.number} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08, ...pageTransition }}><div className="how-number">{step.number}</div><div className="how-icon"><Icon name={step.icon} size={22} /></div><h3>{step.title}</h3><p>{step.text}</p>{index < howItWorks.length - 1 && <ArrowRight className="how-arrow" size={18} />}</motion.div>)}</div></div></section>
    <section className="section reviews-section"><div className="container"><SectionHeading eyebrow="Kind words, kept close" title={<>From our <em>favourite people</em></>} /><div className="reviews-grid">{reviews.map((review) => <GlassCard className="review-card" key={review.name}><div className="stars">{Array.from({ length: review.rating }).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}</div><p>“{review.quote}”</p><div className="review-by"><div className="review-avatar">{review.name[0]}</div><div><strong>{review.name}</strong><span>{review.product}</span></div></div></GlassCard>)}</div></div></section>
    <section className="final-cta"><div className="container"><div className="final-cta-card"><div className="sparkle sparkle-1">✦</div><div className="sparkle sparkle-2">✧</div><p className="eyebrow">A soft place for big ideas</p><h2>Have an idea?<br /><em>Let’s make it real.</em></h2><p>Bring the half-formed thought. We’ll bring the handmade magic.</p><Button as={Link} to="/custom-request" variant="light" icon={<ArrowUpRight size={17} />}>Create something custom</Button></div></div></section>
  </main><Footer /><WhatsAppFloat /></GradientBackground>;
}

function ShopPage({ initialCategory = 'all', initialOccasion = 'all', live }) {
  const { addToCart, onWish, wishlist } = useApp();
  const products = live?.products?.length ? live.products : mockProducts;
  const categories = live?.categories?.length ? live.categories : mockCategories;
  const params = new URLSearchParams(window.location.search);
  const [query, setQuery] = useState(params.get('q') || '');
  const [category, setCategory] = useState(params.get('category') || initialCategory);
  const [occasion, setOccasion] = useState(params.get('occasion') || initialOccasion);
  const [customOnly, setCustomOnly] = useState(false);
  const [sort, setSort] = useState('featured');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtered = useMemo(() => {
    const list = products.filter((product) => {
      const text = `${product.name} ${product.description}`.toLowerCase();
      const matchesQuery = !query || text.includes(query.toLowerCase());
      const matchesCategory = category === 'all' || product.category === category;
      const matchesOccasion = occasion === 'all' || (product.occasions || []).includes(occasion);
      const matchesCustom = !customOnly || product.customizable;
      return matchesQuery && matchesCategory && matchesOccasion && matchesCustom;
    });
    if (sort === 'low') return [...list].sort((a, b) => a.price - b.price);
    if (sort === 'high') return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [category, customOnly, occasion, products, query, sort]);
  const clear = () => { setQuery(''); setCategory('all'); setOccasion('all'); setCustomOnly(false); };
  return <GradientBackground variant="shop"><Navbar cartCount={useApp().cart.length} /><main><section className="page-intro container"><div><p className="eyebrow"><span className="eyebrow-mark">✦</span> The little shop</p><h1>Find your <em>something.</em></h1><p>Handmade gifts, soft keepsakes and tiny delights — all ready to make someone’s day.</p></div><div className="shop-note"><span className="mini-dot" /> Delivering only in <strong>Muradnagar</strong></div></section><section className="shop-layout container"><aside className={`filter-panel ${filtersOpen ? 'is-open' : ''}`}><div className="filter-head"><h3>Filter the feeling</h3><button className="icon-button filter-close" onClick={() => setFiltersOpen(false)}><X size={18} /></button></div><label className="field-label">Search</label><div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “memory” or “flowers”" /></div><label className="field-label">Categories</label><div className="filter-list"><button className={category === 'all' ? 'is-selected' : ''} onClick={() => setCategory('all')}>All creations <span>{products.length}</span></button>{categories.map((item) => <button className={category === item.id || category === item.slug ? 'is-selected' : ''} onClick={() => setCategory(item.id || item.slug)} key={item.id || item.slug}>{item.name}<span>{products.filter((product) => product.category === item.id || product.category === item.slug).length}</span></button>)}</div><label className="field-label">Occasion</label><div className="mini-chips">{occasions.map((item) => <button className={occasion === item.toUpperCase().replaceAll(' ', '_') ? 'is-selected' : ''} onClick={() => setOccasion(item.toUpperCase().replaceAll(' ', '_'))} key={item}>{item}</button>)}</div><label className="toggle-row"><span><strong>Customisable only</strong><small>Show pieces made around your details</small></span><button className={`toggle ${customOnly ? 'is-on' : ''}`} onClick={() => setCustomOnly(!customOnly)} aria-label="Toggle customisable products"><span /></button></label><button className="clear-filters" onClick={clear}>Clear all filters</button></aside><div className="shop-results"><div className="shop-toolbar"><button className="filter-trigger button button-secondary" onClick={() => setFiltersOpen(true)}><Filter size={16} /> Filters</button><div><span className="results-count">{filtered.length} pieces to love</span>{(query || category !== 'all' || occasion !== 'all' || customOnly) && <button className="active-filter" onClick={clear}>Clear <X size={12} /></button>}</div><label className="sort-field">Sort by <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select><ChevronDown size={15} /></label></div>{filtered.length ? <div className="product-grid">{filtered.map((product) => <ProductCard product={product} key={product.id} onAdd={addToCart} onWish={onWish} isWished={wishlist.includes(product.id)} categories={categories} />)}</div> : <EmptyState title="Nothing here yet" body="Try a softer search or clear a filter — your little something is probably nearby." onClick={clear} />}</div></section></main></GradientBackground>;
}

function EmptyState({ title, body, onClick }) { return <GlassCard className="empty-state"><div className="empty-icon"><Sparkles size={25} /></div><h3>{title}</h3><p>{body}</p>{onClick && <Button variant="secondary" onClick={onClick}>Reset the view</Button>}</GlassCard>; }

function ProductPage({ live }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart, onWish, wishlist } = useApp();
  const products = live?.products?.length ? live.products : mockProducts;
  const categories = live?.categories?.length ? live.categories : mockCategories;
  const product = products.find((item) => item.slug === slug) || products[0] || mockProducts[0];
  const [selected, setSelected] = useState(product.options?.map((option) => option.values[0].name) || []);
  const [quantity, setQuantity] = useState(1);
  const price = Number(product.price) + (product.options || []).reduce((sum, option, index) => sum + (option.values.find((value) => value.name === selected[index])?.adjustment || 0), 0);
  const handleCta = () => { if (product.type === 'CUSTOM_QUOTE') navigate(`/custom-request?product=${product.slug}`); else { addToCart({ ...product, selected, quantity, price }); navigate('/cart'); } };
  return <GradientBackground variant="product"><Navbar cartCount={useApp().cart.length} /><main className="container product-page"><button className="back-link" onClick={() => navigate(-1)}><ChevronLeft size={16} /> Back to shop</button><div className="product-detail"><div className="product-gallery"><div className="gallery-main"><img src={product.image} alt={product.name} /></div><div className="gallery-thumbs"><button className="is-active"><img src={product.image} alt="" /></button><button><img src={media.collage} alt="" /></button><button><img src={media.product4} alt="" /></button></div></div><div className="product-info"><div className="product-info-top"><Badge tone={product.premium ? 'signature' : 'soft'}>{product.badge}</Badge><button className={`save-button ${wishlist.includes(product.id) ? 'is-wished' : ''}`} onClick={() => onWish(product)}><Heart size={17} fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} /> Save</button></div><p className="eyebrow">{categories.find((item) => item.id === product.category || item.slug === product.category)?.name} · {product.production}</p><h1>{product.name}</h1><div className="rating-row"><span className="stars">★★★★★</span><span>4.9 · 12 lovely reviews</span></div><PriceTag product={product} price={price} /><p className="detail-description">{product.description}</p>{product.type === 'CUSTOM_QUOTE' ? <div className="quote-explainer"><div className="quote-icon"><WandSparkles size={18} /></div><div><strong>This one starts with your story.</strong><p>Share the idea, references and your needed-by date. We’ll reply with a clear quote within 1–2 days.</p></div></div> : <div className="customization-form">{(product.options || []).map((option, optionIndex) => <div className="option-group" key={option.label}><div className="option-title"><strong>{option.label}</strong><span>{selected[optionIndex]}</span></div><div className="option-pills">{option.values.map((value) => <button key={value.name} className={selected[optionIndex] === value.name ? 'is-selected' : ''} onClick={() => setSelected((current) => current.map((item, index) => index === optionIndex ? value.name : item))}>{value.name}{value.adjustment > 0 && <small>+{formatINR(value.adjustment)}</small>}</button>)}</div></div>)}<div className="option-group"><div className="option-title"><strong>Quantity</strong><span>Made to order</span></div><div className="quantity-stepper"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={15} /></button><strong>{quantity}</strong><button onClick={() => setQuantity(quantity + 1)}><Plus size={15} /></button></div></div></div>}<div className="delivery-callout"><Truck size={18} /><div><strong>Delivering only in Muradnagar</strong><span>Ready by {String(product.production || 'Ready in 3 days').replace('Ready in ', '').replace('Crafted in ', '')} · campus handover, listed-area delivery or manual location review</span></div></div><Button className="full-button" onClick={handleCta} icon={<ArrowRight size={17} />}>{product.type === 'CUSTOM_QUOTE' ? 'Request a quote' : product.type === 'CUSTOM_FIXED' ? `Customize · ${formatINR(price)}` : `Add to cart · ${formatINR(price)}`}</Button>{product.allowCustomRequest !== false && <Link className="product-custom-cta" to={`/custom-request?product=${product.slug}`}><WandSparkles size={15} /> Request Custom Version</Link>}<div className="trust-row"><span><Check size={14} /> Handmade with care</span><span><Check size={14} /> Secure payments</span><span><Check size={14} /> Muradnagar delivery</span></div></div></div><div className="product-tabs"><button className="is-active">Details</button><button>Materials & size</button><button>Reviews</button></div><div className="product-detail-lower"><div><h3>A little more about this piece</h3><p>Every piece is made in small batches or crafted after you place an order. Colours and tiny details may vary beautifully because your piece is actually made by hand.</p><div className="honesty-notes"><span><ShieldCheck size={15} /> {product.disclaimer || 'Each piece is unique and will vary slightly from the photos.'}</span><span><HeartHandshake size={15} /> {product.careInstructions || 'Keep dry, away from direct sunlight for long hours.'}</span><span><FileText size={15} /> {product.returnable ? 'Ready-made returns follow the store policy.' : 'Custom pieces are non-returnable once production starts.'}</span></div></div><GlassCard><p className="eyebrow">Need it for a date?</p><h3>We’ll help you plan it.</h3><p>Share your needed-by date at checkout and we’ll show you a realistic ready-by window.</p><Link to={`/custom-request?product=${product.slug}`}>Ask about a custom timeline <ArrowUpRight size={15} /></Link></GlassCard></div><section className="related-products"><SectionHeading eyebrow="You may also love" title={<>More little <em>feelings</em></>} /><div className="product-grid">{products.filter((item) => item.id !== product.id).slice(0, 4).map((item) => <ProductCard product={item} key={item.id} onAdd={addToCart} onWish={onWish} isWished={wishlist.includes(item.id)} categories={categories} />)}</div></section></main><Footer /><WhatsAppFloat /></GradientBackground>;
}

function CustomRequestPage() {
  const [submitted, setSubmitted] = useState(false);
  const [color, setColor] = useState('Blush pink');
  const live = useLive();
  const products = live?.products?.length ? live.products : mockProducts;
  const currentSettings = live?.settings || storeSettings;
  const linkedSlug = new URLSearchParams(window.location.search).get('product');
  const linkedProduct = products.find((item) => item.slug === linkedSlug);
  if (!currentSettings.acceptingCustomRequests) return <GradientBackground variant="custom"><Navbar cartCount={useApp().cart.length} /><main className="container success-page"><div className="success-orb"><Clock3 size={32} /></div><p className="eyebrow">A short studio pause</p><h1>Custom requests are <em>resting for now.</em></h1><p>{currentSettings.pauseMessage} You can still browse the shop and save a little something for later.</p><Button as={Link} to="/shop" icon={<ArrowRight size={17} />}>Browse the shop</Button></main><Footer /></GradientBackground>;
  if (submitted) return <GradientBackground variant="custom"><Navbar cartCount={useApp().cart.length} /><main className="container success-page"><div className="success-orb"><Check size={32} /></div><p className="eyebrow">It’s on its way to us</p><h1>Your idea is <em>safe with us.</em></h1><p>We’ve received your request and will send a thoughtful reply within 1–2 days.</p><GlassCard className="request-id-card"><span>Your request ID</span><strong>CR-1042</strong><Badge tone="icy">REQUESTED</Badge></GlassCard><div className="hero-actions"><Button as={Link} to="/account" icon={<ArrowRight size={17} />}>Track your request</Button><Button as={Link} to="/shop" variant="secondary">Browse the shop</Button></div></main><Footer /></GradientBackground>;
  return <GradientBackground variant="custom"><Navbar cartCount={useApp().cart.length} /><main className="container custom-page"><section className="page-intro custom-intro"><div><p className="eyebrow"><span className="eyebrow-mark">✦</span> The custom corner</p><h1>Have an idea?<br /><em>Let’s make it real.</em></h1><p>Bring the half-formed thought, the colour palette, the screenshot you saved at 2am. We’ll turn it into something you can hold.</p>{linkedProduct && <GlassCard className="linked-product-note"><Link to={`/product/${linkedProduct.slug}`}><img src={linkedProduct.image} alt="" /></Link><div><span className="eyebrow">Request linked to</span><strong>{linkedProduct.name}</strong><small>Tell us what you would change, add or make more personal.</small></div></GlassCard>}</div><div className="custom-stamp"><WandSparkles size={21} /><span>dream it<br /><strong>we’ll craft it</strong></span></div></section><div className="custom-layout"><GlassCard className="request-form-card"><div className="form-heading"><span className="form-step">01</span><div><p className="eyebrow">Tell us the good stuff</p><h2>Your idea, in its first draft.</h2></div></div><form onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}><div className="form-grid"><label className="floating-field"><input required placeholder=" " /><span>Your name</span></label><label className="floating-field"><input required placeholder=" " type="tel" /><span>Phone number</span></label><label className="floating-field"><input required placeholder=" " type="email" /><span>Email address</span></label><label className="floating-field"><input required placeholder=" " /><span>Idea title</span></label></div><label className="floating-field floating-textarea"><textarea required placeholder=" " rows="4" /><span>Tell us about it — the story, the vibe, the tiny details...</span></label><div className="form-section"><div className="field-title"><strong>Reference images</strong><span>up to 5 images</span></div><div className="file-drop"><UploadCloud size={22} /><strong>Drop your inspo here</strong><span>or browse from your device</span><small>JPG, PNG or WEBP · max 5MB each</small></div></div><div className="form-grid"><label className="select-field"><span>Preferred size</span><select><option>Not sure yet</option><option>Small / desk size</option><option>Medium / shelf size</option><option>Large / statement piece</option></select><ChevronDown size={15} /></label><label className="select-field"><span>Occasion</span><select><option>Just because</option><option>Birthday</option><option>Anniversary</option><option>Graduation</option><option>Festive</option></select><ChevronDown size={15} /></label></div><div className="form-section"><div className="field-title"><strong>Preferred colour</strong><span>{color}</span></div><div className="color-swatches">{['Blush pink', 'Lavender', 'Icy blue', 'Surprise me'].map((item, index) => <button type="button" className={color === item ? 'is-selected' : ''} onClick={() => setColor(item)} key={item}><span className={`swatch swatch-${index}`} />{item}</button>)}</div></div><div className="form-section"><div className="field-title"><strong>Budget range</strong><span>₹1,500 — ₹5,000</span></div><div className="budget-track"><span /><span /><span /></div><div className="budget-labels"><span>₹500</span><span>₹10,000+</span></div></div><div className="form-grid"><label className="floating-field"><input required placeholder=" " type="date" /><span>Needed by</span></label><label className="floating-field"><input placeholder=" " /><span>Anything else?</span></label></div><Button type="submit" className="full-button" icon={<Send size={16} />}>Send my idea</Button><p className="form-footnote">By sending this, you’re simply starting a conversation. {linkedProduct ? `This request will be linked to ${linkedProduct.name}. ` : ''}No payment until you approve a quote.</p></form></GlassCard><aside className="custom-aside"><div className="aside-image"><img src={media.collage} alt="Layered handmade craft references" /></div><GlassCard className="next-steps"><p className="eyebrow">What happens next</p><h3>A little magic, in five steps.</h3>{['Request received', 'We review your idea', 'A clear quote arrives', 'You say yes', 'We start crafting'].map((item, index) => <div className="next-step" key={item}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item}</strong>{index < 4 && <div className="next-line" />}</div>)}</GlassCard></aside></div></main><Footer /><WhatsAppFloat /></GradientBackground>;
}

function CartPage() {
  const { cart, updateQuantity, removeFromCart } = useApp();
  const subtotal = cart.reduce((sum, item) => sum + (item.price || item.product?.price || 0) * item.quantity, 0);
  return <GradientBackground variant="cart"><Navbar cartCount={cart.length} /><main className="container cart-page"><section className="page-intro compact-intro"><div><p className="eyebrow"><span className="eyebrow-mark">✦</span> Your little collection</p><h1>Cart, but make it <em>soft.</em></h1><p>Everything here is made to order with a little extra care.</p></div></section>{cart.length === 0 ? <EmptyState title="Your cart is still dreamy and empty" body="Start with a ready-made favourite, or tell us about something custom." onClick={() => window.location.assign('/shop')} /> : <div className="cart-layout"><div className="cart-items">{cart.map((item) => <GlassCard className="cart-item" key={item.key}><img src={item.image} alt={item.name} /><div className="cart-item-copy"><div className="item-kicker">{item.type === 'CUSTOM_FIXED' ? 'Customised for you' : 'Ready-made favourite'}</div><h3>{item.name}</h3><div className="item-chips">{(item.selected || []).map((option) => <span key={option}>{option}</span>)}</div><button className="remove-button" onClick={() => removeFromCart(item.key)}>Remove</button></div><div className="cart-item-end"><strong>{formatINR((item.price || item.product?.price || 0) * item.quantity)}</strong><div className="quantity-stepper"><button onClick={() => updateQuantity(item.key, Math.max(1, item.quantity - 1))}><Minus size={14} /></button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.key, item.quantity + 1)}><Plus size={14} /></button></div></div></GlassCard>)}</div><GlassCard className="summary-card"><p className="eyebrow">Your order summary</p><h2>A little joy, coming up.</h2><div className="coupon-field"><input placeholder="Have a coupon?" /><button>Apply</button></div><div className="summary-lines"><div><span>Subtotal</span><strong>{formatINR(subtotal)}</strong></div><div><span>Muradnagar delivery</span><strong>{subtotal > 1000 ? 'Free' : formatINR(50)}</strong></div><div className="summary-total"><span>Total</span><strong>{formatINR(subtotal + (subtotal > 1000 ? 0 : 50))}</strong></div></div><p className="summary-note"><Truck size={15} /> We currently deliver only in Muradnagar. More areas coming soon!</p><Button as={Link} to="/checkout" className="full-button" icon={<ArrowRight size={16} />}>Continue to checkout</Button><div className="summary-trust"><Check size={14} /> Secure payments by Razorpay</div></GlassCard></div>}</main><Footer /><WhatsAppFloat /></GradientBackground>;
}

function CheckoutPage() {
  const { cart } = useApp();
  const [step, setStep] = useState(1);
  const [success, setSuccess] = useState(false);
  const live = useLive();
  const currentSettings = live?.settings || storeSettings;
  if (currentSettings.storeStatus !== 'OPEN') return <GradientBackground variant="cart"><Navbar cartCount={cart.length} /><main className="container success-page"><div className="success-orb"><Clock3 size={32} /></div><p className="eyebrow">Checkout is taking a little pause</p><h1>We’re <em>fully booked</em> for now.</h1><p>{currentSettings.pauseMessage} Your cart is safe, and you can come back when the next slots open.</p><Button as={Link} to="/shop" icon={<ArrowRight size={17} />}>Keep browsing</Button></main><Footer /></GradientBackground>;
  if (success) return <GradientBackground variant="cart"><Navbar cartCount={cart.length} /><main className="container checkout-success"><div className="success-orb"><Check size={32} /></div><p className="eyebrow">Your order is in good hands</p><h1>Thank you, <em>lovely human.</em></h1><p>Your order <strong>EFU-1043</strong> is confirmed. We’ll send a note when it moves into production.</p><GlassCard className="order-success-card"><div><span>Ready by</span><strong>09 Oct 2026</strong></div><div><span>Delivery</span><strong>Campus handover</strong></div><div><span>Payment</span><strong>Advance paid</strong></div></GlassCard><Button as={Link} to="/account" icon={<ArrowRight size={17} />}>See your order</Button></main><Footer /></GradientBackground>;
  const steps = ['Contact', 'Delivery', 'Payment', 'Review & pay'];
  return <GradientBackground variant="cart"><Navbar cartCount={cart.length} /><main className="container checkout-page"><div className="checkout-header"><div><p className="eyebrow"><span className="eyebrow-mark">✦</span> Almost yours</p><h1>Let’s make it <em>official.</em></h1></div><div className="checkout-secure"><Check size={14} /> Secure checkout</div></div><div className="checkout-stepper">{steps.map((item, index) => <div className={`checkout-step ${step >= index + 1 ? 'is-active' : ''}`} key={item}><span>{step > index + 1 ? <Check size={13} /> : index + 1}</span><strong>{item}</strong>{index < steps.length - 1 && <i />}</div>)}</div><div className="checkout-layout"><GlassCard className="checkout-card">{step === 1 && <CheckoutContact />}{step === 2 && <CheckoutDelivery />}{step === 3 && <CheckoutPayment />}{step === 4 && <CheckoutReview />}</GlassCard><GlassCard className="checkout-summary"><p className="eyebrow">Your pieces</p>{cart.length ? cart.map((item) => <div className="checkout-item" key={item.key}><img src={item.image} alt="" /><div><strong>{item.name}</strong><span>Qty {item.quantity}</span></div><b>{formatINR(item.price * item.quantity)}</b></div>) : <div className="checkout-item"><div><strong>Sample order preview</strong><span>Add an item from Shop to personalise this.</span></div><b>₹899</b></div>}<div className="summary-total"><span>Total</span><strong>{formatINR(cart.reduce((sum, item) => sum + item.price * item.quantity, 0) || 899)}</strong></div><p className="summary-note"><Truck size={15} /> Muradnagar only · campus or home delivery</p></GlassCard></div><div className="checkout-actions">{step > 1 && <Button variant="ghost" onClick={() => setStep(step - 1)}><ChevronLeft size={16} /> Back</Button>}<Button onClick={() => step === 4 ? setSuccess(true) : setStep(step + 1)} icon={<ArrowRight size={16} />}>{step === 4 ? 'Pay securely' : 'Continue'}</Button></div></main></GradientBackground>;
}

function CheckoutContact() {
  const [isGift, setIsGift] = useState(false);
  const { user } = useAuth();
  return <div className="checkout-section"><p className="form-step">01 / 04</p><h2>Where should we send the little update?</h2><p className="checkout-subtitle">We’ll use this to share your order confirmation and delivery note.</p><div className="form-grid"><label className="floating-field"><input required placeholder=" " defaultValue={user?.name || "Ananya"} /><span>Full name</span></label><label className="floating-field"><input required placeholder=" " defaultValue={user?.phone || "+91 98 7654 3210"} /><span>Phone number · 10-digit Indian mobile</span></label></div><label className="floating-field"><input required placeholder=" " defaultValue={user?.email || "ananya@example.com"} /><span>Email address</span></label><label className="floating-field floating-textarea"><textarea placeholder=" " rows="3" /><span>Any note for us?</span></label><label className="gift-toggle"><input type="checkbox" checked={isGift} onChange={(event) => setIsGift(event.target.checked)} /><span className="checkbox">{isGift && <Check size={12} />}</span><span><strong>It’s a gift</strong><small>Add a message for the recipient and keep the sender name hidden.</small></span></label>{isGift && <div className="gift-fields"><div className="form-grid"><label className="floating-field"><input required placeholder=" " /><span>Recipient name</span></label><label className="floating-field"><input required placeholder=" " type="tel" /><span>Recipient phone</span></label></div><label className="floating-field floating-textarea"><textarea maxLength="300" placeholder=" " rows="3" /><span>Gift message · max 300 characters</span></label><label className="gift-option"><input type="checkbox" /><span className="checkbox" /><span>Hide my name from the recipient</span></label><label className="gift-option"><input type="checkbox" /><span className="checkbox" /><span>Add gift wrap · {formatINR(storeSettings.giftWrapPrice)}</span></label></div>}<div className="consent-row"><span className="checkbox is-checked"><Check size={12} /></span><span>I agree to the <Link to="/pages/terms-and-conditions">Terms</Link> and <Link to="/pages/privacy-policy">Privacy Policy</Link>.</span></div></div>;
}

function CheckoutDelivery() {
  const [area, setArea] = useState(deliveryAreas[0]);
  const [method, setMethod] = useState('campus');
  const other = area === 'Other location in Muradnagar';
  return <div className="checkout-section"><p className="form-step">02 / 04</p><h2>How should your order find you?</h2><p className="checkout-subtitle">We currently deliver only in Muradnagar. More areas coming soon!</p><label className="select-field"><span>Delivery area</span><select value={area} onChange={(event) => setArea(event.target.value)}>{deliveryAreas.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={15} /></label>{other && <div className="manual-location-card"><MapPin size={18} /><div><strong>Manual location request</strong><span>Type a Muradnagar place or landmark. Your order can be created while the studio reviews the location and fee.</span></div></div>}{other && <div className="form-grid"><label className="floating-field"><input required placeholder=" " /><span>Place / landmark in Muradnagar</span></label><label className="floating-field"><input required placeholder=" " type="tel" /><span>Contact phone</span></label></div>}<div className="delivery-methods"><button className={`delivery-method ${method === 'campus' ? 'is-selected' : ''}`} onClick={() => setMethod('campus')}><Package size={19} /><span><strong>Campus handover</strong><small>KIET: Main Gate, Canteen, Library or Hostel Gate · Free</small></span>{method === 'campus' && <Check size={16} />}</button><button className={`delivery-method ${method === 'home' ? 'is-selected' : ''}`} onClick={() => setMethod('home')}><Truck size={19} /><span><strong>Home delivery</strong><small>Within listed Muradnagar areas · ₹50 or free above ₹1,000</small></span>{method === 'home' && <Check size={16} />}</button></div><div className="form-grid"><label className="select-field"><span>{method === 'campus' ? 'Handover spot' : 'Delivery slot'}</span><select><option>{method === 'campus' ? 'Main Gate' : deliverySlots[2].label}</option>{method === 'campus' && <><option>Canteen</option><option>Library</option><option>Hostel Gate</option></>}{method === 'home' && <option>7 to 9 PM · Home delivery</option>}</select><ChevronDown size={15} /></label><label className="select-field"><span>Preferred date</span><select><option>09 Oct 2026 · available</option><option>10 Oct 2026 · available</option><option>11 Oct 2026 · available</option></select><CalendarDays size={15} /></label></div><div className="ready-by"><Clock3 size={17} /><span>Ready by <strong>09 Oct 2026</strong> based on your longest production time. Earlier dates are blocked.</span></div>{other && <p className="checkout-warning"><AlertCircle size={15} /> Location approval is pending. Production starts after admin approval unless the studio overrides it.</p>}</div>;
}

function CheckoutPayment() {
  const { cart } = useApp();
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0) || 899;
  const hasCustom = cart.some((item) => item.type === 'CUSTOM_FIXED' || item.type === 'CUSTOM_QUOTE' || item.customizable);
  const advance = Math.ceil(total * 0.5);
  const choices = hasCustom ? [{ title: 'Pay 50% advance online', detail: `Pay ${formatINR(advance)} now, the rest at delivery.`, icon: Tag }] : total <= 300 ? [{ title: 'Pay full amount online', detail: 'Fast, secure and all done now.', icon: CreditCard }, { title: 'Cash on delivery', detail: 'Pay when your Muradnagar order is handed over.', icon: Package }] : total <= 1000 ? [{ title: 'Pay full amount online', detail: 'Fast, secure and all done now.', icon: CreditCard }, { title: 'COD with ₹100 advance', detail: `Pay ${formatINR(100)} now, the rest at delivery.`, icon: Tag }] : [{ title: 'Pay 50% advance online', detail: `Pay ${formatINR(advance)} now, the rest at delivery.`, icon: Tag }];
  return <div className="checkout-section"><p className="form-step">03 / 04</p><h2>Choose a payment plan.</h2><p className="checkout-subtitle">{hasCustom ? 'Custom items require an online advance before production.' : 'The options below follow our server-side payment policy.'}</p><div className="payment-policy-note"><ShieldCheck size={17} /><span>{formatINR(total)} order · {hasCustom ? 'advance required for custom work' : total <= 300 ? 'COD or online available' : total <= 1000 ? 'COD needs a ₹100 advance' : '50% advance required above ₹1,000'}</span></div><div className="payment-options">{choices.map(({ title, detail, icon: PaymentIcon }, index) => <button className={`payment-option ${index === 0 ? 'is-selected' : ''}`} key={title}><div className="payment-icon"><PaymentIcon size={19} /></div><div><strong>{title}</strong><span>{detail}</span></div>{index === 0 && <Check size={16} />}</button>)}</div><div className="razorpay-strip"><span className="razorpay-mark">R</span><span>Secure payments by <strong>Razorpay</strong></span><Badge tone="icy">UPI · Cards · Netbanking</Badge></div></div>;
}

const CheckoutReview = () => <div className="checkout-section"><p className="form-step">04 / 04</p><h2>One last little look.</h2><p className="checkout-subtitle">Make sure everything feels right before you pay.</p><div className="review-summary"><div><span>Contact</span><strong>Ananya · +91 98 7654 3210</strong><button>Edit</button></div><div><span>Delivery</span><strong>KIET Group of Institutions · Main Gate</strong><button>Edit</button></div><div><span>Payment</span><strong>Advance online · balance at handover</strong><button>Edit</button></div><div><span>Gift</span><strong>Not a gift · surprise delivery off</strong><button>Edit</button></div></div><div className="agree-row"><span className="checkbox is-checked"><Check size={12} /></span><span>I understand handmade pieces may have tiny, lovely variations and custom pieces become non-returnable once production starts.</span></div></div>;

function AccountPage() {
  const [tab, setTab] = useState('Orders');
  const tabs = ['Orders', 'Custom Requests', 'Wishlist', 'Addresses', 'Profile'];
  const live = useLive();
  const products = live?.products?.length ? live.products : mockProducts;
  const { user } = useAuth();
  const displayName = user?.name || 'Lovely human';
  return <GradientBackground variant="account"><Navbar cartCount={useApp().cart.length} /><main className="container account-page"><section className="account-hero"><div className="account-avatar">{displayName[0]}</div><div><p className="eyebrow">Your little corner</p><h1>Hello, <em>{displayName}.</em></h1><p>Keep an eye on your orders, requests and saved little somethings.</p></div><Button as={Link} to="/shop" variant="secondary" icon={<ArrowRight size={16} />}>Keep browsing</Button></section><div className="account-tabs">{tabs.map((item) => <button className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)} key={item}>{item}{item === 'Wishlist' && <span>3</span>}</button>)}</div><div className="account-content">{tab === 'Orders' && <div className="account-orders"><div className="content-heading"><div><p className="eyebrow">Your recent orders</p><h2>Little things, on their way.</h2></div><Link to="/track-order">Track an order <ArrowUpRight size={15} /></Link></div><div className="account-order-list">{sampleOrders.slice(0, 2).map((order) => <GlassCard className="account-order-card" key={order.id}><div className="order-card-top"><div><Badge tone={order.status === 'IN PRODUCTION' ? 'blush' : 'icy'}>{order.status}</Badge><span className="order-number">{order.id}</span></div><strong>{formatINR(order.total)}</strong></div><div className="order-card-main"><img src={products.find((product) => product.name === order.item)?.image || media.product1} alt="" /><div><h3>{order.item}</h3><p>Placed {order.date} · {order.payment.toLowerCase()}</p><Timeline compact /></div></div><div className="order-card-bottom"><span><MapPin size={15} /> {order.location || 'Muradnagar delivery'} {order.locationApproval === 'PENDING' && <Badge tone="soft">Approval pending</Badge>}</span><span>{order.balanceDue ? `${formatINR(order.balanceDue)} balance due` : 'Paid in full'}</span><Link to="/track-order">View details <ArrowRight size={15} /></Link></div>{order.status === 'CONFIRMED' && <button className="cancel-order-link">Cancel order · refund suggestion shown before confirming</button>}</GlassCard>)}</div></div>}{tab === 'Custom Requests' && <div className="account-orders"><div className="content-heading"><div><p className="eyebrow">Your ideas, in progress</p><h2>Custom requests</h2></div><Button as={Link} to="/custom-request" variant="secondary" icon={<Plus size={16} />}>New request</Button></div>{sampleRequests.slice(0, 2).map((request) => <GlassCard className="request-row" key={request.id}><img src={request.image} alt="" /><div><Badge tone={request.status === 'QUOTE SENT' ? 'blush' : 'icy'}>{request.status}</Badge><h3>{request.title}</h3><p>{request.id} · Needed by {request.neededBy}</p>{request.status === 'QUOTE SENT' && <div className="quote-action-row"><strong>Quote: ₹2,500 · 50% advance</strong><button>Accept</button><button>Decline</button></div>}</div><ArrowRight size={17} /></GlassCard>)}</div>}{tab === 'Wishlist' && <div className="account-orders"><div className="content-heading"><div><p className="eyebrow">Saved for later</p><h2>Your wishlist</h2></div></div><div className="product-grid">{products.slice(0, 3).map((product) => <ProductCard product={product} key={product.id} onAdd={useApp().addToCart} onWish={useApp().onWish} isWished />)}</div></div>}{(tab === 'Addresses' || tab === 'Profile') && <GlassCard className="settings-card"><p className="eyebrow">{tab === 'Addresses' ? 'Delivery details' : 'Your details'}</p><h2>{tab === 'Addresses' ? 'Where should the magic arrive?' : 'A little about you.'}</h2><div className="form-grid"><label className="floating-field"><input defaultValue={tab === 'Addresses' ? (user?.name || 'Customer') : (user?.name || 'Customer')} placeholder=" " /><span>{tab === 'Addresses' ? 'Recipient name' : 'Full name'}</span></label><label className="floating-field"><input defaultValue={user?.phone || '+91 98 7654 3210'} placeholder=" " /><span>{tab === 'Addresses' ? 'Phone' : 'Phone number'}</span></label></div><label className="floating-field"><input defaultValue={tab === 'Addresses' ? 'Civil Lines, Muradnagar' : (user?.email || 'user@example.com')} placeholder=" " /><span>{tab === 'Addresses' ? 'Address / landmark' : 'Email address'}</span></label><Button>Save changes</Button></GlassCard>}</div></main><Footer /><WhatsAppFloat /></GradientBackground>;
}

function TrackOrderPage() {
  const [tracked, setTracked] = useState(false);
  return <GradientBackground variant="track"><Navbar cartCount={useApp().cart.length} /><main className="container track-page"><section className="track-card"><div className="track-sparkle">✦</div><p className="eyebrow">A little peek behind the curtain</p><h1>Track your <em>order.</em></h1><p>Enter your order number and phone number to see where your piece is in its journey.</p><form onSubmit={(event) => { event.preventDefault(); setTracked(true); }}><label className="floating-field"><input required placeholder=" " defaultValue={tracked ? 'EFU-1042' : ''} /><span>Order number</span></label><label className="floating-field"><input required placeholder=" " defaultValue={tracked ? '+91 98 7654 3210' : ''} /><span>Phone number</span></label><Button type="submit" className="full-button" icon={<Search size={16} />}>Find my order</Button></form>{tracked && <motion.div className="tracked-result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><div className="tracked-result-head"><div><Badge tone="blush">IN PRODUCTION</Badge><h3>Petal Memory Box</h3><span>EFU-1042 · placed 02 Oct 2026</span></div><strong>{formatINR(1599)}</strong></div><Timeline /><div className="track-note"><Sparkles size={16} /><span>We’re adding the final little details. You’ll hear from us when it’s ready.</span></div></motion.div>}</section></main><Footer /><WhatsAppFloat /></GradientBackground>;
}

function AboutPage() {
  return <GradientBackground variant="about"><Navbar cartCount={useApp().cart.length} /><main><section className="container about-hero"><p className="eyebrow"><span className="eyebrow-mark">✦</span> A small story from Muradnagar</p><h1>Made by hands.<br /><em>Held by heart.</em></h1><p>Especially For U started with a few college friends, a table full of craft supplies and a belief that the best gifts carry a little bit of the person who made them.</p><div className="about-hero-image"><img src={media.hero} alt="Pastel handmade crafts in a studio" /></div></section><section className="section story-section"><div className="container story-grid"><div><p className="eyebrow">Why we make</p><h2>Not just a thing.<br /><em>A feeling to keep.</em></h2></div><div><p>We make gifts for the moments that do not fit inside a generic box: the friendship that got you through exams, the room you are slowly making yours, the idea you have been carrying around.</p><p>Every order starts with a real person and a real reason. That is why our pieces are a little slower, a little softer and always made especially for you.</p><Badge tone="icy">Small studio · Muradnagar, UP</Badge></div></div></section><section className="section values-section"><div className="container"><SectionHeading align="center" eyebrow="The way we work" title={<>Three little <em>promises</em></>} /><div className="values-grid"><GlassCard><div className="value-icon"><Heart size={22} /></div><h3>Handmade</h3><p>Small batches, careful hands and the beautiful marks of something made by a person.</p></GlassCard><GlassCard><div className="value-icon"><Users size={22} /></div><h3>Personal</h3><p>We listen before we make, because the details that matter most are usually the smallest.</p></GlassCard><GlassCard><div className="value-icon"><Sparkles size={22} /></div><h3>Made for you</h3><p>No one-size-fits-all magic. Just thoughtful pieces for your exact kind of moment.</p></GlassCard></div></div></section></main><Footer /><WhatsAppFloat /></GradientBackground>;
}

function ContentPage() {
  const { slug } = useParams();
  const faqPage = slug === 'faq';
  const page = cmsPages.find((item) => item.slug === slug) || cmsPages[0];
  return <GradientBackground variant="about"><Navbar cartCount={useApp().cart.length} /><main className="container content-page"><section className="page-intro compact-intro"><div><p className="eyebrow"><span className="eyebrow-mark">✦</span> Especially For U · {faqPage ? 'Helpful little answers' : 'Editable studio page'}</p><h1>{faqPage ? <>Questions, answered <em>softly.</em></> : <>{page.title} <em>with care.</em></>}</h1><p>{faqPage ? 'A few things customers ask before making something personal.' : page.meta}</p></div><Badge tone={page.status === 'Published' ? 'icy' : 'soft'}>{page.status || 'Published'}</Badge></section><GlassCard className="content-document"><p className="review-before">REVIEW BEFORE PUBLISHING · This CMS-lite copy is starter content for the studio team.</p>{faqPage ? <div className="faq-list">{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}<ChevronDown size={16} /></summary><p>{faq.answer}</p></details>)}</div> : <><h2>{page.title}</h2><p>Especially For U is a small handmade studio run by college students in Muradnagar. We make gifts, keepsakes and custom pieces slowly, with clear communication and care.</p><h3>Good to know</h3><ul><li>We deliver only inside Muradnagar at launch, including KIET campus handovers and listed local areas.</li><li>Handmade items vary slightly in colour and finish. Custom pieces are non-returnable once production starts.</li><li>Customers confirm they have the right to use any uploaded image or design, and the studio may decline requests that copy protected work.</li></ul><h3>Need to ask something?</h3><p>Email <a href="mailto:hello@especiallyforu.in">hello@especiallyforu.in</a> or <a href="https://wa.me/919999999999">WhatsApp the studio</a>. We usually reply within 1–2 days.</p></>}</GlassCard></main><Footer /><WhatsAppFloat /></GradientBackground>;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function AdminProductsPanel() {
  const adminToken = localStorage.getItem('efu_admin_token') || '';
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({
    name: '', slug: '', category: '', type: 'READYMADE', price: '', originalPrice: '', badge: 'New',
    production: 'Ready in 3 days', description: '', audience: 'her', disclaimer: 'Each piece is unique and may vary slightly.',
    careInstructions: 'Keep dry, away from direct sunlight for long hours.', image: '',
    occasions: [], customizable: false, returnable: true, allowCustomRequest: true, premium: false, isActive: true,
  });

  const req = async (method, url, body) => {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || `Failed (${res.status})`);
    return data;
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        req('GET', '/api/admin/products'),
        req('GET', '/api/admin/categories'),
      ]);
      setItems(p.products || []);
      setCats(c.categories || []);
    } catch (err) {
      setFormMsg({ type: 'error', text: err.message || 'Failed to load products.' });
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const slugify = (txt) => txt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '', slug: '', category: cats[0]?.slug || cats[0]?.id || '', type: 'READYMADE', price: '', originalPrice: '', badge: 'New',
      production: 'Ready in 3 days', description: '', audience: 'her', disclaimer: 'Each piece is unique and may vary slightly.',
      careInstructions: 'Keep dry, away from direct sunlight for long hours.', image: '',
      occasions: [], customizable: false, returnable: true, allowCustomRequest: true, premium: false, isActive: true,
    });
    setFormMsg({ type: '', text: '' });
    setShowForm(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name || '', slug: p.slug || '', category: p.category || '', type: p.type || 'READYMADE',
      price: p.price != null ? String(p.price) : '', originalPrice: p.originalPrice != null ? String(p.originalPrice) : '',
      badge: p.badge || 'New', production: p.production || 'Ready in 3 days', description: p.description || '',
      audience: p.audience || 'her', disclaimer: p.disclaimer || '',
      careInstructions: p.careInstructions || '', image: p.image || '',
      occasions: Array.isArray(p.occasions) ? p.occasions : [],
      customizable: !!p.customizable, returnable: !!p.returnable,
      allowCustomRequest: p.allowCustomRequest !== false, premium: !!p.premium,
      isActive: p.isActive !== false,
    });
    setFormMsg({ type: '', text: '' });
    setShowForm(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setFormMsg({ type: '', text: '' });
    try {
      const payload = { ...form };
      if (payload.price) payload.price = Number(payload.price);
      if (payload.originalPrice) payload.originalPrice = Number(payload.originalPrice);
      let imageUrl = payload.image || '';
      if (payload.image && payload.image.startsWith('data:image')) {
        try {
          const uploadRes = await req('POST', '/api/admin/upload', { image: payload.image, filename: payload.slug || 'product' });
          imageUrl = uploadRes.url || payload.image;
        } catch (_) { /* keep inline data:image on failure */ }
      }
      payload.image = imageUrl;
      if (editing) {
        await req('PATCH', `/api/admin/products/${editing.id}`, payload);
        setFormMsg({ type: 'success', text: `Updated “${payload.name}” with price ${formatINR(payload.price)}.` });
      } else {
        await req('POST', '/api/admin/products', payload);
        setFormMsg({ type: 'success', text: `Created “${payload.name}”.` });
      }
      await refresh();
      if (!editing) {
        setForm((f) => ({ ...f, name: '', slug: '', image: '', description: '' }));
      }
    } catch (err) { setFormMsg({ type: 'error', text: err.message || 'Could not save.' }); }
  };

  const onImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setFormMsg({ type: 'error', text: 'Image too large — max 4MB.' });
      return;
    }
    try {
      const b64 = await fileToBase64(file);
      setForm((f) => ({ ...f, image: b64 }));
    } catch (_) { setFormMsg({ type: 'error', text: 'Could not read image.' }); }
  };

  const toggleOccasion = (o) => setForm((f) => ({
    ...f, occasions: f.occasions.includes(o) ? f.occasions.filter((x) => x !== o) : [...f.occasions, o],
  }));

  const doDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await req('DELETE', `/api/admin/products/${deleteConfirm.id}`);
      setItems((list) => list.map((it) => it.id === deleteConfirm.id ? { ...it, isActive: false } : it));
      setFormMsg({ type: 'success', text: `Archived “${deleteConfirm.name}”.` });
    } catch (err) { setFormMsg({ type: 'error', text: err.message || 'Could not archive product.' }); }
    setDeleteConfirm(null);
  };

  const toggleActive = async (p) => {
    try {
      await req('PATCH', `/api/admin/products/${p.id}`, { isActive: !p.isActive });
      setItems((list) => list.map((it) => it.id === p.id ? { ...it, isActive: !p.isActive } : it));
    } catch (err) { setFormMsg({ type: 'error', text: err.message }); }
  };

  const filtered = items.filter((p) => !search || `${p.name} ${p.slug} ${p.description}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="ops-section">
    <div className="ops-toolbar">
      <span className="ops-toolbar-note"><Palette size={15} /> {items.length} product{items.length === 1 ? '' : 's'} in catalog · edits save to MySQL</span>
      <div style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
        <div className="global-search" style={{ width: 260 }}><Search size={14} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" /></div>
        <Button variant="secondary" icon={<Plus size={15} />} onClick={openCreate}>Add product</Button>
      </div>
    </div>
    {formMsg.text && (
      <div style={{ padding: '10px 14px', borderRadius: 12, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
        background: formMsg.type === 'error' ? 'rgba(197,90,131,.1)' : 'rgba(62,142,126,.1)',
        border: `1px solid ${formMsg.type === 'error' ? 'rgba(197,90,131,.25)' : 'rgba(62,142,126,.25)'}`,
        color: formMsg.type === 'error' ? '#c55a83' : '#3e8e7e' }}>
        {formMsg.type === 'error' ? <AlertCircle size={15} /> : <Check size={15} />}
        <span>{formMsg.text}</span>
      </div>
    )}

    {showForm && (
      <GlassCard className="ops-table-card" style={{ marginBottom: 18 }}>
        <div className="admin-card-heading">
          <div><p className="eyebrow">{editing ? 'Edit product' : 'New product'}</p><h2>{editing ? editing.name : 'Add something new to the shop'}</h2></div>
          <button onClick={() => setShowForm(false)} className="icon-button" aria-label="Close form"><X size={16} /></button>
        </div>
        <form onSubmit={submitForm} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          <div style={{ gridColumn: 'span 2', display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
              <label className="floating-field">
                <input required placeholder=" " value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} />
                <span>Product name</span>
              </label>
              <label className="floating-field">
                <input required placeholder=" " value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
                <span>Slug (URL)</span>
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <label className="select-field">
                <span>Category</span>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {cats.map((c) => <option key={c.id || c.slug} value={c.slug || c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={15} />
              </label>
              <label className="select-field">
                <span>Type</span>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="READYMADE">Ready-made</option>
                  <option value="CUSTOM_FIXED">Custom (fixed price)</option>
                  <option value="CUSTOM_QUOTE">Custom (quote)</option>
                </select>
                <ChevronDown size={15} />
              </label>
              <label className="select-field">
                <span>Audience</span>
                <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                  <option value="her">For her</option><option value="him">For him</option>
                  <option value="them">For them</option><option value="couple">For a couple</option>
                  <option value="baby">For baby</option><option value="home">For home</option>
                </select>
                <ChevronDown size={15} />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
              <label className="floating-field">
                <input required type="number" min="0" placeholder=" " value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                <span>Price (₹)</span>
              </label>
              <label className="floating-field">
                <input type="number" min="0" placeholder=" " value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} />
                <span>Original price (₹)</span>
              </label>
              <label className="floating-field">
                <input placeholder=" " value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} />
                <span>Badge (New / Bestseller)</span>
              </label>
              <label className="floating-field">
                <input placeholder=" " value={form.production} onChange={(e) => setForm({ ...form, production: e.target.value })} />
                <span>Production text</span>
              </label>
            </div>
            <label className="floating-field floating-textarea">
              <textarea rows="3" placeholder=" " value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <span>Description</span>
            </label>
            <div>
              <p className="field-label" style={{ marginBottom: 8 }}>Occasions</p>
              <div className="mini-chips" style={{ justifyContent: 'flex-start' }}>
                {occasions.map((o) => {
                  const val = o.toUpperCase().replaceAll(' ', '_');
                  const selected = form.occasions.includes(val);
                  return <button type="button" key={o} onClick={() => toggleOccasion(val)} className={selected ? 'is-selected' : ''}>{o}</button>;
                })}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              <label className="toggle-row"><span><strong>Active</strong><small>Appears in the shop</small></span>
                <button type="button" className={`toggle ${form.isActive ? 'is-on' : ''}`} onClick={() => setForm({ ...form, isActive: !form.isActive })}><span /></button>
              </label>
              <label className="toggle-row"><span><strong>Premium</strong><small>Signature tier highlight</small></span>
                <button type="button" className={`toggle ${form.premium ? 'is-on' : ''}`} onClick={() => setForm({ ...form, premium: !form.premium })}><span /></button>
              </label>
              <label className="toggle-row"><span><strong>Customisable</strong><small>Options panel shown</small></span>
                <button type="button" className={`toggle ${form.customizable ? 'is-on' : ''}`} onClick={() => setForm({ ...form, customizable: !form.customizable })}><span /></button>
              </label>
              <label className="toggle-row"><span><strong>Allow custom request</strong><small>Show request CTA</small></span>
                <button type="button" className={`toggle ${form.allowCustomRequest ? 'is-on' : ''}`} onClick={() => setForm({ ...form, allowCustomRequest: !form.allowCustomRequest })}><span /></button>
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label className="floating-field floating-textarea">
                <textarea rows="2" placeholder=" " value={form.disclaimer} onChange={(e) => setForm({ ...form, disclaimer: e.target.value })} />
                <span>Disclaimer</span>
              </label>
              <label className="floating-field floating-textarea">
                <textarea rows="2" placeholder=" " value={form.careInstructions} onChange={(e) => setForm({ ...form, careInstructions: e.target.value })} />
                <span>Care instructions</span>
              </label>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
            <div>
              <p className="field-label" style={{ marginBottom: 8 }}>Product image</p>
              <div style={{ aspectRatio: '4 / 3', borderRadius: 14, border: '1px dashed rgba(90,63,86,.2)', background: 'rgba(90,63,86,.03)', display: 'grid', placeItems: 'center', overflow: 'hidden', position: 'relative' }}>
                {form.image
                  ? <img src={form.image.startsWith('data:') || form.image.startsWith('http') || form.image.startsWith('/') ? form.image : media.product1} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 16 }}><FileImage size={22} style={{ margin: '0 auto 6px' }} /><div style={{ fontSize: 13, fontWeight: 500 }}>No image yet</div><div style={{ fontSize: 11 }}>JPG, PNG, WEBP · up to 4MB</div></div>}
              </div>
              <label style={{ marginTop: 12, display: 'block' }}>
                <input type="file" accept="image/*" onChange={onImageChange} style={{ display: 'none' }} />
                <div tabIndex={0} style={{ cursor: 'pointer', padding: 14, borderRadius: 12, background: '#fff', border: '1px solid rgba(90,63,86,.15)', textAlign: 'center', fontSize: 13, color: 'var(--ink)' }}
                  onClick={(e) => e.currentTarget.previousElementSibling?.click()}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.previousElementSibling?.click(); }}
                >
                  <UploadCloud size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
                  {form.image ? 'Replace image' : 'Choose image'}
                </div>
                <input type="file" accept="image/*" onChange={onImageChange} style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} />
              </label>
            </div>
            <label className="toggle-row" style={{ padding: 12, borderRadius: 12, background: 'rgba(90,63,86,.04)', border: '1px solid rgba(90,63,86,.08)' }}>
              <span><strong>Returnable</strong><small>Ready-made items only usually</small></span>
              <button type="button" className={`toggle ${form.returnable ? 'is-on' : ''}`} onClick={() => setForm({ ...form, returnable: !form.returnable })}><span /></button>
            </label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Button className="full-button" type="submit">{editing ? 'Save changes' : 'Create product'}</Button>
              {editing && <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="button button-ghost" style={{ padding: '12px 16px', borderRadius: 14 }}>Cancel</button>}
            </div>
          </div>
        </form>
      </GlassCard>
    )}

    <GlassCard className="ops-table-card">
      <div className="admin-card-heading">
        <div><p className="eyebrow">Product catalogue</p><h2>{filtered.length} pieces to love</h2></div>
        <div style={{ display: 'inline-flex', gap: 10 }}>
          <button className="small-link" onClick={refresh}><RefreshCw size={13} /> Refresh</button>
          <button className="small-link"><Download size={13} /> Export CSV</button>
        </div>
      </div>
      {loading ? <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)' }}>Loading catalog…</div> : (
        filtered.length ? (
          <div className="orders-table" style={{ gridTemplateColumns: '72px 2fr 1fr 1fr 140px 140px 110px 120px' }}>
            <div className="orders-table-row orders-table-head" style={{ gridTemplateColumns: 'subgrid', gridColumn: '1 / -1' }}>
              <span></span><span>Name</span><span>Category</span><span>Occasions</span><span>Price</span><span>Badge</span><span>Status</span><span></span>
            </div>
            {filtered.map((p) => {
              const cat = cats.find((c) => c.id === p.category || c.slug === p.category);
              return <div className="orders-table-row" key={p.id} style={{ gridTemplateColumns: 'subgrid', gridColumn: '1 / -1', alignItems: 'center' }}>
                <span><img src={p.image || media.product1} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(90,63,86,.1)' }} /></span>
                <span><strong style={{ color: 'var(--ink)' }}>{p.name}</strong><small>{p.slug || p.id}</small></span>
                <span>{cat?.name || p.category || '—'}</span>
                <span>{Array.isArray(p.occasions) && p.occasions.length ? p.occasions.slice(0, 2).map((o) => <Badge key={o} tone="soft">{o}</Badge>) : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}</span>
                <span><strong style={{ color: 'var(--ink)' }}>{formatINR(Number(p.price || 0))}</strong>{p.originalPrice ? <small style={{ display: 'block', color: 'var(--muted)' }}>was {formatINR(Number(p.originalPrice))}</small> : null}</span>
                <span><Badge tone={p.premium ? 'signature' : 'icy'}>{p.badge || 'New'}</Badge>{p.premium && <small style={{ display: 'block', marginTop: 4 }}>premium</small>}</span>
                <span>
                  <label className="toggle-row" style={{ padding: 0, background: 'none', border: 'none' }}>
                    <span />
                    <button type="button" className={`toggle ${p.isActive !== false ? 'is-on' : ''}`} onClick={() => toggleActive(p)}><span /></button>
                  </label>
                  <small style={{ display: 'block', marginTop: 4, color: 'var(--muted)', textAlign: 'center' }}>{p.isActive !== false ? 'Active' : 'Hidden'}</small>
                </span>
                <span style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <button className="icon-button" onClick={() => openEdit(p)} aria-label="Edit product"><Edit3 size={14} /></button>
                  <button className="icon-button" style={{ color: '#c55a83' }} onClick={() => setDeleteConfirm(p)} aria-label="Archive product"><Trash2 size={14} /></button>
                </span>
              </div>;
            })}
          </div>
        ) : <EmptyState title="No products match yet" body="Create a product from the button above, or clear the search." />
      )}
    </GlassCard>

    {deleteConfirm && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', inset: 0, background: 'rgba(27,18,30,.45)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'grid', placeItems: 'center', padding: 20 }}>
        <GlassCard style={{ maxWidth: 440, width: '100%', padding: 24 }}>
          <div className="admin-card-heading">
            <div><p className="eyebrow">Confirm archive</p><h2>Move “{deleteConfirm.name}” out of the shop?</h2></div>
            <button onClick={() => setDeleteConfirm(null)} className="icon-button" aria-label="Close"><X size={16} /></button>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>This soft-deletes the product so it no longer appears on the site. Order history stays intact.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="button button-ghost" style={{ padding: '12px 16px', borderRadius: 14 }} onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <Button onClick={doDelete} style={{ background: '#c55a83' }}>Archive product</Button>
          </div>
        </GlassCard>
      </motion.div>
    )}
  </div>;
}

function AdminCategoriesPanel() {
  const adminToken = localStorage.getItem('efu_admin_token') || '';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [form, setForm] = useState({ name: '', slug: '', eyebrow: '', description: '', image: '', size: 'm', isActive: true, sort_order: 0 });

  const req = async (method, url, body) => {
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || `Failed (${res.status})`);
    return data;
  };
  const refresh = async () => {
    setLoading(true);
    try { const r = await req('GET', '/api/admin/categories'); setItems(r.categories || []); }
    catch (err) { setMsg({ type: 'error', text: err.message || 'Failed to load.' }); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);
  const slugify = (txt) => txt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', slug: '', eyebrow: 'Shop by feeling', description: '', image: '', size: 'm', isActive: true, sort_order: items.length });
    setMsg({ type: '', text: '' });
    setShowForm(true);
  };
  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name || '', slug: c.slug || '', eyebrow: c.eyebrow || 'Shop by feeling',
      description: c.description || '', image: c.image || '', size: c.size || 'm',
      isActive: c.isActive !== false, sort_order: c.sortOrder ?? c.sort_order ?? 0,
    });
    setShowForm(true);
  };
  const submit = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      const payload = { ...form, sort_order: Number(form.sort_order || 0) };
      if (payload.image && payload.image.startsWith('data:image')) {
        try {
          const up = await req('POST', '/api/admin/upload', { image: payload.image, filename: payload.slug || 'category' });
          payload.image = up.url || payload.image;
        } catch (_) { /* keep inline */ }
      }
      if (editing) await req('PATCH', `/api/admin/categories/${editing.id}`, payload);
      else await req('POST', '/api/admin/categories', payload);
      setMsg({ type: 'success', text: editing ? `Updated “${payload.name}”.` : `Created “${payload.name}”.` });
      setShowForm(false);
      await refresh();
    } catch (err) { setMsg({ type: 'error', text: err.message || 'Save failed.' }); }
  };
  const onImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setForm({ ...form, image: await fileToBase64(file) }); }
    catch (_) { setMsg({ type: 'error', text: 'Could not read image.' }); }
  };
  const del = async (c) => {
    try {
      await req('DELETE', `/api/admin/categories/${c.id}`);
      setItems((list) => list.map((x) => x.id === c.id ? { ...x, isActive: false } : x));
      setMsg({ type: 'success', text: `Archived “${c.name}”.` });
    } catch (err) { setMsg({ type: 'error', text: err.message }); }
  };

  return <div className="ops-section">
    <div className="ops-toolbar">
      <span className="ops-toolbar-note"><Tag size={15} /> {items.length} categorie{items.length === 1 ? '' : 's'} · used for browse, filters and product grouping</span>
      <Button variant="secondary" icon={<Plus size={15} />} onClick={openCreate}>Add category</Button>
    </div>
    {msg.text && (
      <div style={{ padding: '10px 14px', borderRadius: 12, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
        background: msg.type === 'error' ? 'rgba(197,90,131,.1)' : 'rgba(62,142,126,.1)',
        border: `1px solid ${msg.type === 'error' ? 'rgba(197,90,131,.25)' : 'rgba(62,142,126,.25)'}`,
        color: msg.type === 'error' ? '#c55a83' : '#3e8e7e' }}>
        {msg.type === 'error' ? <AlertCircle size={15} /> : <Check size={15} />}
        <span>{msg.text}</span>
      </div>
    )}
    {showForm && (
      <GlassCard className="ops-table-card" style={{ marginBottom: 18 }}>
        <div className="admin-card-heading">
          <div><p className="eyebrow">{editing ? 'Edit category' : 'New category'}</p><h2>{editing ? editing.name : 'Add a new category'}</h2></div>
          <button className="icon-button" onClick={() => setShowForm(false)}><X size={16} /></button>
        </div>
        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
              <label className="floating-field"><input required placeholder=" " value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} /><span>Category name</span></label>
              <label className="floating-field"><input required placeholder=" " value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} /><span>Slug</span></label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <label className="floating-field"><input placeholder=" " value={form.eyebrow} onChange={(e) => setForm({ ...form, eyebrow: e.target.value })} /><span>Eyebrow text</span></label>
              <label className="select-field">
                <span>Bento size</span>
                <select value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}>
                  <option value="s">Small</option><option value="m">Medium</option><option value="l">Large</option>
                </select>
                <ChevronDown size={15} />
              </label>
              <label className="floating-field"><input type="number" placeholder=" " value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /><span>Sort order</span></label>
            </div>
            <label className="floating-field floating-textarea"><textarea rows="2" placeholder=" " value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><span>Short description</span></label>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button type="submit" className="full-button">{editing ? 'Save changes' : 'Create category'}</Button>
              <button type="button" onClick={() => setShowForm(false)} className="button button-ghost" style={{ padding: '12px 16px', borderRadius: 14 }}>Cancel</button>
            </div>
          </div>
          <div>
            <p className="field-label" style={{ marginBottom: 8 }}>Cover image</p>
            <div style={{ aspectRatio: '4 / 3', borderRadius: 14, border: '1px dashed rgba(90,63,86,.2)', background: 'rgba(90,63,86,.03)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
              {form.image ? <img src={form.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ textAlign: 'center', color: 'var(--muted)' }}><Camera size={22} style={{ margin: '0 auto 6px' }} /><div style={{ fontSize: 13 }}>No image</div></div>}
            </div>
            <label style={{ display: 'block', marginTop: 12 }}>
              <div onClick={(e) => e.currentTarget.nextElementSibling?.click()} tabIndex={0} style={{ cursor: 'pointer', padding: 14, borderRadius: 12, background: '#fff', border: '1px solid rgba(90,63,86,.15)', textAlign: 'center', fontSize: 13 }}>
                <UploadCloud size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
                {form.image ? 'Replace image' : 'Choose image'}
              </div>
              <input type="file" accept="image/*" onChange={onImage} style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} />
            </label>
          </div>
        </form>
      </GlassCard>
    )}

    <div className="ops-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {loading ? <div style={{ padding: '40px 0', color: 'var(--muted)' }}>Loading categories…</div> :
        items.length ? items.map((c) => (
          <GlassCard className="area-card" key={c.id || c.slug}>
            <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
              <img src={c.image || media.product3} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
              <Badge style={{ position: 'absolute', top: 10, left: 10 }} tone={c.isActive !== false ? 'icy' : 'soft'}>{c.isActive !== false ? 'ACTIVE' : 'ARCHIVED'}</Badge>
              <Badge style={{ position: 'absolute', top: 10, right: 10 }} tone="signature">{(c.size || 'm').toUpperCase()}</Badge>
            </div>
            <div className="area-card-top">
              <div><h3 style={{ margin: 0 }}>{c.name}</h3><small style={{ color: 'var(--muted)', fontSize: 11 }}>/{c.slug || c.id} · sort {c.sort_order ?? 0}</small></div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="icon-button" onClick={() => openEdit(c)} title="Edit"><Edit3 size={14} /></button>
                <button className="icon-button" style={{ color: '#c55a83' }} onClick={() => del(c)} title="Archive"><Trash2 size={14} /></button>
              </div>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '8px 0 0' }}>{c.description || c.eyebrow || '—'}</p>
          </GlassCard>
        )) : <EmptyState title="No categories yet" body="Create categories to group your products in the shop." onClick={openCreate} />}
    </div>
  </div>;
}

function AdminOpsPanel({ tab }) {
  if (tab === 'Products') return <AdminProductsPanel />;
  if (tab === 'Categories') return <AdminCategoriesPanel />;
  if (tab === 'Orders') return <div className="ops-section"><div className="ops-toolbar"><button className="active-filter">Today’s deliveries</button><button>Payment pending</button><button>Location approvals pending</button><button><Download size={14} /> Export CSV</button></div><div className="ops-attention-grid">{adminNeedsAttention.map((item) => <GlassCard className="attention-card" key={item.label}><Badge tone={item.tone}>{item.label}</Badge><strong>{item.detail}</strong><div className="attention-actions"><button>Open detail</button><button className="icon-button"><PhoneCall size={14} /></button></div></GlassCard>)}</div><GlassCard className="ops-table-card"><div className="admin-card-heading"><div><p className="eyebrow">Order control</p><h2>Search, approve, update</h2></div><div className="global-search"><Search size={15} /><input placeholder="Order, phone, name or request ID" /></div></div>{sampleOrders.map((order) => <div className="ops-order-row" key={order.id}><div><strong>{order.id}</strong><span>{order.customer} · {order.item}</span></div><Badge tone={order.status === 'DELIVERED' ? 'icy' : 'blush'}>{order.status}</Badge><span>{order.locationApproval === 'PENDING' ? 'Location pending' : 'KIET · Main Gate'}</span><button className="small-link">Update status <ChevronDown size={13} /></button></div>)}</GlassCard></div>;
  if (tab === 'Custom Requests') return <div className="ops-section"><div className="ops-toolbar"><button className="active-filter">Awaiting my quote</button><button>Quote expiring soon</button><button><MessageCircle size={14} /> WhatsApp customer</button></div><GlassCard className="ops-table-card"><div className="admin-card-heading"><div><p className="eyebrow">Quote workflow</p><h2>Requests needing a reply</h2></div><Button variant="secondary" icon={<Plus size={15} />}>New quote</Button></div>{sampleRequests.map((request) => <div className="ops-request-row" key={request.id}><img src={request.image} alt="" /><div><strong>{request.id} · {request.title}</strong><span>{request.customer} · {request.budget} · needed by {request.neededBy}</span></div><Badge tone={request.status === 'QUOTE SENT' ? 'blush' : 'soft'}>{request.status}</Badge><div className="row-actions"><button>Ask customer</button><button className="button button-mini">Send quote</button></div></div>)}</GlassCard></div>;
  if (tab === 'Delivery Areas' || tab === 'Delivery Slots') return <div className="ops-section"><div className="ops-toolbar"><span className="ops-toolbar-note"><MapPin size={15} /> Muradnagar only · manual locations do not block order creation</span><Button variant="secondary" icon={<Plus size={15} />}>Add area</Button></div><div className="ops-card-grid">{deliveryAreas.map((area, index) => <GlassCard className="area-card" key={area}><div className="area-card-top"><Badge tone={index === 0 ? 'icy' : 'soft'}>{index === 0 ? 'CAMPUS' : area.startsWith('Other') ? 'MANUAL' : 'AREA'}</Badge><button className="icon-button"><Edit3 size={14} /></button></div><h3>{area}</h3><p>{index === 0 ? 'Main Gate · Canteen · Library · Hostel Gate' : area.startsWith('Other') ? 'Approval required · fee set by admin' : 'Active delivery area · ₹50 or free above ₹1,000'}</p></GlassCard>)}</div><GlassCard className="ops-table-card"><div className="admin-card-heading"><div><p className="eyebrow">Admin-editable slots</p><h2>Delivery slots</h2></div><Button variant="secondary" icon={<Plus size={15} />}>Add slot</Button></div>{deliverySlots.map((slot) => <div className="ops-order-row" key={slot.id}><div><strong>{slot.label}</strong><span>{slot.area} · {slot.days}</span></div><Badge tone="icy">{slot.remaining} spots left</Badge><button className="small-link">Edit <Edit3 size={13} /></button></div>)}</GlassCard></div>;
  if (tab === 'Store Controls') return <div className="ops-section"><div className="test-mode-banner"><AlertCircle size={17} /><div><strong>Store controls are live in the prototype</strong><span>These settings map to SiteSettings and will drive checkout, requests and capacity in the API.</span></div><Badge tone="icy">Asia/Kolkata</Badge></div><div className="ops-card-grid settings-grid"><GlassCard><p className="eyebrow">Store status</p><h2>Open for orders</h2><div className="segmented-control"><button className="is-selected">OPEN</button><button>PAUSED</button><button>MAINTENANCE</button></div><label className="toggle-row"><span><strong>Accepting custom requests</strong><small>Separate from the store toggle</small></span><span className="toggle is-on"><span /></span></label><label className="floating-field"><input defaultValue={storeSettings.pauseMessage} placeholder=" " /><span>Pause message</span></label></GlassCard><GlassCard><p className="eyebrow">Capacity & cutoffs</p><h2>Protect the studio rhythm.</h2><div className="capacity-list"><span>Daily orders <strong>{storeSettings.dailyOrderCapacity}</strong></span><span>Daily custom requests <strong>{storeSettings.dailyCustomCapacity}</strong></span><span>Active production cap <strong>{storeSettings.maxActiveProductionOrders}</strong></span><span>Order cutoff <strong>{storeSettings.orderCutoffTime} IST</strong></span></div><div className="store-controls-foot"><CalendarDays size={15} /> Holidays and blackout dates are managed here.</div></GlassCard></div><GlassCard className="ops-table-card"><div className="admin-card-heading"><div><p className="eyebrow">Customer-facing</p><h2>Announcement bar</h2></div><Badge tone="blush">ACTIVE</Badge></div><div className="announcement-preview">{storeSettings.announcementBar.text}<ArrowUpRight size={15} /></div></GlassCard></div>;
  if (tab === 'Pages') return <div className="ops-section"><div className="ops-toolbar"><span className="ops-toolbar-note"><FileText size={15} /> CMS-lite · policy pages need review before publishing</span><Button variant="secondary" icon={<Plus size={15} />}>New page</Button></div><GlassCard className="ops-table-card">{cmsPages.map((page) => <div className="ops-order-row" key={page.slug}><div><strong>{page.title}</strong><span>/pages/{page.slug} · {page.meta}</span></div><Badge tone={page.status === 'Published' ? 'icy' : 'soft'}>{page.status}</Badge><span className="review-note">{page.note}</span><button className="small-link">Edit <Edit3 size={13} /></button></div>)}<div className="faq-strip"><strong>{faqs.length} FAQs</strong><span>Editable content for launch-ready payment gateway pages.</span><button className="small-link">Manage FAQs <ArrowUpRight size={13} /></button></div></GlassCard></div>;
  if (tab === 'Team') return <div className="ops-section"><div className="ops-toolbar"><span className="ops-toolbar-note"><LockKeyhole size={15} /> Permissions are enforced on every admin route</span><Button variant="secondary" icon={<UserPlus size={15} />}>Add team member</Button></div><div className="team-grid">{adminTeam.map((member) => <GlassCard className="team-card" key={member.name}><div className="team-avatar">{member.name[0]}</div><div><strong>{member.name}</strong><Badge tone={member.role === 'owner' ? 'signature' : member.role === 'manager' ? 'blush' : 'soft'}>{member.role}</Badge><p>{member.detail}</p></div><button className="icon-button"><Edit3 size={14} /></button></GlassCard>)}</div><GlassCard className="security-note"><ShieldCheck size={19} /><div><strong>Security guardrails</strong><span>Five failed logins lock an account for 15 minutes. Strong passwords, logout-all-devices and a clean TOTP hook are ready for the backend.</span></div></GlassCard></div>;
  if (tab === 'Audit Log') return <div className="ops-section"><div className="ops-toolbar"><span className="ops-toolbar-note"><ClipboardList size={15} /> Immutable record of money, status, location and role changes</span><button><Download size={14} /> Export log</button></div><GlassCard className="ops-table-card">{auditLogs.map((log) => <div className="ops-order-row" key={`${log.entity}-${log.action}`}><div><strong>{log.action}</strong><span>{log.entity} · by {log.actor}</span></div><span>{log.at}</span><Badge tone="icy">Recorded</Badge><button className="small-link">View diff <ArrowUpRight size={13} /></button></div>)}</GlassCard></div>;
  if (tab === 'Reports') return <div className="ops-section"><div className="ops-toolbar"><span className="ops-toolbar-note"><BarChart3 size={15} /> Revenue, conversion and repeat-customer signals</span><button><Download size={14} /> Export CSV</button></div><div className="report-grid"><GlassCard><span>Revenue this month</span><strong>₹28,400</strong><small>↑ 12% vs last month</small></GlassCard><GlassCard><span>Custom → order conversion</span><strong>38%</strong><small>from 42 requests</small></GlassCard><GlassCard><span>Average order value</span><strong>₹1,420</strong><small>across 20 paid orders</small></GlassCard><GlassCard><span>Repeat customers</span><strong>31%</strong><small>students coming back</small></GlassCard></div><GlassCard className="ops-table-card"><div className="admin-card-heading"><div><p className="eyebrow">Exports</p><h2>Open in Excel</h2></div></div><div className="export-actions"><button><Download size={15} /> Orders CSV</button><button><Download size={15} /> Customers CSV</button><button><Download size={15} /> Payments CSV</button><button><Download size={15} /> Products CSV</button></div></GlassCard></div>;
  if (tab === 'Notifications') return <div className="ops-section"><div className="ops-toolbar"><span className="ops-toolbar-note"><Bell size={15} /> Branded email now, WhatsApp hook later</span><Button variant="secondary" icon={<Edit3 size={15} />}>Message templates</Button></div><GlassCard className="ops-table-card">{notificationLogs.map((log) => <div className="ops-order-row" key={`${log.type}-${log.recipient}`}><div><strong>{log.type}</strong><span>{log.channel} · {log.recipient} · {log.attempts} attempt(s)</span></div><Badge tone={log.status === 'Delivered' ? 'icy' : 'soft'}>{log.status}</Badge><button className="small-link">Open log <ArrowUpRight size={13} /></button></div>)}</GlassCard></div>;
  if (tab === 'Payment Issues') return <div className="ops-section"><div className="test-mode-banner"><AlertCircle size={17} /><div><strong>TEST MODE</strong><span>Razorpay key starts with rzp_test_. Never use this environment for live collection.</span></div><Badge tone="blush">rzp_test_</Badge></div><GlassCard className="ops-table-card"><div className="admin-card-heading"><div><p className="eyebrow">Daily reconciliation</p><h2>1 issue needs a re-sync</h2></div><Button variant="secondary" icon={<RefreshCw size={15} />}>Run reconciliation</Button></div><div className="payment-issue-row"><div><strong>EFU-1037 · paid but not confirmed</strong><span>Razorpay payment captured · webhook retry pending</span></div><Badge tone="blush">Mismatch</Badge><button className="small-link">Re-sync payment <RefreshCw size={13} /></button></div></GlassCard></div>;
  return <div className="ops-section"><GlassCard className="empty-state"><div className="empty-icon"><SlidersHorizontal size={25} /></div><h3>{tab} is ready for the next backend milestone.</h3><p>The prototype keeps this panel modular so the MERN resource can plug in without moving catalogue, pricing or permission logic into page components.</p><Button variant="secondary">Configure</Button></GlassCard></div>;
}

function AdminLoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed. Please check your credentials.');
      }
      localStorage.setItem('efu_admin_token', data.token);
      localStorage.setItem('efu_admin_user', JSON.stringify(data.admin));
      onLoginSuccess(data.token, data.admin);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground variant="admin">
      <Navbar cartCount={useApp().cart.length} />
      <main className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 20px 60px' }}>
        <GlassCard style={{ maxWidth: '440px', width: '100%', padding: '36px 30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--ink)', color: '#fff', display: 'grid', placeItems: 'center', margin: '0 auto 14px', fontSize: '18px', fontWeight: 600, fontFamily: 'Fraunces, serif' }}>
              EFU
            </div>
            <p className="eyebrow" style={{ marginBottom: '4px' }}>Studio Desk</p>
            <h1 style={{ fontSize: '28px', margin: '0 0 6px', fontFamily: 'Fraunces, serif' }}>Admin Sign In</h1>
            <p style={{ color: 'var(--muted)', fontSize: '12px', margin: 0 }}>Restricted portal for studio owners and team members.</p>
          </div>

          {error && (
            <div style={{ background: 'rgba(197, 90, 131, 0.12)', border: '1px solid rgba(197, 90, 131, 0.3)', borderRadius: '10px', padding: '10px 14px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: '#c55a83', fontSize: '12px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
            <label className="floating-field">
              <input
                required
                type="email"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <span>Admin Email address</span>
            </label>

            <label className="floating-field">
              <input
                required
                type="password"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <span>Password</span>
            </label>

            <Button type="submit" disabled={loading} style={{ width: '100%', marginTop: '6px' }}>
              {loading ? 'Verifying credentials...' : 'Enter Studio Desk'}
            </Button>
          </form>

          <div style={{ marginTop: '22px', textAlign: 'center', fontSize: '11px', color: 'var(--muted)' }}>
            <LockKeyhole size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />
            Protected by JWT & secure session tokens
          </div>
        </GlassCard>
      </main>
    </GradientBackground>
  );
}

function AdminPage() {
  const [tab, setTab] = useState('Dashboard');
  const [token, setToken] = useState(() => localStorage.getItem('efu_admin_token') || '');
  const [adminUser, setAdminUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('efu_admin_user') || 'null');
    } catch {
      return null;
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('efu_admin_token');
    localStorage.removeItem('efu_admin_user');
    setToken('');
    setAdminUser(null);
  };

  if (!token) {
    return <AdminLoginPage onLoginSuccess={(tok, user) => { setToken(tok); setAdminUser(user); }} />;
  }

  const adminLinks = [['Dashboard', LayoutDashboard], ['Orders', Package], ['Custom Requests', MessageCircle], ['Products', Palette], ['Categories', Tag], ['Discounts', Zap], ['Delivery Areas', Truck], ['Delivery Slots', CalendarDays], ['Customers', Users], ['Reviews', Star], ['Inventory', BarChart3], ['Homepage', WandSparkles], ['Pages', FileText], ['Store Controls', SlidersHorizontal], ['Team', UserPlus], ['Reports', ClipboardList], ['Notifications', Bell], ['Audit Log', LockKeyhole], ['Payment Issues', AlertCircle], ['Settings', Settings]];
  return <GradientBackground variant="admin"><Navbar cartCount={useApp().cart.length} /><main className="admin-shell container"><aside className="admin-sidebar"><div className="admin-brand"><span>EFU</span><div><strong>Studio desk</strong><small>Especially For U</small></div></div><nav>{adminLinks.map(([label, Component]) => <button className={tab === label ? 'is-active' : ''} key={label} onClick={() => setTab(label)}><Component size={16} />{label}</button>)}</nav><div className="admin-sidebar-foot"><span className="admin-avatar">{adminUser?.name ? adminUser.name[0] : 'A'}</span><div><strong>{adminUser?.name || 'Admin'}</strong><small>{adminUser?.role || 'Owner'}</small></div><button onClick={handleLogout} title="Log out" style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', color: 'var(--muted)', display: 'grid', placeItems: 'center' }}><LogOut size={15} /></button></div></aside><section className="admin-content"><div className="admin-mobile-title"><div><p className="eyebrow">Studio desk</p><h1>{tab}</h1></div><Button variant="secondary" icon={<Plus size={16} />}>Add new</Button></div>{tab === 'Dashboard' ? <><div className="test-mode-banner"><AlertCircle size={17} /><div><strong>TEST MODE · All payment actions are safe to preview</strong><span>Razorpay test key detected · live payments remain disabled until launch configuration.</span></div><Badge tone="icy">OPEN</Badge></div><div className="admin-stat-grid"><GlassCard><span className="stat-label">Orders today</span><strong>12</strong><small className="stat-up">↑ 18% this week</small></GlassCard><GlassCard><span className="stat-label">Pending quotes</span><strong>08</strong><small>3 need your reply</small></GlassCard><GlassCard><span className="stat-label">In production</span><strong>14</strong><small>Across 7 categories</small></GlassCard><GlassCard><span className="stat-label">Revenue</span><strong>₹28.4k</strong><small className="stat-up">↑ 12% this month</small></GlassCard></div><div className="admin-main-grid"><GlassCard className="revenue-card"><div className="admin-card-heading"><div><p className="eyebrow">A gentle upward trend</p><h2>Revenue overview</h2></div><select><option>Last 30 days</option><option>Last 7 days</option></select></div><div className="chart"><div className="chart-grid"><span /><span /><span /><span /></div><svg viewBox="0 0 600 180" preserveAspectRatio="none" aria-label="Revenue sparkline"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#FFAFCC" stopOpacity=".42" /><stop offset="100%" stopColor="#FFAFCC" stopOpacity="0" /></linearGradient></defs><path d="M0,152 C30,145 42,118 76,125 S120,139 153,104 S203,120 229,92 S277,108 306,74 S353,84 377,93 S414,61 447,70 S479,84 507,45 S552,63 600,23 L600,180 L0,180 Z" fill="url(#chartFill)" /><path d="M0,152 C30,145 42,118 76,125 S120,139 153,104 S203,120 229,92 S277,108 306,74 S353,84 377,93 S414,61 447,70 S479,84 507,45 S552,63 600,23" fill="none" stroke="#C55A83" strokeWidth="3" strokeLinecap="round" /></svg><div className="chart-labels"><span>01 Sep</span><span>15 Sep</span><span>30 Sep</span></div></div></GlassCard><GlassCard className="requests-card"><div className="admin-card-heading"><div><p className="eyebrow">Needs attention</p><h2>Keep things moving</h2></div><button className="small-link" onClick={() => setTab('Orders')}>View all <ArrowUpRight size={14} /></button></div>{adminNeedsAttention.map((item) => <div className="admin-request" key={item.label}><div className="attention-icon"><AlertCircle size={15} /></div><div><strong>{item.label}</strong><span>{item.detail}</span></div><Badge tone={item.tone}>Open</Badge></div>)}</GlassCard></div><GlassCard className="orders-table-card"><div className="admin-card-heading"><div><p className="eyebrow">Keep things moving</p><h2>Recent orders</h2></div><button className="small-link" onClick={() => setTab('Orders')}>Manage orders <ArrowUpRight size={14} /></button></div><div className="orders-table"><div className="orders-table-row orders-table-head"><span>Order</span><span>Customer</span><span>Piece</span><span>Status</span><span>Total</span></div>{sampleOrders.map((order) => <div className="orders-table-row" key={order.id}><span><strong>{order.id}</strong><small>{order.date}</small></span><span>{order.customer}</span><span>{order.item}</span><span><Badge tone={order.status === 'DELIVERED' ? 'icy' : 'blush'}>{order.status}</Badge></span><span><strong>{formatINR(order.total)}</strong></span></div>)}</div></GlassCard></> : <AdminOpsPanel tab={tab} />}</section></main></GradientBackground>;
}

const LiveDataContext = createContext(null);
function LiveDataProvider({ children }) {
  const live = useLiveData();
  return <LiveDataContext.Provider value={live}>{children}</LiveDataContext.Provider>;
}
function useLive() { return useContext(LiveDataContext) || useLiveData(); }

function CategoryRoute() {
  const { slug } = useParams();
  const live = useLive();
  return <ShopPage initialCategory={slug} live={live} />;
}

function OccasionRoute() {
  const { occasion } = useParams();
  const live = useLive();
  return <ShopPage initialOccasion={occasion ? occasion.toUpperCase().replaceAll('-', '_') : 'all'} live={live} />;
}

function App() {
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState(['p3', 'p11']);
  const [toast, setToast] = useState(null);
  const reduced = useReducedMotion();

  const addToCart = (product) => {
    const key = `${product.id}-${(product.selected || []).join('-') || 'default'}`;
    setCart((items) => {
      const existing = items.find((item) => item.key === key);
      return existing
        ? items.map((item) => item.key === key ? { ...item, quantity: item.quantity + (product.quantity || 1) } : item)
        : [...items, { ...product, key, quantity: product.quantity || 1 }];
    });
    setToast(`${product.name} is in your cart`);
  };

  const onWish = (product) => {
    setWishlist((items) => items.includes(product.id) ? items.filter((id) => id !== product.id) : [...items, product.id]);
    setToast(wishlist.includes(product.id) ? 'Removed from your wishlist' : 'Saved to your wishlist');
  };

  const updateQuantity = (key, quantity) => setCart((items) => items.map((item) => item.key === key ? { ...item, quantity } : item));
  const removeFromCart = (key) => setCart((items) => items.filter((item) => item.key !== key));

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  window.__efuApp = { cart, wishlist, addToCart, onWish, updateQuantity, removeFromCart, reduced };

  return (
    <AuthProvider>
      <LiveDataProvider>
        <AnimatePresence mode="wait">
          <Routes>
            {/* Public Storefront Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/category/:slug" element={<CategoryRoute />} />
            <Route path="/occasion/:occasion" element={<OccasionRoute />} />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path="/custom-request" element={<CustomRequestPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/track-order" element={<TrackOrderPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/pages/:slug" element={<ContentPage />} />

            {/* Authentication Routes */}
            <Route path="/login" element={<AuthPage initialMode="login" />} />
            <Route path="/signup" element={<AuthPage initialMode="signup" />} />
            <Route path="/forgot-password" element={<AuthPage initialMode="forgot" />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Customer Account Routes (Protected) */}
            <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
            <Route path="/account/requests/:id" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />

            {/* Admin Desk Route (Protected for the 2 authorized owners) */}
            <Route path="/admin" element={<AdminPage />} />

            {/* Catch-all Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
        <AnimatePresence>
          {toast && (
            <motion.div className="toast" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
              <Check size={16} />{toast}
            </motion.div>
          )}
        </AnimatePresence>
      </LiveDataProvider>
    </AuthProvider>
  );
}

export default App;
