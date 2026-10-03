import 'dotenv/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { randomBytes, randomUUID } from 'node:crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'efu-fallback-dev-secret';
const USER_TOKEN_EXPIRY = '7d';
const ADMIN_TOKEN_EXPIRY = '24h';
const PASSWORD_RESET_TTL_HOURS = 1;

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173';

let cachedAdmins;
function getAdminAccounts() {
  const admins = [];
  for (let i = 1; i <= 5; i++) {
    const email = process.env[`ADMIN_${i}_EMAIL`];
    const password = process.env[`ADMIN_${i}_PASSWORD`];
    const name = process.env[`ADMIN_${i}_NAME`] || `Admin ${i}`;
    if (email && password) {
      admins.push({
        id: `admin-${i}`,
        email: email.toLowerCase().trim(),
        passwordHash: bcrypt.hashSync(password, 10),
        name,
        role: 'OWNER',
      });
    }
  }
  return admins;
}
function admins() {
  if (!cachedAdmins) cachedAdmins = getAdminAccounts();
  return cachedAdmins;
}

export async function authenticateAdmin(email, password) {
  const admin = admins().find((a) => a.email === email.toLowerCase().trim());
  if (!admin) return null;
  const match = await bcrypt.compare(password, admin.passwordHash);
  if (!match) return null;
  const token = jwt.sign(
    { sub: admin.id, email: admin.email, name: admin.name, role: admin.role, type: 'admin' },
    JWT_SECRET,
    { expiresIn: ADMIN_TOKEN_EXPIRY }
  );
  return { token, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } };
}

export function requireAdminJWT(request, response, next) {
  const header = request.headers.authorization;
  if (process.env.ADMIN_API_TOKEN && header) {
    const legacyToken = header.replace(/^Bearer\s+/i, '');
    if (legacyToken === process.env.ADMIN_API_TOKEN) {
      request.admin = { id: 'legacy-token', email: 'token-auth', name: 'Token Auth', role: 'OWNER' };
      return next();
    }
  }
  if (!header || !header.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'UNAUTHORIZED', message: 'Admin authentication is required.' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== 'admin') throw new Error('wrong token type');
    request.admin = payload;
    return next();
  } catch {
    return response.status(401).json({ error: 'TOKEN_EXPIRED', message: 'Session expired. Please log in again.' });
  }
}

function signUserToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'USER',
      type: 'user',
      avatarUrl: user.avatarUrl || null,
    },
    JWT_SECRET,
    { expiresIn: USER_TOKEN_EXPIRY }
  );
}
function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function registerUser(repository, { email, password, name, phone }) {
  const existing = await repository.getUserByEmail(email);
  if (existing) {
    const e = new Error('An account with this email already exists.');
    e.code = 'EMAIL_TAKEN';
    throw e;
  }
  const passwordHash = password ? await bcrypt.hash(password, 12) : null;
  const user = await repository.createUser({
    id: `U-${randomUUID().slice(0, 8).toUpperCase()}`,
    email,
    passwordHash,
    name,
    phone: phone || '',
    role: 'USER',
  });
  return { token: signUserToken(user), user: sanitizeUser(user) };
}

export async function authenticateUser(repository, email, password) {
  const user = await repository.getUserByEmail(email, true);
  if (!user) return null;
  if (!user.isActive) {
    const e = new Error('This account has been disabled.');
    e.code = 'ACCOUNT_DISABLED';
    throw e;
  }
  if (!user.passwordHash) return null;
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return null;
  return { token: signUserToken(user), user: sanitizeUser(user) };
}

export async function authenticateGoogle(repository, { googleId, email, name, avatarUrl }) {
  let user = await repository.getUserByGoogleId(googleId);
  if (!user && email) {
    user = await repository.getUserByEmail(email);
    if (user) {
      await repository.updateUser(user.id, { googleId });
    }
  }
  if (!user) {
    user = await repository.createUser({
      id: `U-${randomUUID().slice(0, 8).toUpperCase()}`,
      email: email || `${googleId}@google.local`,
      passwordHash: null,
      name: name || 'Google User',
      phone: '',
      googleId,
      avatarUrl: avatarUrl || null,
      role: 'USER',
    });
  }
  return { token: signUserToken(user), user: sanitizeUser(user) };
}

export function requireUserJWT(request, response, next) {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'UNAUTHORIZED', message: 'Please log in to continue.' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== 'user') throw new Error('wrong token type');
    request.user = payload;
    return next();
  } catch {
    return response.status(401).json({ error: 'TOKEN_EXPIRED', message: 'Session expired. Please log in again.' });
  }
}

export function optionalUserJWT(request, _response, next) {
  const header = request.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload.type === 'user') request.user = payload;
    } catch { /* ignore */ }
  }
  next();
}

function buildTransport() {
  try {
    if (process.env.EMAIL_PROVIDER === 'gmail' && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && !process.env.GMAIL_APP_PASSWORD.includes('REPLACE_ME')) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      });
    }
  } catch { /* ignore */ }
  return null;
}

export async function generatePasswordResetToken(repository, email) {
  const user = await repository.getUserByEmail(email);
  if (!user) {
    return { sent: true, message: 'If that email belongs to an account, a reset link was sent.' };
  }
  const rawToken = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_HOURS * 60 * 60 * 1000);
  try {
    await repository.createPasswordResetToken(user.id, rawToken, expiresAt);
  } catch { /* duplicate token (rare); ignore and fall through */ }

  const resetLink = `${APP_BASE_URL}/reset-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(email)}`;

  const transport = buildTransport();
  let sent = false;
  if (transport) {
    try {
      await transport.sendMail({
        from: process.env.GMAIL_USER,
        to: user.email,
        subject: 'Reset your Especially For U password',
        text: `Hi ${user.name},\n\nClick the link to reset your password (valid for ${PASSWORD_RESET_TTL_HOURS} hour):\n${resetLink}\n\nIf you did not request this, simply ignore this email.\n\nWith love,\nEspecially For U`,
        html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;"><h2 style="font-family:'Fraunces',serif;color:#5a3f56;">Hi ${user.name} 🌸</h2><p>Click below to reset your password. This link is valid for <strong>${PASSWORD_RESET_TTL_HOURS} hour</strong>.</p><p style="margin:24px 0;"><a href="${resetLink}" style="display:inline-block;padding:12px 22px;background:#c55a83;color:#fff;border-radius:12px;text-decoration:none;">Reset my password</a></p><p style="color:#888;font-size:12px;">If you did not request this, simply ignore this email. Nothing was changed.</p><p style="color:#c55a83;font-family:'Fraunces',serif;">With love, Especially For U</p></div>`,
      });
      sent = true;
    } catch (err) {
      console.error('[reset-email] send failed:', err.message);
      sent = false;
    }
  }

  if (!sent) {
    console.log('\n========================================');
    console.log('[DEV FALLBACK] Password Reset Link:');
    console.log(`  User   : ${user.email}`);
    console.log(`  Link   : ${resetLink}`);
    console.log(`  (raw token = ${rawToken})`);
    console.log('========================================\n');
  }

  return { sent: true, message: 'If that email belongs to an account, a reset link was sent.' };
}

export async function resetPasswordWithToken(repository, rawToken, newPassword) {
  const entry = await repository.findPasswordResetToken(rawToken);
  if (!entry) {
    const e = new Error('This reset link is invalid or has already been used.');
    e.code = 'INVALID_TOKEN';
    throw e;
  }
  if (entry.usedAt) {
    const e = new Error('This reset link has already been used.');
    e.code = 'TOKEN_USED';
    throw e;
  }
  if (new Date(entry.expiresAt) < new Date()) {
    const e = new Error('This reset link has expired. Please request a new one.');
    e.code = 'TOKEN_EXPIRED';
    throw e;
  }
  const consumed = await repository.consumePasswordResetToken(rawToken);
  if (!consumed) {
    const e = new Error('This reset link has already been used.');
    e.code = 'TOKEN_USED';
    throw e;
  }
  const newHash = await bcrypt.hash(newPassword, 12);
  await repository.updatePassword(entry.userId, newHash);
  return { ok: true };
}

export function authConfig() {
  return {
    adminCount: admins().length,
    jwtConfigured: Boolean(process.env.JWT_SECRET),
    userAuth: true,
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    passwordResetProvider: buildTransport() ? 'gmail' : 'console-fallback',
  };
}
