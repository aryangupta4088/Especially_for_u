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
  adminNeedsAttention, adminTeam, auditLogs, cmsPages, deliveryAreas, deliverySlots,
  faqs, formatINR, howItWorks, media, notificationLogs, occasions, products as mockProducts, sampleOrders,
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
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(storeSettings);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = () => Promise.all([
      fetch('/api/products').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/categories').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/settings/public').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([p, c, s]) => {
      if (!alive) return;
      // A successful empty response is still authoritative. Keeping mock data
      // here made a disconnected database look like a real 16-item catalog.
      setProducts(Array.isArray(p?.products) ? p.products : []);
      setCategories(Array.isArray(c?.categories) ? c.categories : []);
      if (s?.settings) setSettings(s.settings);
      setLoaded(true);
    });
    load();
    const onCatalogUpdated = () => load();
    window.addEventListener('efu:catalog-updated', onCatalogUpdated);
    return () => { alive = false; };
  }, []);
  return { products, categories, settings, loaded };
}

function Button({ children, variant = 'primary', icon, type = 'button', onClick, className = '', as: Component = 'button', to, disabled = false }) {
  const content = <>{children}{icon && <span className="button-icon">{icon}</span>}</>;
  const classes = `button button-${variant} ${className}`;
  if (Component === Link) return <Link to={to} className={classes}>{content}</Link>;
  return <button type={type} onClick={onClick} className={classes} disabled={disabled}>{content}</button>;
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

function PinkStars({ rating = 0, onChange, label = 'Rating' }) {
  return <span className="pink-stars" role={onChange ? 'group' : 'img'} aria-label={`${label}: ${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((star) => onChange ? <button type="button" key={star} onClick={() => onChange(star)} aria-label={`${star} star${star > 1 ? 's' : ''}`}><Star size={20} fill={star <= rating ? 'currentColor' : 'none'} /></button> : <Star key={star} size={16} fill={star <= rating ? 'currentColor' : 'none'} />)}
  </span>;
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
  const { logout, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [adminSession, setAdminSession] = useState(() => {
    if (!localStorage.getItem('efu_admin_token')) return null;
    try { return JSON.parse(localStorage.getItem('efu_admin_user') || 'null'); }
    catch { return null; }
  });
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    const token = localStorage.getItem('efu_admin_token');
    if (!token) { setAdminSession(null); return; }
    let active = true;
    try {
      const cachedAdmin = localStorage.getItem('efu_admin_user');
      if (cachedAdmin) setAdminSession(JSON.parse(cachedAdmin));
    } catch { /* Validate the session with the server below. */ }
    fetch('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error('Admin session expired.');
        if (active) setAdminSession(data.admin);
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem('efu_admin_token');
        localStorage.removeItem('efu_admin_user');
        setAdminSession(null);
      });
    return () => { active = false; };
  }, [location.pathname]);

  const handleSignOut = () => {
    if (adminSession) {
      localStorage.removeItem('efu_admin_token');
      localStorage.removeItem('efu_admin_user');
      setAdminSession(null);
    }
    if (user) logout();
    setMenuOpen(false);
    navigate('/', { replace: true });
  };

  const links = [
    ['Home', '/'],
    ['Shop', '/shop'],
    ['Custom Request', '/custom-request'],
    ['About', '/about'],
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

            {user || adminSession ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {(isAdmin || adminSession) && (
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
                {user && <Link
                  to="/account"
                  className="icon-button nav-account"
                  aria-label="My Account"
                  title={`Account: ${user.name || user.email}`}
                >
                  <CircleUserRound size={18} />
                </Link>}
                <button
                  onClick={handleSignOut}
                  className="icon-button"
                  title={`Sign out ${(adminSession || user)?.name || (adminSession || user)?.email || 'admin'}`}
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

              {user || adminSession ? (
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)', marginTop: '12px' }}>
                  <div className="mobile-menu-note" style={{ marginBottom: '10px' }}>
                    <span>Signed in as</span><strong>{(adminSession || user).name || (adminSession || user).email}</strong>
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {user && <NavLink to="/account" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '10px', background: 'rgba(90,63,86,.05)', textDecoration: 'none', color: 'var(--ink)', fontSize: '13px', fontWeight: 500 }}>
                      My Account & Orders <ArrowRight size={14} />
                    </NavLink>}
                    {(isAdmin || adminSession) && (
                      <NavLink to="/admin" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '10px', background: 'rgba(197,90,131,.12)', textDecoration: 'none', color: '#b24d76', fontSize: '13px', fontWeight: 600 }}>
                        👑 Studio Admin Desk <ArrowRight size={14} />
                      </NavLink>
                    )}
                    <button
                      onClick={handleSignOut}
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
      <div><p className="footer-label">Need a little help?</p><Link to="/account">Your account & chats</Link><Link to="/pages/faq">FAQs</Link><a href="mailto:hello@especiallyforu.in">hello@especiallyforu.in</a><a href="https://wa.me/919997837648">WhatsApp us</a></div>
      <div className="footer-social"><p className="footer-label">Find us in the wild</p><div className="social-row"><a href="https://instagram.com" aria-label="Instagram"><Camera size={18} /></a><a href="https://wa.me/919997837648" aria-label="WhatsApp"><MessageCircle size={18} /></a></div><p className="small-note">Made with soft corners and a lot of care.</p></div>
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

function WhatsAppFloat() { return <a className="whatsapp-float" href="https://wa.me/919997837648" aria-label="Chat on WhatsApp"><MessageCircle size={21} /><span>Say hello</span></a>; }

function ProductCard({ product, onAdd, onWish, isWished, categories = [] }) {
  const navigate = useNavigate();
  const cta = 'Request this item';
  const handlePrimary = () => {
    if (product.type === 'CUSTOM_QUOTE') return navigate(`/custom-request?product=${product.slug}`);
    const options = (product.options || []).map((option) => {
      const value = option.values?.[0];
      return value ? { label: option.label, value: value.name, adjustment: Number(value.adjustment || 0) } : null;
    }).filter(Boolean);
    const adjustment = options.reduce((sum, option) => sum + option.adjustment, 0);
    onAdd?.({ ...product, productId: product.id, price: Number(product.price) + adjustment, selected: options.map((option) => option.value), selectedOptions: options, quantity: 1 });
    navigate('/checkout');
  };
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

function HomePage({ live: providedLive }) {
  const live = providedLive || useLive();
  const { addToCart, onWish, wishlist } = useApp();
  const products = live?.products || [];
  const categories = live?.categories || [];
  const settings = live?.settings || storeSettings;
  const featured = products.slice(0, 4);
  const [homeReviews, setHomeReviews] = useState([]);
  useEffect(() => {
    fetch('/api/reviews').then((response) => response.ok ? response.json() : null)
      .then((data) => setHomeReviews((data?.reviews || []).slice(0, 6))).catch(() => setHomeReviews([]));
  }, []);
  return <GradientBackground variant="home"><Navbar cartCount={useApp().cart.length} wishlistCount={wishlist.length} settings={settings} /><main>
    <section className="hero-section"><div className="hero-image"><img src={media.hero} alt="Pastel handmade crafts arranged on a table" /></div><div className="hero-overlay" /><div className="container hero-content"><div className="hero-copy"><p className="eyebrow hero-eyebrow"><span className="eyebrow-mark">✦</span> Small studio · big feelings</p><h1>Made <em>Especially</em><br />For U <span className="sparkle-inline">✦</span></h1><p className="hero-subtitle">{settings.tagline || 'Custom gifts, handmade creations & little things made just for you.'}</p><div className="hero-actions"><Button as={Link} to="/shop" icon={<ArrowRight size={17} />}>Shop ready-made</Button><Button as={Link} to="/custom-request" variant="secondary" icon={<WandSparkles size={17} />}>Create something custom</Button></div><div className="hero-note"><span className="hero-note-mark">♡</span><span>Made slowly in Muradnagar<br /><strong>for your favourite people.</strong></span></div></div></div><a href="#explore" className="scroll-cue"><span>Scroll to explore</span><ArrowDown size={16} /></a></section>
    <Marquee />
    <section className="section section-explore" id="explore"><div className="container"><SectionHeading eyebrow="Made by hand, chosen by heart" title={<>Explore our <em>creations</em></>} body="From a tiny note card to a whole little world — find something that feels like them." action={<Button as={Link} to="/shop" variant="ghost" icon={<ArrowUpRight size={16} />}>See all pieces</Button>} /><div className="category-bento">{categories.map((category, index) => <CategoryCard category={category} index={index} key={category.id} />)}</div></div></section>
    <section className="section section-featured"><div className="container"><SectionHeading eyebrow="A little something special" title={<>Made Especially <em>For U</em></>} body="Our most-loved handmade pieces, ready to become part of your story." action={<Button as={Link} to="/shop" variant="ghost" icon={<ArrowRight size={16} />}>Shop all</Button>} /><div className="product-grid featured-grid">{featured.map((product) => <ProductCard product={product} key={product.id} onAdd={addToCart} onWish={onWish} isWished={wishlist.includes(product.id)} categories={categories} />)}</div></div></section>
    <section className="section custom-feature"><div className="container custom-feature-inner"><div className="custom-feature-copy"><p className="eyebrow"><span className="eyebrow-mark">✦</span> The custom corner</p><h2>Have an idea?<br /><em>Let’s make it real.</em></h2><p>Tell us the story, the colours, the tiny detail you can’t stop thinking about. We’ll turn it into something you can hold.</p><Button as={Link} to="/custom-request" icon={<ArrowUpRight size={17} />}>Start a request</Button><div className="custom-feature-foot"><span>01</span><span className="foot-line" /><span>Made for your moment</span></div></div><div className="custom-image-stack"><div className="stack-card stack-back"><img src={media.product3} alt="Pastel handmade art" /></div><div className="stack-card stack-middle"><img src={media.collage} alt="Layered handmade craft details" /></div><div className="stack-card stack-front"><img src={media.product4} alt="Polaroid memory keepsake" /><span className="stack-tag">your story, made tangible</span></div></div></div></section>
    <section className="section section-occasions"><div className="container"><SectionHeading eyebrow="Shop by feeling" title={<>For all the <em>little occasions</em></>} body="A thoughtful something for the birthday, the almost-anniversary, or the random Tuesday that deserves a little sparkle." /><div className="occasion-chips">{occasions.map((occasion, index) => <Link key={occasion} to={`/occasion/${occasion.toLowerCase().replaceAll(' ', '-')}`} className={`occasion-chip ${index === 0 ? 'is-active' : ''}`}>{occasion}<ArrowUpRight size={14} /></Link>)}</div><div className="occasion-rail">{products.slice(4, 8).map((product) => <ProductCard product={product} key={product.id} onAdd={addToCart} onWish={onWish} isWished={wishlist.includes(product.id)} categories={categories} />)}</div></div></section>
    <section className="section how-section"><div className="container"><SectionHeading align="center" eyebrow="The easy, lovely part" title={<>How it <em>works</em></>} body="No mystery, no awkward forms. Just a simple path from your idea to something real." /><div className="how-grid">{howItWorks.map((step, index) => <motion.div className="how-step" key={step.number} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08, ...pageTransition }}><div className="how-number">{step.number}</div><div className="how-icon"><Icon name={step.icon} size={22} /></div><h3>{step.title}</h3><p>{step.text}</p>{index < howItWorks.length - 1 && <ArrowRight className="how-arrow" size={18} />}</motion.div>)}</div></div></section>

    <section className="section home-reviews-section"><div className="container"><SectionHeading eyebrow="A little love from our customers" title={<>Notes from <em>happy hearts</em></>} body="Every review is a little reminder of why we make things by hand." />{homeReviews.length ? <div className="reviews-grid">{homeReviews.map((review) => <article className="review-card" key={review.id}><PinkStars rating={Number(review.rating)} /><p>“{review.comment}”</p><div><strong>{review.customerName || 'Customer'}</strong><span>{review.productName || 'Especially For U'}</span></div></article>)}</div> : <GlassCard className="home-reviews-empty"><PinkStars rating={5} /><p>Customer reviews will appear here after they are approved by the studio.</p></GlassCard>}</div></section>
    <section className="final-cta"><div className="container"><div className="final-cta-card"><div className="sparkle sparkle-1">✦</div><div className="sparkle sparkle-2">✧</div><p className="eyebrow">A soft place for big ideas</p><h2>Have an idea?<br /><em>Let’s make it real.</em></h2><p>Bring the half-formed thought. We’ll bring the handmade magic.</p><Button as={Link} to="/custom-request" variant="light" icon={<ArrowUpRight size={17} />}>Create something custom</Button></div></div></section>
  </main><Footer /><WhatsAppFloat /></GradientBackground>;
}

function ShopPage({ initialCategory = 'all', initialOccasion = 'all', live: providedLive }) {
  const live = providedLive || useLive();
  const { addToCart, onWish, wishlist } = useApp();
  const products = live?.products || [];
  const categories = live?.categories || [];
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

function ProductReviewSection({ product }) {
  const { token, user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    fetch(`/api/reviews?productId=${encodeURIComponent(product.id)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setReviews(data?.reviews || []))
      .catch(() => setReviews([]));
  }, [product.id]);
  const average = reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length : 0;
  const submit = async (event) => {
    event.preventDefault(); setError(''); setMessage(''); setSending(true);
    try {
      const response = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ productId: product.id, rating, comment }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || 'Could not submit your review.');
      setSubmitted(true); setMessage(data.message || 'Thanks! Your review is waiting for studio approval.'); setComment('');
    } catch (submitError) { setError(submitError.message || 'Could not submit your review.'); }
    finally { setSending(false); }
  };
  return <section className="product-reviews" id="product-reviews">
    <div className="review-section-heading"><div><p className="eyebrow">Kind words</p><h2>Reviews for <em>{product.name}</em></h2></div><div className="review-average"><strong>{average ? average.toFixed(1) : '—'}</strong><PinkStars rating={Math.round(average)} /><span>{reviews.length} review{reviews.length === 1 ? '' : 's'}</span></div></div>
    <div className="product-review-layout"><div className="product-review-list">
      {reviews.length ? reviews.map((review) => <article className="product-review-card" key={review.id}><div><PinkStars rating={Number(review.rating)} /><time>{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}</time></div><p>{review.comment}</p><strong>{review.customerName || 'Customer'}</strong></article>) : <p className="review-empty">No approved reviews yet. Your experience could be the first one here.</p>}
    </div><GlassCard className="review-form-card"><p className="eyebrow">Share a little love</p><h3>Leave a review</h3>{!token ? <p className="review-login-note">Please <Link to="/login">sign in</Link> to leave a review.</p> : submitted ? <p className="review-success">{message}</p> : <form onSubmit={submit}><label className="field-label">Your rating</label><PinkStars rating={rating} onChange={setRating} /><label className="field-label" htmlFor={`review-comment-${product.id}`}>Your comment</label><textarea id={`review-comment-${product.id}`} className="review-comment-input" value={comment} onChange={(event) => setComment(event.target.value)} minLength={3} maxLength={1200} required placeholder="What did you think of this piece?" /><small className="review-char-count">{comment.length}/1200</small>{error && <p className="review-error">{error}</p>}<Button type="submit" disabled={sending}>{sending ? 'Sending…' : 'Submit review'}</Button></form>}</GlassCard></div>
  </section>;
}

function ProductPage({ live: providedLive }) {
  const live = providedLive || useLive();
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart, onWish, wishlist } = useApp();
  const products = live?.products || [];
  const categories = live?.categories || [];
  const product = products.find((item) => item.slug === slug) || null;
  const [selected, setSelected] = useState([]);
  const [quantity, setQuantity] = useState(1);
  useEffect(() => { setSelected(product?.options?.map((option) => option.values?.[0]?.name || '') || []); }, [product?.id]);
  const price = product ? Number(product.price) + (product.options || []).reduce((sum, option, index) => sum + (option.values.find((value) => value.name === selected[index])?.adjustment || 0), 0) : 0;
  const handleCta = () => {
    if (product.type === 'CUSTOM_QUOTE') return navigate(`/custom-request?product=${product.slug}`);
    const selectedOptions = (product.options || []).map((option, index) => {
      const value = option.values?.find((item) => item.name === selected[index]);
      return value ? { label: option.label, value: value.name, adjustment: Number(value.adjustment || 0) } : null;
    }).filter(Boolean);
    addToCart({ ...product, productId: product.id, price, selected: selectedOptions.map((option) => option.value), selectedOptions, quantity });
    navigate('/checkout');
  };
  if (!product) return <GradientBackground variant="product"><Navbar cartCount={useApp().cart.length} /><main className="container product-page"><EmptyState title="Product not found" body="This item may have been removed from the shop." onClick={() => navigate('/shop')} /></main><Footer /></GradientBackground>;
  return <GradientBackground variant="product"><Navbar cartCount={useApp().cart.length} /><main className="container product-page"><button className="back-link" onClick={() => navigate(-1)}><ChevronLeft size={16} /> Back to shop</button><div className="product-detail"><div className="product-gallery"><div className="gallery-main"><img src={product.image} alt={product.name} /></div></div><div className="product-info"><div className="product-info-top"><Badge tone={product.premium ? 'signature' : 'soft'}>{product.badge}</Badge><button className={`save-button ${wishlist.includes(product.id) ? 'is-wished' : ''}`} onClick={() => onWish(product)}><Heart size={17} fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} /> Save</button></div><p className="eyebrow">{categories.find((item) => item.id === product.category || item.slug === product.category)?.name} · {product.production}</p><h1>{product.name}</h1><PriceTag product={product} price={price} /><p className="detail-description">{product.description}</p>{product.type === 'CUSTOM_QUOTE' ? <div className="quote-explainer"><div className="quote-icon"><WandSparkles size={18} /></div><div><strong>This one starts with your story.</strong><p>Share the idea, references and your needed-by date. We’ll reply with a clear quote within 1–2 days.</p></div></div> : <div className="customization-form">{(product.options || []).map((option, optionIndex) => <div className="option-group" key={option.label}><div className="option-title"><strong>{option.label}</strong><span>{selected[optionIndex]}</span></div><div className="option-pills">{option.values.map((value) => <button key={value.name} className={selected[optionIndex] === value.name ? 'is-selected' : ''} onClick={() => setSelected((current) => current.map((item, index) => index === optionIndex ? value.name : item))}>{value.name}{value.adjustment > 0 && <small>+{formatINR(value.adjustment)}</small>}</button>)}</div></div>)}<div className="option-group"><div className="option-title"><strong>Quantity</strong><span>Made to order</span></div><div className="quantity-stepper"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={15} /></button><strong>{quantity}</strong><button onClick={() => setQuantity(quantity + 1)}><Plus size={15} /></button></div></div></div>}<div className="delivery-callout"><Truck size={18} /><div><strong>Delivering only in Muradnagar</strong><span>Ready by {String(product.production || 'Ready in 3 days').replace('Ready in ', '').replace('Crafted in ', '')} · campus handover, listed-area delivery or manual location review</span></div></div><Button className="full-button" onClick={handleCta} icon={<ArrowRight size={17} />}>{product.type === 'CUSTOM_QUOTE' ? 'Request a quote' : 'Request this item'}</Button>{product.allowCustomRequest !== false && <Link className="product-custom-cta" to={`/custom-request?product=${product.slug}`}><WandSparkles size={15} /> Request Custom Version</Link>}<div className="trust-row"><span><Check size={14} /> Handmade with care</span><span><Check size={14} /> Manual UPI payment</span><span><Check size={14} /> Muradnagar delivery</span></div></div></div><div className="product-tabs"><button className="is-active">Details</button><button>Materials & size</button><button type="button" onClick={() => document.getElementById("product-reviews")?.scrollIntoView({ behavior: "smooth" })}>Reviews</button></div><div className="product-detail-lower"><div><h3>A little more about this piece</h3><p>Every piece is made in small batches or crafted after you place an order. Colours and tiny details may vary beautifully because your piece is actually made by hand.</p><div className="honesty-notes"><span><ShieldCheck size={15} /> {product.disclaimer || 'Each piece is unique and will vary slightly from the photos.'}</span><span><HeartHandshake size={15} /> {product.careInstructions || 'Keep dry, away from direct sunlight for long hours.'}</span><span><FileText size={15} /> {product.returnable ? 'Ready-made returns follow the store policy.' : 'Custom pieces are non-returnable once production starts.'}</span></div></div><GlassCard><p className="eyebrow">Need it for a date?</p><h3>We’ll help you plan it.</h3><p>Share your needed-by date at checkout and we’ll show you a realistic ready-by window.</p><Link to={`/custom-request?product=${product.slug}`}>Ask about a custom timeline <ArrowUpRight size={15} /></Link></GlassCard></div><ProductReviewSection product={product} /><section className="related-products"><SectionHeading eyebrow="You may also love" title={<>More little <em>feelings</em></>} /><div className="product-grid">{products.filter((item) => item.id !== product.id).slice(0, 4).map((item) => <ProductCard product={item} key={item.id} onAdd={addToCart} onWish={onWish} isWished={wishlist.includes(item.id)} categories={categories} />)}</div></section></main><Footer /><WhatsAppFloat /></GradientBackground>;
}

function CustomRequestPage() {
  const { token, user } = useAuth();
  const [color, setColor] = useState('Blush pink');
  const [files, setFiles] = useState([]);
  const [requestId, setRequestId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', email: user?.email || '', title: '', description: '', neededBy: '', budget: '', size: 'Not sure yet', occasion: 'Just because', pickupLocation: '', extra: '' });
  const live = useLive();
  const products = live?.products || [];
  const currentSettings = live?.settings || storeSettings;
  const linkedProduct = products.find((item) => item.slug === new URLSearchParams(window.location.search).get('product'));
  useEffect(() => { if (linkedProduct) setForm((current) => ({ ...current, title: current.title || `Request: ${linkedProduct.name}` })); }, [linkedProduct?.id]);
  const setField = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const chooseFiles = (event) => {
    const selected = Array.from(event.target.files || []).slice(0, 5);
    const invalid = selected.find((file) => !/^(image|video)\//.test(file.type) || file.size > 8 * 1024 * 1024);
    if (invalid) { setError(`${invalid.name}: choose an image or video up to 8 MB.`); return; }
    setError(''); setFiles(selected);
  };
  const submitRequest = async (event) => {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const referenceFiles = await Promise.all(files.map(async (file) => ({ name: file.name, data: await fileToBase64(file) })));
      const response = await fetch('/api/custom-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productId: linkedProduct?.id || '', title: form.title, description: `${form.description}${form.extra ? `\n\nAdditional details: ${form.extra}` : ''}`,
          customer: { name: form.name, phone: form.phone, email: form.email }, neededBy: form.neededBy, budget: form.budget,
          size: form.size, colours: color, occasion: form.occasion, pickupLocation: form.pickupLocation, referenceFiles,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not send your idea. Please try again.');
      setRequestId(data.request.id);
    } catch (err) { setError(err.message || 'Could not send your idea.'); }
    finally { setLoading(false); }
  };
  if (!currentSettings.acceptingCustomRequests) return <GradientBackground variant="custom"><Navbar cartCount={useApp().cart.length} /><main className="container success-page"><div className="success-orb"><Clock3 size={32} /></div><p className="eyebrow">A short studio pause</p><h1>Custom requests are <em>resting for now.</em></h1><p>{currentSettings.pauseMessage} You can still browse the shop and save a little something for later.</p><Button as={Link} to="/shop" icon={<ArrowRight size={17} />}>Browse the shop</Button></main><Footer /></GradientBackground>;
  if (requestId) return <GradientBackground variant="custom"><Navbar cartCount={useApp().cart.length} /><main className="container success-page"><div className="success-orb"><Check size={32} /></div><p className="eyebrow">It’s on its way to us</p><h1>Your idea is <em>safe with us.</em></h1><p>We’ve received your request and will reply in your request chat. Your contact number is saved with it so we can call if needed.</p><GlassCard className="request-id-card"><span>Your request ID</span><strong>{requestId}</strong><Badge tone="icy">REQUESTED</Badge></GlassCard><div className="hero-actions"><Button as={Link} to={`/account/requests/${requestId}`} icon={<MessageCircle size={17} />}>Open request chat</Button><Button as={Link} to="/shop" variant="secondary">Browse the shop</Button></div></main><Footer /></GradientBackground>;
  return <GradientBackground variant="custom"><Navbar cartCount={useApp().cart.length} /><main className="container custom-page"><section className="page-intro custom-intro"><div><p className="eyebrow"><span className="eyebrow-mark">✦</span> The custom corner</p><h1>Have an idea?<br /><em>Let’s make it real.</em></h1><p>Share your idea and reference files. We’ll review it, ask questions in your request chat and send you a clear quote.</p>{linkedProduct && <GlassCard className="linked-product-note"><Link to={`/product/${linkedProduct.slug}`}><img src={linkedProduct.image} alt="" /></Link><div><span className="eyebrow">Request linked to</span><strong>{linkedProduct.name}</strong><small>Tell us what you would change, add or make more personal.</small></div></GlassCard>}</div><div className="custom-stamp"><WandSparkles size={21} /><span>dream it<br /><strong>we’ll craft it</strong></span></div></section><div className="custom-layout"><GlassCard className="request-form-card"><div className="form-heading"><span className="form-step">01</span><div><p className="eyebrow">Tell us the good stuff</p><h2>Your idea, in its first draft.</h2></div></div><form onSubmit={submitRequest}>
    <div className="form-grid"><label className="floating-field"><input required value={form.name} onChange={setField('name')} placeholder=" " /><span>Your name</span></label><label className="floating-field"><input required type="tel" value={form.phone} onChange={setField('phone')} placeholder=" " /><span>Phone number (we may call)</span></label><label className="floating-field"><input required type="email" value={form.email} onChange={setField('email')} placeholder=" " /><span>Email address</span></label><label className="floating-field"><input required value={form.title} onChange={setField('title')} placeholder=" " /><span>Idea title</span></label></div>
    <label className="floating-field floating-textarea"><textarea required value={form.description} onChange={setField('description')} placeholder=" " rows="4" /><span>Tell us about it — the story, the vibe, the tiny details...</span></label>
    <div className="form-section"><div className="field-title"><strong>Reference images or videos</strong><span>up to 5 files</span></div><label className="file-drop" style={{ cursor: 'pointer' }}><input type="file" accept="image/*,video/*" multiple onChange={chooseFiles} style={{ display: 'none' }} /><UploadCloud size={22} /><strong>Choose your inspiration files</strong><span>Images or short videos · max 8 MB each</span><small>{files.length ? files.map((file) => file.name).join(' · ') : 'Only the studio team will use these to review your request.'}</small></label></div>
    <div className="form-grid"><label className="select-field"><span>Preferred size</span><select value={form.size} onChange={setField('size')}><option>Not sure yet</option><option>Small / desk size</option><option>Medium / shelf size</option><option>Large / statement piece</option></select><ChevronDown size={15} /></label><label className="select-field"><span>Occasion</span><select value={form.occasion} onChange={setField('occasion')}><option>Just because</option><option>Birthday</option><option>Anniversary</option><option>Graduation</option><option>Festive</option></select><ChevronDown size={15} /></label></div>
    <div className="form-section"><div className="field-title"><strong>Preferred colour</strong><span>{color}</span></div><div className="color-swatches">{['Blush pink', 'Lavender', 'Icy blue', 'Surprise me'].map((item, index) => <button type="button" className={color === item ? 'is-selected' : ''} onClick={() => setColor(item)} key={item}><span className={`swatch swatch-${index}`} />{item}</button>)}</div></div>
    <div className="form-grid"><label className="floating-field"><input required value={form.neededBy} onChange={setField('neededBy')} placeholder=" " type="date" /><span>Needed by</span></label><label className="floating-field"><input value={form.budget} onChange={setField('budget')} placeholder=" " /><span>Budget range (₹)</span></label></div><label className="floating-field"><input value={form.pickupLocation} onChange={setField('pickupLocation')} placeholder=" " /><span>Pickup location / area (Muradnagar)</span></label><label className="floating-field"><input value={form.extra} onChange={setField('extra')} placeholder=" " /><span>Anything else?</span></label>
    {error && <div role="alert" style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(197,90,131,.1)', border: '1px solid rgba(197,90,131,.25)', color: '#c55a83', fontSize: 13 }}>{error}</div>}<Button type="submit" disabled={loading} className="full-button" icon={<Send size={16} />}>{loading ? 'Sending your idea…' : 'Send my idea'}</Button><p className="form-footnote">No payment until you approve a quote. We save your phone number with the request so we can contact you about it.</p>
    </form></GlassCard><aside className="custom-aside"><div className="aside-image"><img src={media.collage} alt="Layered handmade craft references" /></div><GlassCard className="next-steps"><p className="eyebrow">What happens next</p><h3>A little magic, in five steps.</h3>{['Request received', 'We review your idea', 'A clear quote arrives in chat', 'You say yes', 'We start crafting'].map((item, index) => <div className="next-step" key={item}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item}</strong>{index < 4 && <div className="next-line" />}</div>)}</GlassCard></aside></div></main><Footer /><WhatsAppFloat /></GradientBackground>;
}

function CartPage() {
  const { cart, updateQuantity, removeFromCart } = useApp();
  const subtotal = cart.reduce((sum, item) => sum + (item.price || item.product?.price || 0) * item.quantity, 0);
  return <GradientBackground variant="cart"><Navbar cartCount={cart.length} /><main className="container cart-page"><section className="page-intro compact-intro"><div><p className="eyebrow"><span className="eyebrow-mark">✦</span> Your little collection</p><h1>Cart, but make it <em>soft.</em></h1><p>Everything here is made to order with a little extra care.</p></div></section>{cart.length === 0 ? <EmptyState title="Your cart is still dreamy and empty" body="Start with a ready-made favourite, or tell us about something custom." onClick={() => window.location.assign('/shop')} /> : <div className="cart-layout"><div className="cart-items">{cart.map((item) => <GlassCard className="cart-item" key={item.key}><img src={item.image} alt={item.name} /><div className="cart-item-copy"><div className="item-kicker">{item.type === 'CUSTOM_FIXED' ? 'Customised for you' : 'Ready-made favourite'}</div><h3>{item.name}</h3><div className="item-chips">{(item.selected || []).map((option) => <span key={option}>{option}</span>)}</div><button className="remove-button" onClick={() => removeFromCart(item.key)}>Remove</button></div><div className="cart-item-end"><strong>{formatINR((item.price || item.product?.price || 0) * item.quantity)}</strong><div className="quantity-stepper"><button onClick={() => updateQuantity(item.key, Math.max(1, item.quantity - 1))}><Minus size={14} /></button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.key, item.quantity + 1)}><Plus size={14} /></button></div></div></GlassCard>)}</div><GlassCard className="summary-card"><p className="eyebrow">Your order summary</p><h2>A little joy, coming up.</h2><div className="coupon-field"><input placeholder="Have a coupon?" /><button>Apply</button></div><div className="summary-lines"><div><span>Subtotal</span><strong>{formatINR(subtotal)}</strong></div><div><span>Muradnagar delivery</span><strong>{subtotal > 1000 ? 'Free' : formatINR(50)}</strong></div><div className="summary-total"><span>Total</span><strong>{formatINR(subtotal + (subtotal > 1000 ? 0 : 50))}</strong></div></div><p className="summary-note"><Truck size={15} /> We currently deliver only in Muradnagar. More areas coming soon!</p><Button as={Link} to="/checkout" className="full-button" icon={<ArrowRight size={16} />}>Continue to checkout</Button><div className="summary-trust"><Check size={14} /> Manual UPI payment</div></GlassCard></div>}</main><Footer /><WhatsAppFloat /></GradientBackground>;
}

function CheckoutPage() {
  const { cart, emptyCart } = useApp();
  const { token, user } = useAuth();
  const [step, setStep] = useState(1);
  const [success, setSuccess] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentReported, setPaymentReported] = useState(false);
  const [paymentReportError, setPaymentReportError] = useState('');
  const [reportingPayment, setReportingPayment] = useState(false);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const [contact, setContact] = useState({
    name: user?.name || '', email: user?.email || '', phone: user?.phone || '', note: '',
    isGift: false, recipientName: '', recipientPhone: '', giftMessage: '', hideSender: false, giftWrap: false,
  });
  const [delivery, setDelivery] = useState({
    method: 'campus', pickupLocation: '', location: '', pickupDate: todayStr, slotId: '',
  });
  const live = useLive();
  const currentSettings = live?.settings || storeSettings;
  const areaForMethod = delivery.method === 'campus' ? 'Campus handover, Muradnagar' : 'Home delivery, Muradnagar';
  const cartSubtotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  const checkoutTotal = cartSubtotal + (delivery.method === 'home' && cartSubtotal < 1000 ? 50 : 0) + (contact.giftWrap ? Number(currentSettings.giftWrapPrice || 79) : 0);
  const handlePlaceOrder = async () => {
    setSubmitting(true); setSubmitError('');
    try {
      const items = cart.map((item) => ({
        productId: item.productId || item.id || '',
        quantity: Number(item.quantity || 1),
        selected: Array.isArray(item.selectedOptions) ? item.selectedOptions : (Array.isArray(item.selected) ? item.selected.map((label) => ({ label: String(label), value: String(label), adjustment: 0 })) : []),
        customization: item.customization || {},
      }));
      const body = {
        customer: {
          name: contact.name.trim(),
          email: contact.email.trim(),
          phone: contact.phone.trim(),
          note: contact.note?.trim() || '',
        },
        items,
        delivery: {
          area: areaForMethod, method: delivery.method === 'home' ? 'home' : 'campus',
          handoverSpot: delivery.pickupLocation.trim() || (delivery.method === 'campus' ? 'Main Gate' : 'Front Gate'),
          slotId: delivery.slotId?.trim() || '',
          locationText: delivery.location.trim() || (delivery.method === 'campus' ? 'KIET, Muradnagar' : 'Muradnagar address'),
          pickupDate: delivery.pickupDate || todayStr,
        },
        gift: {
          isGift: !!contact.isGift, recipientName: contact.recipientName?.trim() || '',
          recipientPhone: contact.recipientPhone?.trim() || '', message: contact.giftMessage?.trim() || '',
          hideSender: !!contact.hideSender, giftWrap: !!contact.giftWrap,
        },
      };
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error?.message || (Array.isArray(data.error) && data.error[0]?.message) || `Failed to place order (${res.status}).`);
      setCreatedOrder(data.order);
      if (emptyCart) emptyCart();
      setSuccess(true);
    } catch (err) { setSubmitError(err.message || 'Something went wrong. Please try again.'); }
    finally { setSubmitting(false); }
  };
  const reportAdvance = async () => {
    if (!createdOrder?.id) return;
    setReportingPayment(true); setPaymentReportError('');
    try {
      const amount = Number(createdOrder.pricing?.advanceDue || createdOrder.advance_due || Math.ceil(Number(createdOrder.pricing?.total || createdOrder.total || 0) / 2));
      const response = await fetch(`/api/orders/${createdOrder.id}/payment-report`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ amount, reference: paymentReference }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not report your payment.');
      setPaymentReported(true);
    } catch (err) { setPaymentReportError(err.message || 'Could not report your payment.'); }
    finally { setReportingPayment(false); }
  };
  if (currentSettings.storeStatus !== 'OPEN') return <GradientBackground variant="cart"><Navbar cartCount={cart.length} /><main className="container success-page"><div className="success-orb"><Clock3 size={32} /></div><p className="eyebrow">Checkout is taking a little pause</p><h1>We’re <em>fully booked</em> for now.</h1><p>{currentSettings.pauseMessage} Your cart is safe, and you can come back when the next slots open.</p><Button as={Link} to="/shop" icon={<ArrowRight size={17} />}>Keep browsing</Button></main><Footer /></GradientBackground>;
  if (success) {
    const advanceAmount = Number(createdOrder?.pricing?.advanceDue || createdOrder?.advance_due || Math.ceil(Number(createdOrder?.pricing?.total || createdOrder?.total || 0) / 2));
    return <GradientBackground variant="cart"><Navbar cartCount={cart.length} /><main className="container checkout-success"><div className="success-orb"><Check size={32} /></div><p className="eyebrow">Your request is in good hands</p><h1>Thank you, <em>{contact.name || 'lovely human'}.</em></h1><p>Order <strong>{createdOrder?.id}</strong> is saved. Pay the 50% advance, then chat with the studio about any details.</p><GlassCard style={{ maxWidth: 560, margin: '22px auto', padding: 22, textAlign: 'left' }}><p className="eyebrow">UPI advance · {formatINR(advanceAmount)}</p>{currentSettings.upiQrImage ? <img src={currentSettings.upiQrImage} alt="Studio UPI QR code" style={{ display: 'block', width: 210, height: 210, objectFit: 'contain', background: '#fff', borderRadius: 14, padding: 8, margin: '0 auto 14px', border: '1px solid var(--line)' }} /> : <div style={{ padding: 18, borderRadius: 12, background: 'rgba(90,63,86,.05)', color: 'var(--muted)', textAlign: 'center' }}>The studio is setting up its QR code. Contact us in your order chat for payment details.</div>}{currentSettings.upiId && <p style={{ textAlign: 'center' }}>UPI ID: <strong>{currentSettings.upiId}</strong></p>}<p style={{ color: 'var(--muted)', fontSize: 13 }}>{currentSettings.paymentInstructions || 'Pay by UPI. The studio will confirm after checking the account.'}</p>{paymentReported ? <><Badge tone="icy">Payment reported · awaiting studio verification</Badge><Button as={Link} to={`/account/orders/${createdOrder?.id}/chat`} icon={<MessageCircle size={16} />} className="full-button" style={{ marginTop: 12 }}>Chat with the studio</Button></> : <><label className="floating-field" style={{ marginTop: 12 }}><input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder=" " /><span>UPI transaction reference (optional)</span></label><Button onClick={reportAdvance} disabled={reportingPayment} className="full-button" style={{ marginTop: 10 }}>{reportingPayment ? 'Sending…' : `I’ve sent ${formatINR(advanceAmount)}`}</Button></>}{paymentReportError && <p role="alert" style={{ color: '#c55a83' }}>{paymentReportError}</p>}</GlassCard><GlassCard className="order-success-card"><div><span>Ready by</span><strong>{createdOrder?.estimatedDate || createdOrder?.estimated_date ? new Date(createdOrder.estimatedDate || createdOrder.estimated_date).toLocaleDateString() : (delivery.pickupDate ? new Date(delivery.pickupDate).toLocaleDateString() : 'Set by studio soon')}</strong></div><div><span>Delivery</span><strong>{delivery.method === 'campus' ? 'Campus handover' : 'Home delivery'}</strong></div><div><span>Payment status</span><strong>{paymentReported ? 'Awaiting verification' : 'Advance due'}</strong></div></GlassCard>{paymentReported && <Button as={Link} to={`/account/orders/${createdOrder?.id}/chat`} icon={<MessageCircle size={17} />}>Open order chat</Button>}</main><Footer /></GradientBackground>;
  }
  if (!cart.length) return <GradientBackground variant="cart"><Navbar cartCount={0} /><main className="container checkout-page"><EmptyState title="Your cart is empty" body="Choose a product first, then we’ll collect your delivery details and payment." onClick={() => window.location.assign('/shop')} /></main><Footer /></GradientBackground>;
  const steps = ['Contact', 'Delivery', 'Payment', 'Review & pay'];
  return <GradientBackground variant="cart"><Navbar cartCount={cart.length} /><main className="container checkout-page"><div className="checkout-header"><div><p className="eyebrow"><span className="eyebrow-mark">✦</span> Almost yours</p><h1>Let’s make it <em>official.</em></h1></div><div className="checkout-secure"><Check size={14} /> Secure checkout</div></div><div className="checkout-stepper">{steps.map((item, index) => <div className={`checkout-step ${step >= index + 1 ? 'is-active' : ''}`} key={item}><span>{step > index + 1 ? <Check size={13} /> : index + 1}</span><strong>{item}</strong>{index < steps.length - 1 && <i />}</div>)}</div><div className="checkout-layout"><GlassCard className="checkout-card">{step === 1 && <CheckoutContact contact={contact} setContact={setContact} />}{step === 2 && <CheckoutDelivery delivery={delivery} setDelivery={setDelivery} />}{step === 3 && <CheckoutPayment total={checkoutTotal} />}{step === 4 && <CheckoutReview contact={contact} delivery={delivery} />}</GlassCard><GlassCard className="checkout-summary"><p className="eyebrow">Your pieces</p>{cart.map((item) => <div className="checkout-item" key={item.key}><img src={item.image} alt="" /><div><strong>{item.name}</strong><span>Qty {item.quantity}</span></div><b>{formatINR(item.price * item.quantity)}</b></div>)}<div className="summary-total"><span>Total</span><strong>{formatINR(checkoutTotal)}</strong></div><p className="summary-note"><Truck size={15} /> Muradnagar only · campus or home delivery</p></GlassCard></div><div className="checkout-actions">{step > 1 && <Button variant="ghost" onClick={() => setStep(step - 1)}><ChevronLeft size={16} /> Back</Button>}{submitError && <span style={{ color: '#c55a83', fontSize: 13, alignSelf: 'center' }}>{submitError}</span>}<Button onClick={() => step === 4 ? handlePlaceOrder() : setStep(step + 1)} icon={<ArrowRight size={16} />} disabled={submitting}>{submitting ? 'Placing order…' : (step === 4 ? 'Place order & continue to payment' : 'Continue')}</Button></div></main></GradientBackground>;
}

function CheckoutContact({ contact, setContact }) {
  const { user } = useAuth();
  const setField = (k, v) => setContact({ ...contact, [k]: v });
  return <div className="checkout-section"><p className="form-step">01 / 04</p><h2>Where should we send the little update?</h2><p className="checkout-subtitle">We’ll use this to share your order confirmation and delivery note.</p><div className="form-grid"><label className="floating-field"><input required placeholder=" " value={contact.name || user?.name || ''} onChange={(e) => setField('name', e.target.value)} /><span>Full name</span></label><label className="floating-field"><input required placeholder=" " value={contact.phone || user?.phone || ''} onChange={(e) => setField('phone', e.target.value)} /><span>Phone number · 10-digit Indian mobile</span></label></div><label className="floating-field"><input required placeholder=" " value={contact.email || user?.email || ''} onChange={(e) => setField('email', e.target.value)} /><span>Email address</span></label><label className="floating-field floating-textarea"><textarea placeholder=" " rows="3" value={contact.note || ''} onChange={(e) => setField('note', e.target.value)} /><span>Any note for us?</span></label><label className="gift-toggle"><input type="checkbox" checked={!!contact.isGift} onChange={(event) => setField('isGift', event.target.checked)} /><span className="checkbox">{contact.isGift && <Check size={12} />}</span><span><strong>It’s a gift</strong><small>Add a message for the recipient and keep the sender name hidden.</small></span></label>{contact.isGift && <div className="gift-fields"><div className="form-grid"><label className="floating-field"><input required placeholder=" " /><span>Recipient name</span></label><label className="floating-field"><input required placeholder=" " type="tel" /><span>Recipient phone</span></label></div><label className="floating-field floating-textarea"><textarea maxLength="300" placeholder=" " rows="3" /><span>Gift message · max 300 characters</span></label><label className="gift-option"><input type="checkbox" /><span className="checkbox" /><span>Hide my name from the recipient</span></label><label className="gift-option"><input type="checkbox" /><span className="checkbox" /><span>Add gift wrap · {formatINR(storeSettings.giftWrapPrice)}</span></label></div>}<div className="consent-row"><span className="checkbox is-checked"><Check size={12} /></span><span>I agree to the <Link to="/pages/terms-and-conditions">Terms</Link> and <Link to="/pages/privacy-policy">Privacy Policy</Link>.</span></div></div>;
}

function CheckoutDelivery({ delivery, setDelivery }) {
  const setField = (k, v) => setDelivery({ ...delivery, [k]: v });
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  return <div className="checkout-section"><p className="form-step">02 / 04</p><h2>How should your order find you?</h2><p className="checkout-subtitle">We currently deliver only in Muradnagar. More areas coming soon!</p>
<div className="delivery-methods"><button type="button" className={`delivery-method ${delivery.method === 'campus' ? 'is-selected' : ''}`} onClick={() => setField('method', 'campus')}><Package size={19} /><span><strong>Campus handover</strong><small>KIET / Muradnagar campus spot · Free</small></span>{delivery.method === 'campus' && <Check size={16} />}</button><button type="button" className={`delivery-method ${delivery.method === 'home' ? 'is-selected' : ''}`} onClick={() => setField('method', 'home')}><Truck size={19} /><span><strong>Home delivery</strong><small>Local Muradnagar address · ₹50 or free above ₹1,000</small></span>{delivery.method === 'home' && <Check size={16} />}</button></div>
<div className="form-grid"><label className="floating-field"><input required placeholder=" " value={delivery.pickupLocation} onChange={(e) => setField('pickupLocation', e.target.value.trim())} /><span>{delivery.method === 'campus' ? 'Pickup Location (campus gate / spot / landmark)' : 'Pickup Location (building / gate)'}</span></label><label className="floating-field"><input required placeholder=" " value={delivery.location} onChange={(e) => setField('location', e.target.value.trim())} /><span>{delivery.method === 'campus' ? 'Location (KIET, Muradnagar)' : 'Location (full address / area)'}</span></label></div>
<div className="form-grid"><label className="floating-field"><input required type="date" min={todayStr} placeholder=" " value={delivery.pickupDate} onChange={(e) => setField('pickupDate', e.target.value)} /><span>Pickup Date</span></label><label className="floating-field"><input required placeholder=" " value={delivery.slotId || ''} onChange={(e) => setField('slotId', e.target.value.trim())} /><span>Delivery slot / contact phone</span></label></div>
<div className="ready-by"><Clock3 size={17} /><span>The studio will confirm your ready date and status in your account after reviewing the order.</span></div></div>;
}

function CheckoutPayment({ total }) {
  const live = useLive();
  const settings = live?.settings || storeSettings;
  const advance = Math.ceil(total * 0.5);
  return <div className="checkout-section"><p className="form-step">03 / 04</p><h2>Pay a 50% advance.</h2><p className="checkout-subtitle">Place your order, then use the studio’s UPI QR code. We’ll begin once we verify the payment.</p><div className="payment-policy-note"><ShieldCheck size={17} /><span>{formatINR(total)} order · {formatINR(advance)} advance now · {formatINR(total - advance)} balance at handover</span></div><div className="payment-options"><div className="payment-option is-selected"><div className="payment-icon"><Tag size={19} /></div><div><strong>UPI QR · studio verified</strong><span>{settings.upiId ? `Pay to ${settings.upiId}` : 'QR and payment instructions appear after you place the order.'}</span></div><Check size={16} /></div></div><div className="payment-policy-note" style={{ marginTop: 12 }}>{settings.paymentInstructions || 'The studio will confirm when your advance arrives.'}</div></div>;
}

function CheckoutReview({ contact, delivery }) {
  return <div className="checkout-section"><p className="form-step">04 / 04</p><h2>One last little look.</h2><p className="checkout-subtitle">Make sure everything feels right before you pay.</p><div className="review-summary"><div><span>Contact</span><strong>{contact?.name || 'Customer'} · {contact?.phone || 'Phone'}</strong><button type="button">Edit</button></div><div><span>Delivery</span><strong>{(delivery?.pickupLocation || 'Pickup spot')} · {(delivery?.location || (delivery?.method === 'campus' ? 'KIET, Muradnagar' : 'Muradnagar address'))}</strong><button type="button">Edit</button></div><div><span>Pickup Date</span><strong>{delivery?.pickupDate ? new Date(delivery.pickupDate).toLocaleDateString() : '—'}</strong><button type="button">Edit</button></div><div><span>Gift</span><strong>{contact?.isGift ? `Gift: ${contact.recipientName || 'recipient'}${contact.giftWrap ? ' · Gift wrap' : ''}` : 'Not a gift · surprise delivery off'}</strong><button type="button">Edit</button></div></div><div className="agree-row"><span className="checkbox is-checked"><Check size={12} /></span><span>I understand handmade pieces may have tiny, lovely variations and custom pieces become non-returnable once production starts.</span></div></div>;
}

function CustomerOrders({ token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Could not load your orders.');
        setOrders(data.orders || []);
      })
      .catch((err) => setError(err.message || 'Could not load your orders.'))
      .finally(() => setLoading(false));
  }, [token]);
  return <div className="account-orders"><div className="content-heading"><div><p className="eyebrow">Your orders</p><h2>Order updates</h2></div></div>
    {error && <div role="alert">{error}</div>}
    {loading ? <p>Loading your orders…</p> : orders.length ? <div className="account-order-list">{orders.map((order) => <GlassCard className="account-order-card" key={order.id}>
      <div className="order-card-top"><div><Badge tone={order.status === 'DELIVERED' ? 'icy' : 'blush'}>{String(order.status || 'PENDING').replaceAll('_', ' ')}</Badge><span className="order-number">{order.id}</span></div><strong>{formatINR(Number(order.total || 0))}</strong></div>
      <div className="account-order-details"><span><MapPin size={14} /> {order.deliveryArea || 'Delivery details in order'}</span><span>Placed {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'recently'}</span><span>Ready by {order.estimatedDate ? new Date(order.estimatedDate).toLocaleDateString() : 'To be confirmed'}</span></div>
      <div className="account-order-payment"><strong>{order.paymentStatus || 'PENDING'}</strong><span>Paid {formatINR(Number(order.paidAmount || 0))} · Due {formatINR(Number(order.balanceDue ?? Math.max(0, Number(order.total || 0) - Number(order.paidAmount || 0))))}</span></div>
      <Link className="account-order-chat-link" to={`/account/orders/${encodeURIComponent(order.id)}/chat`}><MessageCircle size={15} /> Message the studio <ArrowRight size={14} /></Link>
    </GlassCard>)}</div> : <EmptyState title="No orders yet" body="Orders you place will appear here with their payment and delivery status." />}
  </div>;
}

function CustomerMessages({ token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setOrders(data?.orders || []))
      .catch(() => setOrders([])).finally(() => setLoading(false));
  }, [token]);
  return <div className="account-orders"><div className="content-heading"><div><p className="eyebrow">Private order chats</p><h2>Messages with the studio</h2></div></div>{loading ? <p>Loading your chats…</p> : orders.length ? <div className="account-order-list">{orders.map((order) => <GlassCard className="account-message-row" key={order.id}><div><MessageCircle size={18} /><div><strong>Order {order.id}</strong><span>{String(order.status || 'PENDING').replaceAll('_', ' ')} · {order.paymentStatus || 'PAYMENT PENDING'}</span></div></div><Link to={`/account/orders/${encodeURIComponent(order.id)}/chat`}>Open chat <ArrowRight size={14} /></Link></GlassCard>)}</div> : <EmptyState title="No chats yet" body="After you place an order, you can message the studio about colours, additions, or delivery." />}</div>;
}

function OrderChatPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [order, setOrder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [orderResponse, chatResponse] = await Promise.all([fetch(`/api/orders/${encodeURIComponent(id)}`, { headers }), fetch(`/api/conversations/order/${encodeURIComponent(id)}`, { headers })]);
      const orderData = await orderResponse.json().catch(() => ({}));
      const chatData = await chatResponse.json().catch(() => ({}));
      if (!orderResponse.ok) throw new Error(orderData.message || 'Could not load this order.');
      if (!chatResponse.ok) throw new Error(chatData.message || chatData.error || 'Could not load this chat.');
      setOrder(orderData.order); setMessages(chatData.messages || []); setError('');
    } catch (loadError) { setError(loadError.message || 'Could not load this order chat.'); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/conversations/order/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json().catch(() => ({}));
        if (response.ok) setMessages(data.messages || []);
      } catch { /* keep the last messages visible */ }
    }, 10000);
    return () => clearInterval(timer);
  }, [id, token]);
  const send = async (event) => {
    event.preventDefault(); const message = text.trim(); if (!message) return;
    try {
      const response = await fetch(`/api/conversations/order/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ message }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || 'Message could not be sent.');
      setText(''); setMessages((current) => [...current, data.message]); setError('');
    } catch (sendError) { setError(sendError.message || 'Message could not be sent.'); }
  };
  const total = Number(order?.total ?? order?.pricing?.total ?? 0);
  const paid = Number(order?.paidAmount ?? order?.paid_amount ?? 0);
  const status = order?.paymentStatus || order?.payment_status || 'PENDING';
  return <GradientBackground variant="account"><Navbar cartCount={useApp().cart.length} /><main className="container order-chat-page"><Link className="back-link" to="/account"><ChevronLeft size={15} /> Back to your account</Link>{loading ? <GlassCard className="order-chat-panel"><p>Opening your order chat…</p></GlassCard> : error ? <GlassCard className="order-chat-panel"><p className="review-error">{error}</p><Link to="/account">Return to your account</Link></GlassCard> : order && <GlassCard className="order-chat-panel"><header className="order-chat-header"><div><p className="eyebrow">Private order chat</p><h1>Order <em>{id}</em></h1><p>{order.items?.map((item) => item.productName).join(', ') || 'Your handmade order'}</p></div><div className="order-chat-status"><Badge tone={order.status === 'DELIVERED' ? 'icy' : 'blush'}>{String(order.status || 'PENDING').replaceAll('_', ' ')}</Badge><span>{status.replaceAll('_', ' ')}</span><small>Paid {formatINR(paid)} · Due {formatINR(Math.max(0, total - paid))}</small></div></header><div className="order-chat-note"><strong>Need a colour change or a small addition?</strong><span>Send it here and the studio will reply in this order chat.</span></div><div className="order-chat-messages">{messages.length ? messages.map((message) => <article key={message.id} className={`order-chat-message ${message.senderRole === 'CUSTOMER' ? 'from-customer' : 'from-studio'}`}><small>{message.senderRole === 'CUSTOMER' ? 'You' : 'Studio'} · {message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}</small><p>{message.message}</p></article>) : <p className="order-chat-empty">Your chat is ready. Send the studio your preferences or questions about this order.</p>}</div><form className="order-chat-form" onSubmit={send}><textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={3000} rows={2} placeholder="Message the studio about this order…" required /><Button type="submit" disabled={!text.trim()} icon={<Send size={15} />}>Send</Button></form>{error && <p className="review-error" role="alert">{error}</p>}</GlassCard>}</main><Footer /><WhatsAppFloat /></GradientBackground>;
}

function AccountPage() {
  const [tab, setTab] = useState('Orders');
  const [requestList, setRequestList] = useState([]);
  const tabs = ['Orders', 'Messages', 'Custom Requests', 'Wishlist', 'Addresses', 'Profile'];
  const { wishlist, addToCart, onWish } = useApp();
  const live = useLive();
  const products = live?.products || [];
  const { user, token } = useAuth();
  useEffect(() => {
    fetch('/api/custom-requests/mine', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null).then((data) => setRequestList(data?.requests || [])).catch(() => {});
  }, [token]);
  const displayName = user?.name || 'Lovely human';
  return <GradientBackground variant="account"><Navbar cartCount={useApp().cart.length} /><main className="container account-page"><section className="account-hero"><div className="account-avatar">{displayName[0]}</div><div><p className="eyebrow">Your little corner</p><h1>Hello, <em>{displayName}.</em></h1><p>Keep an eye on your orders, requests and saved little somethings.</p></div><Button as={Link} to="/shop" variant="secondary" icon={<ArrowRight size={16} />}>Keep browsing</Button></section><div className="account-tabs">{tabs.map((item) => <button className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)} key={item}>{item}{item === 'Wishlist' && wishlist.length > 0 && <span>{wishlist.length}</span>}</button>)}</div><div className="account-content">{tab === 'Orders' && <CustomerOrders token={token} />}{tab === 'Messages' && <CustomerMessages token={token} />}{tab === 'Custom Requests' && <div className="account-orders"><div className="content-heading"><div><p className="eyebrow">Your ideas, in progress</p><h2>Custom requests</h2></div><Button as={Link} to="/custom-request" variant="secondary" icon={<Plus size={16} />}>New request</Button></div>{requestList.length ? requestList.map((request) => <GlassCard className="request-row" key={request.id}><div><Badge tone={request.status === 'QUOTE_SENT' ? 'blush' : 'icy'}>{request.status}</Badge><h3>{request.title}</h3><p>{request.id} · Needed by {request.neededBy || 'Not set'} · Phone {request.phone || user?.phone || '—'}</p>{request.quote?.amount && <strong>Quote: {formatINR(Number(request.quote.amount))}</strong>}<Link to={`/account/requests/${request.id}`} style={{ display: 'inline-flex', gap: 6, marginTop: 8 }}>Open request chat <ArrowRight size={14} /></Link></div></GlassCard>) : <EmptyState title="No custom requests yet" body="Send an idea and we’ll keep the conversation here." />}</div>}{tab === 'Wishlist' && <div className="account-orders"><div className="content-heading"><div><p className="eyebrow">Saved for later</p><h2>Your wishlist</h2></div></div>{products.some((product) => wishlist.includes(product.id)) ? <div className="product-grid">{products.filter((product) => wishlist.includes(product.id)).map((product) => <ProductCard product={product} key={product.id} onAdd={addToCart} onWish={onWish} isWished />)}</div> : <EmptyState title="Your wishlist is empty" body="Save products you like and they’ll appear here." />}</div>}{(tab === 'Addresses' || tab === 'Profile') && <GlassCard className="settings-card"><p className="eyebrow">{tab === 'Addresses' ? 'Delivery details' : 'Your details'}</p><h2>{tab === 'Addresses' ? 'Where should the magic arrive?' : 'A little about you.'}</h2><div className="form-grid"><label className="floating-field"><input defaultValue={user?.name || ''} placeholder=" " /><span>{tab === 'Addresses' ? 'Recipient name' : 'Full name'}</span></label><label className="floating-field"><input defaultValue={user?.phone || ''} placeholder=" " /><span>{tab === 'Addresses' ? 'Phone' : 'Phone number'}</span></label></div><label className="floating-field"><input defaultValue={tab === 'Addresses' ? '' : (user?.email || '')} placeholder=" " /><span>{tab === 'Addresses' ? 'Address / landmark' : 'Email address'}</span></label><Button>Save changes</Button></GlassCard>}</div></main><Footer /><WhatsAppFloat /></GradientBackground>;
}

function RequestConversationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [request, setRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [acceptedOrder, setAcceptedOrder] = useState(null);
  const load = async () => {
    setLoading(true); setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [requestResponse, messagesResponse] = await Promise.all([
        fetch(`/api/custom-requests/${id}`, { headers }), fetch(`/api/conversations/request/${id}`, { headers }),
      ]);
      const requestData = await requestResponse.json().catch(() => ({}));
      const messageData = await messagesResponse.json().catch(() => ({}));
      if (!requestResponse.ok) throw new Error(requestData.message || 'Could not load this request.');
      if (!messagesResponse.ok) throw new Error(messageData.message || 'Could not load this conversation.');
      setRequest(requestData.request); setMessages(messageData.messages || []);
    } catch (err) { setError(err.message || 'Could not load request.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id, token]);
  const send = async (event) => {
    event.preventDefault();
    const message = text.trim();
    if (!message) return;
    try {
      const response = await fetch(`/api/conversations/request/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ message }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Message could not be sent.');
      setText(''); setMessages((items) => [...items, data.message]); setError('');
    } catch (err) { setError(err.message || 'Message could not be sent.'); }
  };
  const acceptQuote = async () => {
    try {
      const response = await fetch(`/api/custom-requests/${id}/accept-quote`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not accept quote.');
      setAcceptedOrder(data.order); setError('');
      navigate(`/account/orders/${encodeURIComponent(data.order.id)}/chat`);
    } catch (err) { setError(err.message || 'Could not accept quote.'); }
  };
  return <GradientBackground variant="track"><Navbar cartCount={useApp().cart.length} /><main className="container track-page"><section className="track-card" style={{ maxWidth: 760, textAlign: 'left' }}><p className="eyebrow">Your custom idea</p><h1 style={{ fontSize: 48 }}>{request?.title || 'Request chat'}</h1><p>{id} · {request?.status || 'Loading'}</p>
    {request?.referenceUrls?.length > 0 && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '18px 0' }}>{request.referenceUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" style={{ color: '#995f83', fontSize: 13 }}>Open reference {index + 1} ↗</a>)}</div>}
    {request?.quote && <GlassCard style={{ padding: 16, marginBottom: 16 }}><strong>Studio quote</strong><p style={{ margin: '6px 0 0' }}>{formatINR(Number(request.quote.amount || request.quote.total || 0))} · {request.quote.note || request.quote.message || 'Reply here if you have questions.'}</p>{request.status === 'QUOTE_SENT' && <Button onClick={acceptQuote} style={{ marginTop: 12 }}>Accept quote · pay 50% advance</Button>}{acceptedOrder && <p>Order {acceptedOrder.id} created. <Link to={`/account/orders/${encodeURIComponent(acceptedOrder.id)}/chat`}>Open order chat</Link></p>}</GlassCard>}
    {loading ? <p>Loading your conversation…</p> : <div style={{ display: 'grid', gap: 10, padding: 14, maxHeight: 420, overflowY: 'auto', borderRadius: 16, background: 'rgba(255,255,255,.62)' }}>{messages.length ? messages.map((message) => <div key={message.id} style={{ justifySelf: message.senderRole === 'CUSTOMER' ? 'end' : 'start', maxWidth: '88%', padding: '12px 14px', borderRadius: 14, background: message.senderRole === 'CUSTOMER' ? 'rgba(255,175,204,.22)' : 'rgba(62,142,126,.1)' }}><small>{message.senderRole === 'CUSTOMER' ? 'You' : 'Studio'} · {new Date(message.createdAt).toLocaleString()}</small><p style={{ margin: '5px 0 0', whiteSpace: 'pre-wrap' }}>{message.message}</p></div>) : <p style={{ margin: 0, color: 'var(--muted)' }}>Your idea is in the studio inbox. Send a message here any time.</p>}</div>}
    {error && <div role="alert" style={{ marginTop: 12, color: '#c55a83' }}>{error}</div>}
    <form onSubmit={send} style={{ display: 'grid', gap: 10, marginTop: 16 }}><label className="floating-field floating-textarea"><textarea rows={3} value={text} onChange={(event) => setText(event.target.value)} placeholder=" " /><span>Write a message to the studio…</span></label><Button type="submit" className="full-button" icon={<Send size={15} />}>Send message</Button></form>
  </section></main><Footer /></GradientBackground>;
}

function TrackOrderPage() {
  const { token, user } = useAuth();
  const [orderId, setOrderId] = useState('');
  const [tracked, setTracked] = useState(null);
  const [error, setError] = useState('');
  const [queryText, setQueryText] = useState('');
  const [messages, setMessages] = useState([]);
  const [queryMsg, setQueryMsg] = useState({ type: '', text: '' });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const live = useLive();
  const products = live?.products || [];

  const fetchMessages = async (id) => {
    try {
      const res = await fetch(`/api/conversations/order/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {}
  };

  const handleTrack = async (e) => {
    e.preventDefault();
    setError(''); setTracked(null); setMessages([]); setQueryMsg({ type: '', text: '' });
    if (!orderId.trim()) return setError('Please enter your order number.');
    try {
      const res = await fetch(`/api/orders/${orderId.trim()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Order not found.');
      }
      const data = await res.json();
      setTracked(data.order);
      setPaymentAmount(String(data.order.balanceDue || data.order.balance_due || data.order.advanceDue || data.order.advance_due || Math.ceil(Number(data.order.total || 0) / 2)));
      fetchMessages(orderId.trim());
    } catch (err) { setError(err.message || 'Could not find that order.'); }
  };

  const handleQuery = async (e) => {
    e.preventDefault();
    setQueryMsg({ type: '', text: '' });
    if (!queryText.trim()) return setQueryMsg({ type: 'error', text: 'Please type your question first.' });
    try {
      const res = await fetch(`/api/conversations/order/${tracked.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: queryText.trim() }),
      });
      const responseData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(responseData.message || 'Failed to send message.');
      setQueryText('');
      setQueryMsg({ type: 'success', text: 'Your message has been sent.' });
      await fetchMessages(tracked.id);
    } catch (err) { setQueryMsg({ type: 'error', text: err.message || 'Could not send message.' }); }
  };

  const handlePaymentReport = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/orders/${tracked.id}/payment-report`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ amount: Number(paymentAmount), reference: paymentReference }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not report payment.');
      setTracked(data.order); setQueryMsg({ type: 'success', text: 'Payment reported. The studio will verify it before changing your paid balance.' });
    } catch (err) { setQueryMsg({ type: 'error', text: err.message || 'Could not report payment.' }); }
  };

  const est = tracked?.estimatedDate || tracked?.estimated_date;

  return <GradientBackground variant="track"><Navbar cartCount={useApp().cart.length} wishlistCount={[]} settings={live?.settings} /><main className="container track-page">
    <section className="track-card">
      <div className="track-sparkle">✦</div>
      <p className="eyebrow">A little peek behind the curtain</p>
      <h1>Track your <em>order.</em></h1>
      <p>Enter your order number to see the estimated date set by our studio team.</p>
      <form onSubmit={handleTrack} style={{ display: 'grid', gap: 14 }}>
        <label className="floating-field">
          <input required placeholder=" " value={orderId} onChange={(e) => setOrderId(e.target.value)} />
          <span>Order number</span>
        </label>
        {error && <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(197,90,131,.1)', border: '1px solid rgba(197,90,131,.25)', color: '#c55a83', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={14} />{error}</div>}
        <Button type="submit" className="full-button" icon={<Search size={16} />}>Find my order</Button>
      </form>

      {tracked && <motion.div className="tracked-result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="tracked-result-head">
          <div>
            <h3>{tracked.items?.[0]?.productName || 'Your handmade piece'}</h3>
            <span>{tracked.id} · placed {new Date(tracked.createdAt || tracked.created_at || Date.now()).toLocaleDateString()}</span>
          </div>
          <strong>{formatINR(Number(tracked.total || 0))}</strong>
        </div>

        <GlassCard style={{ marginTop: 18, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><p className="eyebrow" style={{ marginBottom: 4 }}>Payment tracking</p><strong>{tracked.paymentStatus || tracked.payment_status || 'PENDING'}</strong><p style={{ margin: '5px 0 0', color: 'var(--muted)', fontSize: 13 }}>Paid {formatINR(Number(tracked.paidAmount || tracked.paid_amount || 0))} · Remaining {formatINR(Math.max(0, Number(tracked.total || 0) - Number(tracked.paidAmount || tracked.paid_amount || 0)))}</p></div></div>
          {!['PAID', 'AWAITING_VERIFICATION'].includes(tracked.paymentStatus || tracked.payment_status) && <form onSubmit={handlePaymentReport} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginTop: 12 }}><input type="number" min="1" max={Math.max(1, Number(tracked.balanceDue || tracked.balance_due || tracked.total || 0))} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Amount sent" style={{ padding: 9, border: '1px solid var(--line)', borderRadius: 9 }} /><input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="UPI reference (optional)" style={{ padding: 9, border: '1px solid var(--line)', borderRadius: 9 }} /><button className="button button-mini">I’ve paid</button></form>}
        </GlassCard>

        <GlassCard style={{ marginTop: 18, padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(62,142,126,.1)', color: '#3e8e7e', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <CalendarDays size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <p className="eyebrow" style={{ marginBottom: 4 }}>Estimated Date</p>
              <h2 style={{ margin: 0, fontSize: 20, fontFamily: "'Fraunces', serif" }}>
                {est ? new Date(est).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Not updated yet'}
              </h2>
              <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 13 }}>
                {est ? 'Our studio team has set the estimated ready / delivery date above. Thank you for your patience as we craft your piece by hand.' : 'The studio has not yet set an estimated date. They will update this as soon as they review your order — usually within 24 hours.'}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Past queries & replies */}
        {messages.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p className="eyebrow" style={{ margin: 0 }}>Your conversation with the studio</p>
              <Badge tone="icy">{messages.length}</Badge>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {messages.map((message) => (
                <div key={message.id} style={{ justifySelf: message.senderRole === 'CUSTOMER' ? 'end' : 'start', maxWidth: '88%', padding: '12px 14px', borderRadius: 14, background: message.senderRole === 'CUSTOMER' ? 'rgba(255,175,204,.2)' : 'rgba(62,142,126,.1)', border: '1px solid rgba(90,63,86,.08)' }}>
                  <small style={{ fontSize: 11, color: 'var(--muted)' }}>{message.senderRole === 'CUSTOMER' ? 'You' : 'Studio'} · {new Date(message.createdAt).toLocaleString()}</small>
                  <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{message.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ask a Query box */}
        <div style={{ marginTop: 22, paddingTop: 22, borderTop: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(197,90,131,.1)', color: '#b24d76', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <MessageCircle size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontFamily: "'Fraunces', serif" }}>Message the studio</h3>
              <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: 12.5 }}>
                Ask about this order or request an addition. Your conversation stays attached to the order.
              </p>
            </div>
          </div>
          <form onSubmit={handleQuery} style={{ display: 'grid', gap: 10 }}>
            <label className="floating-field floating-textarea">
              <textarea required placeholder=" " rows={3} value={queryText} onChange={(e) => setQueryText(e.target.value)} />
              <span>Write a message about this order…</span>
            </label>
            {queryMsg.text && <div style={{ padding: '8px 12px', borderRadius: 10, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, background: queryMsg.type === 'error' ? 'rgba(197,90,131,.1)' : 'rgba(62,142,126,.1)', border: `1px solid ${queryMsg.type === 'error' ? 'rgba(197,90,131,.25)' : 'rgba(62,142,126,.25)'}`, color: queryMsg.type === 'error' ? '#c55a83' : '#3e8e7e' }}>{queryMsg.type === 'error' ? <AlertCircle size={13} /> : <Check size={13} />}{queryMsg.text}</div>}
            <Button type="submit" className="full-button" icon={<Send size={14} />}>Send message</Button>
          </form>
        </div>
      </motion.div>}
    </section>
  </main><Footer /><WhatsAppFloat /></GradientBackground>;
}

function AboutPage() {
  return <GradientBackground variant="about"><Navbar cartCount={useApp().cart.length} /><main><section className="container about-hero"><p className="eyebrow"><span className="eyebrow-mark">✦</span> A small story from Muradnagar</p><h1>Made by hands.<br /><em>Held by heart.</em></h1><p>Especially For U started with a few college friends, a table full of craft supplies and a belief that the best gifts carry a little bit of the person who made them.</p><div className="about-hero-image"><img src={media.hero} alt="Pastel handmade crafts in a studio" /></div></section><section className="section story-section"><div className="container story-grid"><div><p className="eyebrow">Why we make</p><h2>Not just a thing.<br /><em>A feeling to keep.</em></h2></div><div><p>We make gifts for the moments that do not fit inside a generic box: the friendship that got you through exams, the room you are slowly making yours, the idea you have been carrying around.</p><p>Every order starts with a real person and a real reason. That is why our pieces are a little slower, a little softer and always made especially for you.</p><Badge tone="icy">Small studio · Muradnagar, UP</Badge></div></div></section><section className="section values-section"><div className="container"><SectionHeading align="center" eyebrow="The way we work" title={<>Three little <em>promises</em></>} /><div className="values-grid"><GlassCard><div className="value-icon"><Heart size={22} /></div><h3>Handmade</h3><p>Small batches, careful hands and the beautiful marks of something made by a person.</p></GlassCard><GlassCard><div className="value-icon"><Users size={22} /></div><h3>Personal</h3><p>We listen before we make, because the details that matter most are usually the smallest.</p></GlassCard><GlassCard><div className="value-icon"><Sparkles size={22} /></div><h3>Made for you</h3><p>No one-size-fits-all magic. Just thoughtful pieces for your exact kind of moment.</p></GlassCard></div></div></section></main><Footer /><WhatsAppFloat /></GradientBackground>;
}

function ContentPage() {
  const { slug } = useParams();
  const faqPage = slug === 'faq';
  const page = cmsPages.find((item) => item.slug === slug) || cmsPages[0];
  return <GradientBackground variant="about"><Navbar cartCount={useApp().cart.length} /><main className="container content-page"><section className="page-intro compact-intro"><div><p className="eyebrow"><span className="eyebrow-mark">✦</span> Especially For U · {faqPage ? 'Helpful little answers' : 'Editable studio page'}</p><h1>{faqPage ? <>Questions, answered <em>softly.</em></> : <>{page.title} <em>with care.</em></>}</h1><p>{faqPage ? 'A few things customers ask before making something personal.' : page.meta}</p></div><Badge tone={page.status === 'Published' ? 'icy' : 'soft'}>{page.status || 'Published'}</Badge></section><GlassCard className="content-document"><p className="review-before">REVIEW BEFORE PUBLISHING · This CMS-lite copy is starter content for the studio team.</p>{faqPage ? <div className="faq-list">{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}<ChevronDown size={16} /></summary><p>{faq.answer}</p></details>)}</div> : <><h2>{page.title}</h2><p>Especially For U is a small handmade studio run by college students in Muradnagar. We make gifts, keepsakes and custom pieces slowly, with clear communication and care.</p><h3>Good to know</h3><ul><li>We deliver only inside Muradnagar at launch, including KIET campus handovers and listed local areas.</li><li>Handmade items vary slightly in colour and finish. Custom pieces are non-returnable once production starts.</li><li>Customers confirm they have the right to use any uploaded image or design, and the studio may decline requests that copy protected work.</li></ul><h3>Need to ask something?</h3><p>Email <a href="mailto:hello@especiallyforu.in">hello@especiallyforu.in</a> or <a href="https://wa.me/919997837648">WhatsApp the studio</a>. We usually reply within 1–2 days.</p></>}</GlassCard></main><Footer /><WhatsAppFloat /></GradientBackground>;
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
    name: '', slug: '', category: '', type: 'READYMADE', price: '', originalPrice: '', saleStartsAt: '', saleEndsAt: '', badge: 'New',
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
      name: '', slug: '', category: cats[0]?.slug || cats[0]?.id || '', type: 'READYMADE', price: '', originalPrice: '', saleStartsAt: '', saleEndsAt: '', badge: 'New',
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
      saleStartsAt: p.saleStartsAt ? String(p.saleStartsAt).slice(0, 16) : '', saleEndsAt: p.saleEndsAt ? String(p.saleEndsAt).slice(0, 16) : '',
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
      payload.saleStartsAt = payload.saleStartsAt || null;
      payload.saleEndsAt = payload.saleEndsAt || null;
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
      window.dispatchEvent(new Event('efu:catalog-updated'));
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
      window.dispatchEvent(new Event('efu:catalog-updated'));
      setFormMsg({ type: 'success', text: `Archived “${deleteConfirm.name}”.` });
    } catch (err) { setFormMsg({ type: 'error', text: err.message || 'Could not archive product.' }); }
    setDeleteConfirm(null);
  };

  const toggleActive = async (p) => {
    try {
      await req('PATCH', `/api/admin/products/${p.id}`, { isActive: !p.isActive });
      setItems((list) => list.map((it) => it.id === p.id ? { ...it, isActive: !p.isActive } : it));
      window.dispatchEvent(new Event('efu:catalog-updated'));
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
                <span>Sale price (₹)</span>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: 14, borderRadius: 14, background: 'rgba(255,175,204,.12)', border: '1px solid rgba(197,90,131,.12)' }}>
              <label className="floating-field"><input type="datetime-local" value={form.saleStartsAt} onChange={(e) => setForm({ ...form, saleStartsAt: e.target.value })} /><span>Discount starts</span></label>
              <label className="floating-field"><input type="datetime-local" value={form.saleEndsAt} onChange={(e) => setForm({ ...form, saleEndsAt: e.target.value })} /><span>Discount ends</span></label>
              <small style={{ gridColumn: '1 / -1', color: 'var(--muted)', fontSize: 11 }}>Set the original price and a lower sale price above. Leave dates blank for a discount with no schedule.</small>
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

function AdminOrdersPanel() {
  const adminToken = localStorage.getItem('efu_admin_token') || '';
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [search, setSearch] = useState('');
  const [editingEst, setEditingEst] = useState({});
  const [paymentDraft, setPaymentDraft] = useState({});

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
    try { const r = await req('GET', '/api/admin/orders'); setOrders(r.orders || []); }
    catch (err) { setMsg({ type: 'error', text: err.message || 'Failed to load orders.' }); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const saveEstimatedDate = async (orderId) => {
    const val = editingEst[orderId];
    try {
      await req('PATCH', `/api/admin/orders/${orderId}/estimated-date`, { estimatedDate: val || null });
      setMsg({ type: 'success', text: `Updated estimated date for ${orderId}.` });
      setOrders((list) => list.map((o) => o.id === orderId ? { ...o, estimatedDate: val || null, estimated_date: val || null } : o));
      setEditingEst((e) => { const n = { ...e }; delete n[orderId]; return n; });
    } catch (err) { setMsg({ type: 'error', text: err.message || 'Save failed.' }); }
  };

  const recordPayment = async (order) => {
    const draft = paymentDraft[order.id] || {};
    try {
      const result = await req('POST', `/api/admin/orders/${order.id}/payments`, { amount: Number(draft.amount), method: draft.method || 'UPI', reference: draft.reference || '' });
      setOrders((list) => list.map((item) => item.id === order.id ? { ...item, paidAmount: result.order.paid_amount ?? result.order.paidAmount, balanceDue: result.order.balance_due ?? result.order.balanceDue, paymentStatus: result.order.payment_status ?? result.order.paymentStatus } : item));
      setPaymentDraft((state) => ({ ...state, [order.id]: { amount: '', method: draft.method || 'UPI', reference: '' } }));
      setMsg({ type: 'success', text: `Payment recorded for ${order.id}.` });
    } catch (err) { setMsg({ type: 'error', text: err.message || 'Could not record payment.' }); }
  };

  const filtered = orders.filter((o) => !search || `${o.id} ${o.customer?.name || ''} ${o.customer?.phone || ''}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="ops-section">
    <div className="ops-toolbar">
      <span className="ops-toolbar-note"><Package size={15} /> {orders.length} order{orders.length === 1 ? '' : 's'} · set estimated date for each order below</span>
      <div style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
        <div className="global-search" style={{ width: 280 }}><Search size={14} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order, name, phone…" /></div>
        <button className="small-link" onClick={refresh}><RefreshCw size={13} /> Refresh</button>
      </div>
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
    <GlassCard className="ops-table-card">
      <div className="admin-card-heading">
        <div><p className="eyebrow">Order control</p><h2>Set estimated dates per order</h2></div>
      </div>
      {loading ? <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)' }}>Loading orders…</div> :
        filtered.length ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {filtered.map((order) => {
              const cust = order.customer || {};
              const deliv = order.delivery || {};
              const currentEst = editingEst[order.id] !== undefined ? editingEst[order.id] : (order.estimatedDate || order.estimated_date || '');
              return <div key={order.id} style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid rgba(90,63,86,.1)', background: '#fff' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 2fr) minmax(120px, 1fr) 220px 180px', gap: 14, alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: 'var(--ink)', fontSize: 14 }}>{order.id}</strong>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{cust.name || order.customer || '—'} · {cust.phone || order.phone || order.customer_phone || '—'} { (cust.phone || order.phone || order.customer_phone) && <a href={`tel:${cust.phone || order.phone || order.customer_phone}`} aria-label="Call customer" style={{ marginLeft: 8, color: '#995f83' }}><PhoneCall size={13} /></a>}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>{deliv.method === 'home' ? 'Home delivery' : 'Campus handover'} · {deliv.pickupDate || deliv.pickup_date || 'No pickup date'}</div>
                  </div>
                  <Badge tone={['DELIVERED','PAID','CONFIRMED'].includes(order.status) ? 'icy' : 'blush'}>{order.status}</Badge>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="date" value={currentEst ? new Date(currentEst).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditingEst({ ...editingEst, [order.id]: e.target.value })}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(90,63,86,.15)', fontSize: 13 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {(editingEst[order.id] !== undefined || !currentEst) && (
                      <button className="button button-mini" onClick={() => saveEstimatedDate(order.id)}>Save</button>
                    )}
                    {currentEst && editingEst[order.id] === undefined && (
                      <Badge tone="icy">{new Date(currentEst).toLocaleDateString()}</Badge>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                  <Badge tone={order.paymentStatus === 'PAID' ? 'icy' : 'blush'}>{order.paymentStatus || 'PENDING'}</Badge>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Paid {formatINR(Number(order.paidAmount || 0))} · Balance {formatINR(Math.max(0, Number(order.total || 0) - Number(order.paidAmount || 0)))} · Total {formatINR(Number(order.total || 0))}{Number(order.reportedAmount || order.reported_amount) > 0 ? ` · Customer reports ${formatINR(Number(order.reportedAmount || order.reported_amount))}${order.reportedReference || order.reported_reference ? ` · Ref ${order.reportedReference || order.reported_reference}` : ''}` : ''}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    <input type="number" min="1" max={Math.max(1, Number(order.total || 0) - Number(order.paidAmount || 0))} placeholder="Amount received ₹" value={paymentDraft[order.id]?.amount || ''} onChange={(e) => setPaymentDraft((state) => ({ ...state, [order.id]: { ...state[order.id], amount: e.target.value } }))} style={{ width: 150, padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(90,63,86,.15)' }} />
                    <select value={paymentDraft[order.id]?.method || 'UPI'} onChange={(e) => setPaymentDraft((state) => ({ ...state, [order.id]: { ...state[order.id], method: e.target.value } }))} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(90,63,86,.15)' }}><option value="UPI">UPI</option><option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank transfer</option><option value="OTHER">Other</option></select>
                    <input placeholder="Reference (optional)" value={paymentDraft[order.id]?.reference || ''} onChange={(e) => setPaymentDraft((state) => ({ ...state, [order.id]: { ...state[order.id], reference: e.target.value } }))} style={{ width: 150, padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(90,63,86,.15)' }} />
                    <button className="button button-mini" disabled={!Number(paymentDraft[order.id]?.amount)} onClick={() => recordPayment(order)}>Record payment</button>
                  </div>
                </div>
              </div>;
            })}
          </div>
        ) : <EmptyState title="No orders yet" body="Orders placed through checkout will appear here." />
      }
    </GlassCard>
  </div>;
}

function AdminConversationsPanel() {
  const adminToken = localStorage.getItem('efu_admin_token') || '';
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [requestDetail, setRequestDetail] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [draft, setDraft] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const req = async (method, url, body) => {
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || `Request failed (${response.status})`);
    return data;
  };
  const refreshList = async () => {
    setLoading(true);
    try { const data = await req('GET', '/api/admin/conversations'); setConversations(data.conversations || []); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  const refreshThread = async (thread) => {
    if (!thread) return;
    try {
      const kind = thread.conversationType.toLowerCase();
      const data = await req('GET', `/api/admin/conversations/${kind}/${thread.entityId}`);
      setMessages(data.messages || []);
      if (kind === 'request') {
        const requestData = await req('GET', `/api/admin/custom-requests/${thread.entityId}`);
        setRequestDetail(requestData.request);
        setQuoteAmount(requestData.request?.quote?.amount ? String(requestData.request.quote.amount) : '');
        setOrderDetail(null);
      } else {
        const orderData = await req('GET', `/api/admin/orders/${thread.entityId}`);
        setOrderDetail(orderData.order); setRequestDetail(null);
      }
    } catch (err) { setError(err.message); }
  };
  useEffect(() => { refreshList(); }, []);
  useEffect(() => { refreshThread(selected); }, [selected]);
  useEffect(() => {
    if (!selected) return undefined;
    const timer = window.setInterval(() => refreshThread(selected), 8000);
    return () => window.clearInterval(timer);
  }, [selected]);
  const send = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !selected) return;
    try {
      const data = await req('POST', `/api/admin/conversations/${selected.conversationType.toLowerCase()}/${selected.entityId}`, { message: draft.trim() });
      setMessages((items) => [...items, data.message]); setDraft(''); setError(''); refreshList();
    } catch (err) { setError(err.message); }
  };
  const sendQuote = async () => {
    const amount = Number(quoteAmount);
    if (!selected || !Number.isSafeInteger(amount) || amount < 1) return setError('Enter a valid quote amount.');
    try {
      const message = `Your quote is ${formatINR(amount)}. A 50% advance (${formatINR(Math.ceil(amount / 2))}) is due before we begin. Reply here if you have any questions.`;
      await req('PATCH', `/api/admin/custom-requests/${selected.entityId}/status`, { status: 'QUOTE_SENT', quote: { amount, advance: Math.ceil(amount / 2), note: '' } });
      const result = await req('POST', `/api/admin/conversations/request/${selected.entityId}`, { message });
      setMessages((items) => [...items, result.message]); setError(''); refreshThread(selected); refreshList();
    } catch (err) { setError(err.message); }
  };
  const clearThread = async () => {
    if (!selected || !window.confirm('Delete this conversation and its request reference files? The order and payment record will stay.')) return;
    try {
      await req('DELETE', `/api/admin/conversations/${selected.conversationType.toLowerCase()}/${selected.entityId}`);
      setMessages([]); setSelected(null); setRequestDetail(null); setError(''); await refreshList();
    } catch (err) { setError(err.message); }
  };
  const markComplete = async () => {
    if (!selected) return;
    try {
      if (selected.conversationType === 'ORDER') await req('PATCH', `/api/admin/orders/${selected.entityId}/status`, { status: 'DELIVERED' });
      else await req('PATCH', `/api/admin/custom-requests/${selected.entityId}/status`, { status: 'COMPLETED' });
      await refreshThread(selected); setError('');
    } catch (err) { setError(err.message); }
  };
  return <div className="ops-section">
    <div className="ops-toolbar"><span className="ops-toolbar-note"><MessageCircle size={15} /> Customer chats for custom requests and orders</span><button className="small-link" onClick={refreshList}><RefreshCw size={13} /> Refresh inbox</button></div>
    {error && <div role="alert" style={{ marginBottom: 12, padding: 10, borderRadius: 10, background: 'rgba(197,90,131,.1)', color: '#c55a83' }}>{error}</div>}
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(230px, .75fr) minmax(0, 1.7fr)', gap: 14, minHeight: 500 }}>
      <GlassCard style={{ padding: 10, overflowY: 'auto' }}>{loading ? <p style={{ padding: 12 }}>Loading inbox…</p> : conversations.length ? conversations.map((item) => <button key={`${item.conversationType}:${item.entityId}`} onClick={() => setSelected(item)} style={{ width: '100%', display: 'block', textAlign: 'left', border: 0, borderRadius: 12, padding: 13, marginBottom: 5, background: selected?.entityId === item.entityId ? 'rgba(255,175,204,.2)' : 'transparent', cursor: 'pointer', color: 'var(--ink)' }}><Badge tone={item.conversationType === 'REQUEST' ? 'blush' : 'icy'}>{item.conversationType}</Badge><strong style={{ display: 'block', marginTop: 8 }}>{item.customerName || 'Customer'} · {item.entityId}</strong><small style={{ color: 'var(--muted)' }}>{item.lastMessage}</small><span style={{ display: 'block', marginTop: 5, fontSize: 12 }}>{item.customerPhone ? <a href={`tel:${item.customerPhone}`} onClick={(e) => e.stopPropagation()}><PhoneCall size={12} /> {item.customerPhone}</a> : 'No phone number'}</span></button>) : <EmptyState title="No conversations yet" body="New request and order messages will show up here." />}</GlassCard>
      <GlassCard style={{ padding: 18, display: 'flex', flexDirection: 'column', minWidth: 0 }}>{selected ? <>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 12, borderBottom: '1px solid var(--line)' }}><div><p className="eyebrow" style={{ marginBottom: 4 }}>{selected.conversationType} · {selected.entityId}</p><h2 style={{ margin: 0 }}>{selected.customerName || 'Customer'}</h2>{selected.customerPhone && <a href={`tel:${selected.customerPhone}`}><PhoneCall size={13} /> Call {selected.customerPhone}</a>}<small style={{ display: 'block', color: 'var(--muted)', marginTop: 4 }}>Status: {requestDetail?.status || orderDetail?.status || '—'}</small></div><div style={{ display: 'grid', justifyItems: 'end', gap: 8 }}><button className="small-link" onClick={() => refreshThread(selected)}><RefreshCw size={13} /> Refresh</button>{(selected.conversationType === 'ORDER' ? orderDetail?.status !== 'DELIVERED' : requestDetail?.status !== 'COMPLETED') && <button className="small-link" onClick={markComplete}><Check size={13} /> Mark complete</button>}</div></div>
        {requestDetail?.referenceUrls?.length > 0 && <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', padding: '12px 0' }}>{requestDetail.referenceUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" style={{ color: '#995f83', fontSize: 12 }}>View customer reference {index + 1} ↗</a>)}</div>}
        {requestDetail && <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}><input type="number" min="1" placeholder="Quote amount ₹" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} style={{ flex: 1, padding: 9, border: '1px solid var(--line)', borderRadius: 10 }} /><button className="button button-mini" onClick={sendQuote}>Send 50% advance quote</button></div>}
        <div style={{ flex: 1, minHeight: 180, maxHeight: 350, overflowY: 'auto', display: 'grid', alignContent: 'start', gap: 9, padding: 8, background: 'rgba(90,63,86,.035)', borderRadius: 14 }}>{messages.map((message) => <div key={message.id} style={{ justifySelf: message.senderRole === 'ADMIN' ? 'end' : 'start', maxWidth: '88%', padding: '10px 13px', borderRadius: 13, background: message.senderRole === 'ADMIN' ? 'rgba(62,142,126,.12)' : '#fff' }}><small style={{ color: 'var(--muted)' }}>{message.senderRole === 'ADMIN' ? 'Studio' : 'Customer'} · {new Date(message.createdAt).toLocaleString()}</small><p style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{message.message}</p></div>)}</div>
        <form onSubmit={send} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginTop: 12 }}><textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Reply to the customer…" style={{ resize: 'vertical', padding: 10, border: '1px solid var(--line)', borderRadius: 10, font: 'inherit' }} /><button className="button button-mini" disabled={!draft.trim()}><Send size={13} /> Send reply</button></form>
        <button className="small-link" onClick={clearThread} style={{ alignSelf: 'flex-end', marginTop: 10, color: '#995f83' }}><Trash2 size={13} /> Delete chat and reference files after completion</button>
      </> : <EmptyState title="Choose a conversation" body="Select a customer from the inbox to review their message and reply." />}</GlassCard>
    </div>
  </div>;
}

function AdminTeamPanel() {
  const adminToken = localStorage.getItem('efu_admin_token') || '';
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const request = async (method, url, body) => {
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || 'Request failed.');
    return data;
  };
  const refresh = async () => { try { setAdmins((await request('GET', '/api/admin/team')).admins || []); } catch (err) { setError(err.message); } };
  useEffect(() => { refresh(); }, []);
  const create = async (event) => {
    event.preventDefault(); setError(''); setMessage('');
    try { await request('POST', '/api/admin/team', form); setForm({ name: '', email: '', phone: '', password: '' }); setMessage('Admin account added. They can sign in at /admin.'); await refresh(); }
    catch (err) { setError(err.message); }
  };
  const toggle = async (admin) => {
    try { await request('PATCH', `/api/admin/team/${admin.id}`, { isActive: !admin.isActive }); await refresh(); }
    catch (err) { setError(err.message); }
  };
  return <div className="ops-section"><div className="ops-toolbar"><span className="ops-toolbar-note"><Users size={15} /> Add individual admin accounts. Only owners can manage this list.</span></div>{error && <div role="alert" style={{ color: '#c55a83', marginBottom: 12 }}>{error}</div>}{message && <div style={{ color: '#3e8e7e', marginBottom: 12 }}>{message}</div>}<GlassCard style={{ padding: 20, marginBottom: 14 }}><p className="eyebrow">Invite a teammate</p><form onSubmit={create} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}><input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /><input required type="password" minLength={10} placeholder="Temporary password (10+ characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><Button type="submit" icon={<UserPlus size={15} />}>Add admin</Button></form></GlassCard><div style={{ display: 'grid', gap: 10 }}>{admins.map((admin) => <GlassCard key={admin.id} style={{ padding: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><div><strong>{admin.name}</strong><div style={{ color: 'var(--muted)', fontSize: 12 }}>{admin.email} · {admin.phone || 'No phone'} · {admin.role}</div></div><button className="small-link" onClick={() => toggle(admin)}>{admin.isActive ? 'Deactivate access' : 'Restore access'}</button></GlassCard>)}</div></div>;
}

function AdminPaymentSetupPanel() {
  const adminToken = localStorage.getItem('efu_admin_token') || '';
  const [form, setForm] = useState({ upiId: '', upiQrImage: '', paymentInstructions: 'Pay the requested amount by UPI. We will start after confirming it.' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/settings/public').then((response) => response.json()).then((data) => setForm((current) => ({ ...current, ...(data.settings || {}) }))).catch(() => {});
  }, []);
  const uploadQr = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 4 * 1024 * 1024) { setError('Choose a QR image up to 4 MB.'); return; }
    try {
      const result = await fetch('/api/admin/upload', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ data: await fileToBase64(file), filename: 'upi-payment-qr' }) });
      const data = await result.json().catch(() => ({}));
      if (!result.ok) throw new Error(data.message || 'QR upload failed.');
      setForm((current) => ({ ...current, upiQrImage: data.url })); setError('');
    } catch (err) { setError(err.message); }
  };
  const save = async (event) => {
    event.preventDefault(); setError(''); setMessage('');
    try {
      const response = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ upiId: form.upiId, upiQrImage: form.upiQrImage, paymentInstructions: form.paymentInstructions }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || 'Could not save payment details.');
      setMessage('UPI details saved. Customers will see these at checkout.');
    } catch (err) { setError(err.message); }
  };
  return <div className="ops-section"><GlassCard style={{ padding: 22, maxWidth: 680 }}><p className="eyebrow">Manual UPI payments</p><h2 style={{ marginTop: 0 }}>Set your payment QR</h2><p style={{ color: 'var(--muted)', fontSize: 13 }}>Customers pay the requested advance using these details. Their “I’ve paid” report stays pending until you record the verified amount under Orders.</p><form onSubmit={save} style={{ display: 'grid', gap: 14 }}><label className="floating-field"><input value={form.upiId || ''} onChange={(e) => setForm({ ...form, upiId: e.target.value })} placeholder=" " /><span>UPI ID / payment handle</span></label><label className="floating-field floating-textarea"><textarea rows={3} value={form.paymentInstructions || ''} onChange={(e) => setForm({ ...form, paymentInstructions: e.target.value })} placeholder=" " /><span>Instructions for customers</span></label><div><p className="field-label">QR code image</p>{form.upiQrImage && <img src={form.upiQrImage} alt="UPI payment QR preview" style={{ width: 170, height: 170, objectFit: 'contain', background: '#fff', borderRadius: 12, padding: 8, border: '1px solid var(--line)' }} />}<label style={{ display: 'block', marginTop: 10 }}><input type="file" accept="image/*" onChange={uploadQr} /><span style={{ marginLeft: 8 }}>Upload QR image</span></label></div>{error && <div role="alert" style={{ color: '#c55a83' }}>{error}</div>}{message && <div style={{ color: '#3e8e7e' }}>{message}</div>}<Button type="submit">Save payment details</Button></form></GlassCard></div>;
}

function AdminCustomRequestsPanel({ onMessages }) {
  const adminToken = localStorage.getItem('efu_admin_token') || '';
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const refresh = async () => {
    try {
      const response = await fetch('/api/admin/custom-requests', { headers: { Authorization: `Bearer ${adminToken}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || 'Could not load requests.');
      setRequests(data.requests || []);
    } catch (err) { setError(err.message); }
  };
  useEffect(() => { refresh(); }, []);
  return <div className="ops-section"><div className="ops-toolbar"><span className="ops-toolbar-note"><WandSparkles size={15} /> Customer ideas, references and contact numbers</span><button className="small-link" onClick={refresh}><RefreshCw size={13} /> Refresh</button></div>{error && <div role="alert">{error}</div>}{requests.length ? <div style={{ display: 'grid', gap: 12 }}>{requests.map((item) => {
    const refs = Array.isArray(item.referenceUrls) ? item.referenceUrls : [];
    return <GlassCard key={item.id} style={{ padding: 18 }}><div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}><img src={media.collage} alt="" style={{ width: 76, height: 76, objectFit: 'cover', borderRadius: 12 }} /><div style={{ flex: 1 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><div><Badge tone={item.status === 'QUOTE_SENT' ? 'blush' : 'soft'}>{item.status}</Badge><h3 style={{ margin: '7px 0 2px' }}>{item.title}</h3><p style={{ margin: 0, color: 'var(--muted)', fontSize: 12 }}>{item.id} · {item.customer || 'Customer'} · {item.phone || 'No phone number'}</p></div><button className="button button-mini" onClick={onMessages}><MessageCircle size={13} /> Open messages</button></div><p style={{ margin: '10px 0', whiteSpace: 'pre-wrap' }}>{item.description}</p>{refs.length > 0 && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{refs.map((url, index) => <a href={url} target="_blank" rel="noreferrer" key={url} style={{ color: '#995f83', fontSize: 12 }}>Reference {index + 1} ↗</a>)}</div>}<div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: 'var(--muted)' }}><span>Needed by: {item.neededBy || '—'}</span><span>Budget: {item.budget || '—'}</span><span>Occasion: {item.occasion || '—'}</span><span>Pickup: {item.pickupLocation || '—'}</span>{item.phone && <a href={`tel:${item.phone}`}><PhoneCall size={12} /> Call customer</a>}</div></div></div></GlassCard>;
  })}</div> : <EmptyState title="No custom requests yet" body="Customer ideas and their reference files will appear here." />}</div>;
}

function AdminReviewsPanel() {
  const token = localStorage.getItem('efu_admin_token') || '';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/reviews', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || 'Could not load reviews.');
      setItems(data.reviews || []);
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const moderate = async (review, status) => {
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || 'Could not update review.');
      await load(); setNotice(status === 'APPROVED' ? 'Review published.' : 'Review hidden from shoppers.');
    } catch (moderationError) { setError(moderationError.message); }
  };
  const remove = async (review) => {
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || 'Could not delete review.');
      await load(); setNotice('Review deleted.');
    } catch (deleteError) { setError(deleteError.message); }
  };
  return <div className="ops-section"><div className="ops-toolbar"><span className="ops-toolbar-note"><Star size={15} /> {items.length} customer review{items.length === 1 ? '' : 's'} · approve to show on the website</span><Button variant="secondary" icon={<RefreshCw size={14} />} onClick={load}>Refresh</Button></div>
    {error && <p className="review-error">{error}</p>}{notice && <p className="review-success">{notice}</p>}
    {loading ? <p>Loading reviews…</p> : items.length ? <div className="admin-review-list">{items.map((review) => <GlassCard className="admin-review-card" key={review.id}><div className="admin-review-top"><div><PinkStars rating={Number(review.rating)} /><Badge tone={review.status === 'APPROVED' ? 'icy' : review.status === 'REJECTED' ? 'soft' : 'blush'}>{review.status}</Badge></div><small>{review.createdAt ? new Date(review.createdAt).toLocaleString() : ''}</small></div><h3>{review.productName || 'Deleted product'}</h3><p>{review.comment}</p><div className="admin-review-bottom"><span>{review.customerName || 'Customer'}</span><div>{review.status !== 'APPROVED' && <Button variant="mini" onClick={() => moderate(review, 'APPROVED')}>Approve</Button>}{review.status === 'APPROVED' && <Button variant="secondary" onClick={() => moderate(review, 'REJECTED')}>Hide</Button>}<button className="review-delete-button" onClick={() => remove(review)}>Delete</button></div></div></GlassCard>)}</div> : <EmptyState title="No reviews yet" body="Customer reviews will appear here for approval." />}
  </div>;
}

function AdminOpsPanel({ tab, setTab }) {
  if (tab === 'Products') return <AdminProductsPanel />;
  if (tab === 'Categories') return <AdminCategoriesPanel />;
  if (tab === 'Orders') return <AdminOrdersPanel />;
  if (tab === 'Messages') return <AdminConversationsPanel />;
  if (tab === 'Custom Requests') return <AdminCustomRequestsPanel onMessages={() => setTab('Messages')} />;
  if (tab === 'Team') return <AdminTeamPanel />;
  if (tab === 'Payment Setup') return <AdminPaymentSetupPanel />;
  if (tab === 'Reviews') return <AdminReviewsPanel />;
  return <div className="ops-section"><EmptyState title={`No ${tab.toLowerCase()} records yet`} body="This section will show information after it has been added to your studio database." /></div>;
}

function AdminDashboard({ token, onOpenOrders }) {
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/summary', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : Promise.reject(new Error('Could not load studio summary.'))),
      fetch('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : Promise.reject(new Error('Could not load orders.'))),
    ]).then(([s, o]) => { setSummary(s.summary || {}); setOrders(o.orders || []); })
      .catch((err) => setError(err.message || 'Could not load studio data.'));
  }, [token]);
  const stats = summary ? [
    ['Orders today', summary.ordersToday || 0],
    ['Pending quotes', summary.pendingQuotes || 0],
    ['In production', summary.inProduction || 0],
    ['Recorded revenue', formatINR(summary.totalRevenue || 0)],
  ] : [];
  return <div className="ops-section">
    {error && <div role="alert" style={{ color: '#c55a83', marginBottom: 12 }}>{error}</div>}
    {!summary ? <GlassCard className="empty-state"><p>Loading studio records…</p></GlassCard> : <>
      <div className="admin-stat-grid">{stats.map(([label, value]) => <GlassCard key={label}><span className="stat-label">{label}</span><strong>{value}</strong></GlassCard>)}</div>
      <GlassCard className="ops-table-card"><div className="admin-card-heading"><div><p className="eyebrow">Latest activity</p><h2>Recent orders</h2></div><button className="small-link" onClick={onOpenOrders}>View all <ArrowUpRight size={14} /></button></div>
        {orders.length ? orders.slice(0, 5).map((order) => <div className="ops-order-row" key={order.id}><div><strong>{order.id}</strong><span>{typeof order.customer === 'string' ? order.customer : order.customer?.name || order.customer_name || order.email || 'Customer'}</span></div><Badge tone={order.status === 'DELIVERED' ? 'icy' : 'blush'}>{order.status}</Badge><span>{formatINR(order.total ?? order.pricing?.total ?? 0)}</span><span>{order.paymentStatus || order.payment_status || 'PENDING'}</span></div>) : <EmptyState title="No orders yet" body="Real customer orders will appear here." />}
      </GlassCard>
    </>}
  </div>;
}

function AdminPage() {
  const [tab, setTab] = useState('Dashboard');
  const [token, setToken] = useState(() => localStorage.getItem('efu_admin_token') || '');
  const [checkingSession, setCheckingSession] = useState(() => Boolean(localStorage.getItem('efu_admin_token')));
  const [adminUser, setAdminUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('efu_admin_user') || 'null');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!token) { setCheckingSession(false); return; }
    fetch('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error('Admin session expired.');
        setAdminUser(data.admin);
      })
      .catch(() => { localStorage.removeItem('efu_admin_token'); localStorage.removeItem('efu_admin_user'); setToken(''); setAdminUser(null); })
      .finally(() => setCheckingSession(false));
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('efu_admin_token');
    localStorage.removeItem('efu_admin_user');
    setToken('');
    setAdminUser(null);
    setCheckingSession(false);
  };

  if (checkingSession) return <GradientBackground variant="admin"><main className="container success-page"><p>Checking your studio session…</p></main></GradientBackground>;
  if (!token) {
    return <Navigate to="/login" replace state={{ from: { pathname: '/admin' } }} />;
  }

  const adminLinks = [['Dashboard', LayoutDashboard], ['Orders', Package], ['Messages', MessageCircle], ['Custom Requests', WandSparkles], ['Products', Palette], ['Categories', Tag], ['Payment Setup', CreditCard], ['Delivery Areas', Truck], ['Delivery Slots', CalendarDays], ['Customers', Users], ['Reviews', Star], ['Inventory', BarChart3], ['Homepage', WandSparkles], ['Pages', FileText], ['Store Controls', SlidersHorizontal], ...(String(adminUser?.role).toUpperCase() === 'OWNER' ? [['Team', UserPlus]] : []), ['Reports', ClipboardList], ['Notifications', Bell], ['Audit Log', LockKeyhole], ['Payment Issues', AlertCircle], ['Settings', Settings]];
  return <GradientBackground variant="admin"><Navbar cartCount={useApp().cart.length} /><main className="admin-shell container"><aside className="admin-sidebar"><div className="admin-brand"><span>EFU</span><div><strong>Studio desk</strong><small>Especially For U</small></div></div><nav>{adminLinks.map(([label, Component]) => <button className={tab === label ? 'is-active' : ''} key={label} onClick={() => setTab(label)}><Component size={16} />{label}</button>)}</nav><div className="admin-sidebar-foot"><span className="admin-avatar">{adminUser?.name ? adminUser.name[0] : 'A'}</span><div><strong>{adminUser?.name || 'Admin'}</strong><small>{adminUser?.role || 'Owner'}</small></div><button onClick={handleLogout} title="Log out" style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', color: 'var(--muted)', display: 'grid', placeItems: 'center' }}><LogOut size={15} /></button></div></aside><section className="admin-content"><div className="admin-mobile-title"><div><p className="eyebrow">Studio desk</p><h1>{tab}</h1></div><Button variant="secondary" icon={<Plus size={16} />}>Add new</Button></div>{tab === 'Dashboard' ? <AdminDashboard token={token} onOpenOrders={() => setTab('Orders')} /> : <AdminOpsPanel tab={tab} setTab={setTab} />}</section></main></GradientBackground>;
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
  const [wishlist, setWishlist] = useState([]);
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

  window.__efuApp = { cart, wishlist, addToCart, onWish, updateQuantity, removeFromCart, emptyCart: () => setCart([]), reduced };

  return (
    <AuthProvider>
      <LiveDataProvider>
        <AnimatePresence mode="wait">
          <Routes>
            {/* Public Storefront Routes - only Home is public */}
            <Route path="/" element={<HomePage />} />

            {/* Authentication Routes - public */}
            <Route path="/login" element={<AuthPage initialMode="login" />} />
            <Route path="/signup" element={<AuthPage initialMode="signup" />} />
            <Route path="/forgot-password" element={<AuthPage initialMode="forgot" />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected Storefront Routes */}
            <Route path="/shop" element={<ProtectedRoute allowAdmin><ShopPage /></ProtectedRoute>} />
            <Route path="/category/:slug" element={<ProtectedRoute allowAdmin><CategoryRoute /></ProtectedRoute>} />
            <Route path="/occasion/:occasion" element={<ProtectedRoute allowAdmin><OccasionRoute /></ProtectedRoute>} />
            <Route path="/product/:slug" element={<ProtectedRoute allowAdmin><ProductPage /></ProtectedRoute>} />
            <Route path="/custom-request" element={<ProtectedRoute><CustomRequestPage /></ProtectedRoute>} />
            <Route path="/cart" element={<ProtectedRoute allowAdmin><CartPage /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
            <Route path="/track-order" element={<Navigate to="/account" replace />} />
            <Route path="/about" element={<ProtectedRoute allowAdmin><AboutPage /></ProtectedRoute>} />
            <Route path="/pages/:slug" element={<ProtectedRoute allowAdmin><ContentPage /></ProtectedRoute>} />

            {/* Customer Account Routes (Protected) */}
            <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
            <Route path="/account/orders/:id/chat" element={<ProtectedRoute><OrderChatPage /></ProtectedRoute>} />
            <Route path="/account/requests/:id" element={<ProtectedRoute><RequestConversationPage /></ProtectedRoute>} />

            {/* Admin Desk Route (Protected) */}
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
