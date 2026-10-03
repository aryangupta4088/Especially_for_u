import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Check, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';

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

function Field({ type = 'text', value, onChange, label, icon: Icon, autoComplete, required = true }) {
  return (
    <label style={{ position: 'relative', display: 'block' }}>
      {Icon && <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}><Icon size={16} /></span>}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder=" "
        style={{
          width: '100%',
          padding: `${Icon ? '18px 20px 10px 42px' : '18px 16px 10px 16px'}`,
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
    </label>
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
      {loading ? <span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : icon}
      {children}
    </button>
  );
}

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const email = params.get('email') || '';
  const auth = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const valid = Boolean(token);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(false);
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    try {
      await auth.resetPassword({ token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2200);
    } catch (err) { setError(err.message || 'Could not reset password.'); }
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at top left, rgba(255,175,204,.35), transparent 50%), radial-gradient(ellipse at bottom right, rgba(189,224,254,.35), transparent 50%)' }} />
      <div style={{ position: 'relative', zIndex: 1, padding: '22px 28px' }}>
        <Link to="/login" style={{ textDecoration: 'none', color: 'var(--ink)', fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600 }}>
          Especially<em style={{ fontStyle: 'italic', fontWeight: 500 }}>For U</em><i style={{ fontStyle: 'normal', color: '#c55a83' }}>✦</i>
        </Link>
      </div>
      <main style={{ position: 'relative', zIndex: 1, display: 'grid', placeItems: 'center', padding: '10px 20px 80px' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }} style={{ width: '100%', maxWidth: 430 }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, margin: '0 auto 12px', background: 'linear-gradient(135deg, #ffafcc, #bde0fe)', display: 'grid', placeItems: 'center', boxShadow: '0 16px 40px -24px rgba(197,90,131,.6)' }}>
              <LockKeyhole size={22} color="#5a3f56" />
            </div>
            <h1 style={{ margin: '0 0 6px', fontFamily: "'Fraunces', serif", fontSize: 28, color: '#3b2c3f' }}>
              {success ? <>All done <em style={{ fontStyle: 'italic', color: '#3e8e7e' }}>lovely.</em></>
                : <>Set a <em style={{ fontStyle: 'italic', color: '#c55a83' }}>new password.</em></>}
            </h1>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
              {success ? 'Signing you in shortly…'
                : valid ? 'Use something you can remember but that no one else will guess.'
                : 'This link looks incomplete — please request a fresh one.'}
            </p>
            {email && (
              <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, background: 'rgba(62,142,126,.08)', color: '#3e8e7e', fontSize: 12, border: '1px solid rgba(62,142,126,.15)' }}>
                <Mail size={13} /> {email}
              </div>
            )}
          </div>

          <div style={{ backdropFilter: 'blur(22px)', background: 'rgba(255,255,255,.7)', border: '1px solid rgba(255,255,255,.9)', borderRadius: 26, padding: 30, boxShadow: '0 30px 80px -40px rgba(90,63,86,.35)' }}>
            {error && <div style={{ marginBottom: 16 }}><AlertBox>{error}</AlertBox></div>}
            {success && (
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, background: 'rgba(62,142,126,.10)', border: '1px solid rgba(62,142,126,.18)', color: '#3e8e7e', fontSize: 13 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#3e8e7e', color: '#fff', display: 'grid', placeItems: 'center' }}><Check size={16} /></div>
                <div><strong>Password reset complete.</strong><div style={{ fontSize: 12, opacity: .85 }}>Taking you back to sign in…</div></div>
              </div>
            )}
            {!success && valid && (
              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
                <Field type="password" label="New password" icon={LockKeyhole} value={password} onChange={setPassword} autoComplete="new-password" />
                <Field type="password" label="Confirm new password" icon={LockKeyhole} value={confirm} onChange={setConfirm} autoComplete="new-password" />
                <div style={{ padding: 12, borderRadius: 14, background: 'rgba(90,63,86,.04)', border: '1px solid rgba(90,63,86,.08)', fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={14} style={{ color: '#5a3f56', flexShrink: 0 }} />
                  We&apos;ll never ask you for this via email or WhatsApp.
                </div>
                <PrimaryButton type="submit" loading={auth.loading} icon={<ArrowRight size={16} />}>Save new password</PrimaryButton>
              </form>
            )}
            {!valid && !success && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(196,138,43,.10)', border: '1px solid rgba(196,138,43,.18)', color: '#c48a2b', fontSize: 12.5, marginBottom: 18, textAlign: 'left', display: 'flex', gap: 10 }}>
                  <Sparkles size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>The token in this URL is missing. Please use the complete link from your email or request a new one.</span>
                </div>
                <Link to="/forgot-password" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#c55a83', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
                  <ArrowLeft size={14} /> Request a new reset link
                </Link>
              </div>
            )}
            {success && (
              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#c55a83', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
                  <ArrowLeft size={14} /> Take me to sign in
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
