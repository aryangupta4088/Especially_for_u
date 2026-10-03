import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.3 14.7 2.3 12 2.3 6.9 2.3 2.7 6.5 2.7 11.9S6.9 21.5 12 21.5c6.9 0 9.5-4.8 9.5-7.3 0-.5 0-.9-.1-1.3H12z"/>
  </svg>
);

function GradientShell({ children }) {
  return (
    <div className="page-bg page-auth" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div className="mesh-blob blob-a" style={{ position: 'absolute', inset: '-10% auto auto -15%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, rgba(255,175,204,.55), transparent 60%)', filter: 'blur(40px)' }} />
      <div className="mesh-blob blob-b" style={{ position: 'absolute', inset: 'auto -10% -15% auto', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle at 70% 70%, rgba(189,224,254,.55), transparent 60%)', filter: 'blur(40px)' }} />
      <div className="grain" style={{ position: 'absolute', inset: 0, opacity: .35, pointerEvents: 'none', background: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/></svg>\") center/cover" }} />
      <div style={{ position: 'relative', zIndex: 2, minHeight: '100vh' }}>
        <header style={{ padding: '22px 28px' }}>
          <Link to="/" className="wordmark" aria-label="Especially For U home" style={{ textDecoration: 'none', color: 'var(--ink)', fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600 }}>
            <span>Especially</span><em style={{ fontStyle: 'italic', fontWeight: 500 }}>For U</em><i style={{ fontStyle: 'normal', color: '#c55a83' }}>✦</i>
          </Link>
        </header>
        {children}
        <footer style={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
          <LockKeyhole size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
          Protected · Especially For U Studio
        </footer>
      </div>
    </div>
  );
}

function PillTabs({ tabs, mode, setMode }) {
  return (
    <div style={{ display: 'inline-flex', padding: 4, borderRadius: 999, background: 'rgba(90,63,86,.08)', border: '1px solid rgba(90,63,86,.1)', marginBottom: 22 }}>
      {tabs.map(([key, label]) => (
        <button
          key={key}
          onClick={() => setMode(key)}
          style={{
            border: 'none', cursor: 'pointer',
            padding: '8px 18px', borderRadius: 999,
            fontWeight: 500, fontSize: 13, letterSpacing: .2,
            background: mode === key ? '#fff' : 'transparent',
            color: mode === key ? '#5a3f56' : 'var(--muted)',
            boxShadow: mode === key ? '0 1px 0 rgba(90,63,86,.06), 0 8px 20px -16px rgba(90,63,86,.35)' : 'none',
            transition: 'all .18s ease',
          }}
        >{label}</button>
      ))}
    </div>
  );
}

function Field({ type = 'text', value, onChange, label, icon: Icon, right, autoComplete, required = true }) {
  const [shown, setShown] = useState(false);
  const showToggle = type === 'password';
  return (
    <label style={{ position: 'relative', display: 'block' }}>
      {Icon && <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}><Icon size={16} /></span>}
      <input
        required={required}
        type={showToggle ? (shown ? 'text' : 'password') : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder=" "
        style={{
          width: '100%',
          padding: `${Icon ? '18px 46px 10px 42px' : '18px 16px 10px 16px'}`,
          borderRadius: 14,
          border: '1px solid rgba(90,63,86,.18)',
          background: '#fff',
          fontSize: 14,
          outline: 'none',
          transition: 'all .15s ease',
          boxSizing: 'border-box',
          color: 'var(--ink)',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(197,90,131,.5)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(197,90,131,.08)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(90,63,86,.18)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
      <span style={{ position: 'absolute', left: Icon ? 42 : 16, top: 10, fontSize: 10.5, color: 'var(--muted)', letterSpacing: .3, textTransform: 'uppercase', pointerEvents: 'none' }}>{label}</span>
      {showToggle && (
        <button type="button" onClick={() => setShown((s) => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 6, display: 'grid', placeItems: 'center' }} aria-label={shown ? 'Hide password' : 'Show password'}>
          {shown ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
      {right && <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>{right}</span>}
    </label>
  );
}

function AlertBox({ children, tone = 'error' }) {
  const color = tone === 'error' ? '#c55a83' : tone === 'success' ? '#3e8e7e' : '#c48a2b';
  const bg = tone === 'error' ? 'rgba(197,90,131,.10)' : tone === 'success' ? 'rgba(62,142,126,.10)' : 'rgba(196,138,43,.10)';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 12, background: bg, border: `1px solid ${color}33`, color, fontSize: 12.5, lineHeight: 1.5 }}>
      <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{children}</span>
    </div>
  );
}

function PrimaryButton({ children, loading, icon, onClick, type = 'button', disabled }) {
  return (
    <button
      type={type}
      disabled={loading || disabled}
      onClick={onClick}
      style={{
        width: '100%', padding: '14px 20px', borderRadius: 14, border: 'none',
        background: 'linear-gradient(180deg, #d2668f 0%, #b24d76 100%)',
        color: '#fff', fontSize: 14, fontWeight: 600, letterSpacing: .2,
        cursor: loading || disabled ? 'wait' : 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: '0 10px 30px -16px rgba(178,77,118,.6)',
        transition: 'all .15s ease',
        opacity: loading || disabled ? .75 : 1,
      }}
    >
      {loading ? <span className="spinner" style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : icon}
      {children}
    </button>
  );
}

function GoogleButton({ onClick, loading, label }) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      style={{
        width: '100%', padding: '12px 18px', borderRadius: 14,
        background: '#fff', border: '1px solid rgba(90,63,86,.18)',
        color: 'var(--ink)', fontSize: 13.5, fontWeight: 500,
        cursor: loading ? 'wait' : 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        transition: 'all .15s ease',
      }}
    >
      <GoogleLogo />
      {loading ? 'Please wait…' : label}
    </button>
  );
}

export default function AuthPage({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  useEffect(() => { setMode(initialMode); }, [initialMode]);
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const from = location.state?.from?.pathname || '/';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => { setError(''); setSuccess(''); }, [mode]);
  useEffect(() => {
    if (auth.isAuthenticated && mode !== 'forgot') navigate(from, { replace: true });
  }, [auth.isAuthenticated, navigate, from, mode]);

  const handleGoogle = async (demo = false) => {
    setError('');
    setGoogleLoading(true);
    try {
      const payload = demo
        ? { email: email || `demo-${Date.now()}@efu.in`, name: name || 'Google User', _demo: true }
        : { email: email || `demo-${Date.now()}@efu.in`, name: name || 'Google User', _demo: true };
      await auth.loginWithGoogle(payload);
      navigate(from, { replace: true });
    } catch (err) { setError(err.message || 'Google sign-in failed.'); }
    finally { setGoogleLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await auth.login({ email, password });
      navigate(from, { replace: true });
    } catch (err) { setError(err.message || 'Login failed.'); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    try {
      await auth.register({ name, email, password, phone });
      navigate(from, { replace: true });
    } catch (err) { setError(err.message || 'Sign up failed.'); }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const res = await auth.forgotPassword({ email });
      setSuccess(res.message || 'If that email is registered, we sent a reset link.');
    } catch (err) { setError(err.message || 'Could not request reset.'); }
  };

  return (
    <GradientShell>
      <main style={{ display: 'grid', placeItems: 'center', padding: '10px 20px 80px' }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .35, ease: [.22, 1, .36, 1] }}
          style={{ width: '100%', maxWidth: 430 }}
        >
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, margin: '0 auto 12px', background: 'linear-gradient(135deg, #ffafcc, #bde0fe)', display: 'grid', placeItems: 'center', boxShadow: '0 16px 40px -24px rgba(197,90,131,.6)' }}>
              <Sparkles size={22} color="#5a3f56" />
            </div>
            <h1 style={{ margin: '0 0 6px', fontFamily: "'Fraunces', serif", fontSize: 30, color: '#3b2c3f' }}>
              {mode === 'login' ? <>Welcome back <em style={{ fontStyle: 'italic', color: '#c55a83' }}>lovely.</em></>
                : mode === 'signup' ? <>Create your <em style={{ fontStyle: 'italic', color: '#c55a83' }}>little corner.</em></>
                : <>Forgot your <em style={{ fontStyle: 'italic', color: '#c55a83' }}>password?</em></>}
            </h1>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
              {mode === 'login' ? 'Sign in to browse, save and order something handmade just for you.'
                : mode === 'signup' ? 'It only takes a moment. We never spam — only pretty updates, if you want them.'
                : 'Enter your email. We will send you a gentle link to reset it.'}
            </p>
          </div>

          <div style={{ backdropFilter: 'blur(22px)', background: 'rgba(255,255,255,.7)', border: '1px solid rgba(255,255,255,.9)', borderRadius: 26, padding: 30, boxShadow: '0 30px 80px -40px rgba(90,63,86,.35)' }}>
            {mode !== 'forgot' && (
              <div style={{ textAlign: 'center' }}>
                <PillTabs tabs={[['login', 'Sign in'], ['signup', 'Create account']]} mode={mode} setMode={setMode} />
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .2 }}>
                {error && <div style={{ marginBottom: 16 }}><AlertBox>{error}</AlertBox></div>}
                {success && <div style={{ marginBottom: 16 }}><AlertBox tone="success">{success}</AlertBox></div>}

                {mode === 'login' && (
                  <form onSubmit={handleLogin} style={{ display: 'grid', gap: 14 }}>
                    <Field type="email" label="Email address" icon={Mail} value={email} onChange={setEmail} autoComplete="email" />
                    <Field type="password" label="Password" icon={LockKeyhole} value={password} onChange={setPassword} autoComplete="current-password" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: -4, padding: '0 2px' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--muted)', cursor: 'pointer' }}>
                        <input type="checkbox" defaultChecked style={{ accentColor: '#c55a83' }} />
                        Keep me signed in
                      </label>
                      <Link to="/forgot-password" style={{ color: '#c55a83', fontSize: 12.5, textDecoration: 'none', fontWeight: 500 }}>Forgot password?</Link>
                    </div>
                    <PrimaryButton type="submit" loading={auth.loading} icon={<ArrowRight size={16} />}>Sign in</PrimaryButton>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0 2px', color: 'var(--muted)', fontSize: 11 }}>
                      <span style={{ flex: 1, height: 1, background: 'rgba(90,63,86,.12)' }} />OR<span style={{ flex: 1, height: 1, background: 'rgba(90,63,86,.12)' }} />
                    </div>
                    <GoogleButton label="Continue with Google" loading={googleLoading} onClick={() => handleGoogle(true)} />
                    <div style={{ textAlign: 'center', marginTop: 20, padding: 12, borderRadius: 14, background: 'rgba(62,142,126,.06)', border: '1px solid rgba(62,142,126,.12)', fontSize: 12, color: '#3e8e7e', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <ShieldCheck size={14} />
                      <span>Studio admin? <Link to="/admin" style={{ color: '#3e8e7e', fontWeight: 600 }}>Open Studio Desk →</Link></span>
                    </div>
                  </form>
                )}

                {mode === 'signup' && (
                  <form onSubmit={handleRegister} style={{ display: 'grid', gap: 14 }}>
                    <Field label="Full name" icon={Check} value={name} onChange={setName} autoComplete="name" />
                    <Field type="email" label="Email address" icon={Mail} value={email} onChange={setEmail} autoComplete="email" />
                    <Field type="tel" label="Phone (optional)" icon={ShieldCheck} value={phone} onChange={setPhone} autoComplete="tel" required={false} />
                    <Field type="password" label="Password" icon={LockKeyhole} value={password} onChange={setPassword} autoComplete="new-password" />
                    <Field type="password" label="Confirm password" icon={LockKeyhole} value={confirm} onChange={setConfirm} autoComplete="new-password" />
                    <label style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 10, fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
                      <input type="checkbox" required style={{ marginTop: 2, accentColor: '#c55a83' }} />
                      <span>I agree to the <a href="/pages/terms-and-conditions" style={{ color: '#c55a83', textDecoration: 'none' }}>Terms</a> and <a href="/pages/privacy-policy" style={{ color: '#c55a83', textDecoration: 'none' }}>Privacy Policy</a>.</span>
                    </label>
                    <PrimaryButton type="submit" loading={auth.loading} icon={<ArrowRight size={16} />}>Create my account</PrimaryButton>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0 2px', color: 'var(--muted)', fontSize: 11 }}>
                      <span style={{ flex: 1, height: 1, background: 'rgba(90,63,86,.12)' }} />OR<span style={{ flex: 1, height: 1, background: 'rgba(90,63,86,.12)' }} />
                    </div>
                    <GoogleButton label="Sign up with Google" loading={googleLoading} onClick={() => handleGoogle(true)} />
                    <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12.5, color: 'var(--muted)' }}>
                      Already have an account? <button type="button" onClick={() => setMode('login')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: '#c55a83', fontWeight: 600 }}>Sign in instead</button>
                    </div>
                  </form>
                )}

                {mode === 'forgot' && (
                  <form onSubmit={handleForgot} style={{ display: 'grid', gap: 14 }}>
                    <Field type="email" label="Email address" icon={Mail} value={email} onChange={setEmail} autoComplete="email" />
                    <PrimaryButton type="submit" loading={auth.loading} icon={<ArrowRight size={16} />}>Send reset link</PrimaryButton>
                    <div style={{ marginTop: 6, padding: 14, borderRadius: 14, background: 'rgba(90,63,86,.04)', border: '1px solid rgba(90,63,86,.08)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                      <strong style={{ color: '#5a3f56' }}>Tip:</strong> The link expires in 1 hour. If you don&apos;t see the email, check your spam folder — or in development mode, the reset link is printed to the server console.
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 4, fontSize: 12.5, color: 'var(--muted)' }}>
                      <Link to="/login" style={{ color: '#c55a83', textDecoration: 'none', fontWeight: 600 }}>← Back to sign in</Link>
                    </div>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {mode === 'login' && (
            <p style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: 'var(--muted)' }}>
              Don&apos;t have an account? <button onClick={() => setMode('signup')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: '#c55a83', fontWeight: 600 }}>Create one</button>
            </p>
          )}
        </motion.div>
      </main>
    </GradientShell>
  );
}
