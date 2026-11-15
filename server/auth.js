import 'dotenv/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured in production.');
}
const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString('hex');
const USER_TOKEN_EXPIRY = '7d';
const ADMIN_TOKEN_EXPIRY = '24h';
const PASSWORD_RESET_TTL_HOURS = 1;

const APP_BASE_URL = String(process.env.APP_BASE_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000')).replace(/\/+$/, '');

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

export async function authenticateAdmin(repository, email, password) {
  let admin = admins().find((a) => a.email === email.toLowerCase().trim());
  if (!admin) {
    const account = await repository.getUserByEmail(email, true);
    if (account && account.isActive && ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'].includes(String(account.role).toUpperCase())) {
      admin = { ...account, passwordHash: account.passwordHash, role: String(account.role).toUpperCase() };
    }
  }
  if (!admin) return null;
  const match = await bcrypt.compare(password, admin.passwordHash || '');
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

export function requireOwnerJWT(request, response, next) {
  return requireAdminJWT(request, response, () => {
    if (String(request.admin?.role || '').toUpperCase() !== 'OWNER') {
      return response.status(403).json({ error: 'OWNER_REQUIRED', message: 'Only an owner can manage admin accounts.' });
    }
    return next();
  });
}

export async function createTeamAdmin(repository, { email, password, name, phone }) {
  if (!email || !password || !name || password.length < 10) {
    const error = new Error('Name, email and a password of at least 10 characters are required.');
    error.code = 'INVALID_ADMIN';
    throw error;
  }
  const existing = await repository.getUserByEmail(email);
  if (existing) {
    const error = new Error('An account with this email already exists.');
    error.code = 'EMAIL_TAKEN';
    throw error;
  }
  return repository.createUser({ id: `A-${randomUUID().slice(0, 8).toUpperCase()}`, email: email.trim().toLowerCase(), passwordHash: await bcrypt.hash(password, 12), name: name.trim(), phone: phone || '', role: 'ADMIN' });
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

function verificationCodeHash(email, code) {
  return createHmac('sha256', JWT_SECRET).update(`${email}:${code}`).digest('hex');
}

async function sendVerificationEmail(email, name, code) {
  const transport = buildTransport();
  if (!transport) {
    const error = new Error('Email verification is not configured. Please contact the studio.');
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }
  const safeName = String(name || 'there').replace(/[<>"'&]/g, '');
  await transport.sendMail({
    from: `"Especially For U" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Your Especially For U verification code',
    text: `Hi ${safeName},\n\nYour verification code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.\n\nEspecially For U`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#3b2a4a"><h2>Hi ${safeName} 🌸</h2><p>Use this code to finish creating your Especially For U account:</p><p style="font-size:30px;font-weight:bold;letter-spacing:8px;padding:14px 20px;background:#fff4f8;border-radius:12px;display:inline-block">${code}</p><p>This code expires in 10 minutes. If you did not request it, ignore this email.</p><p>With love,<br/>Especially For U</p></div>`,
  });
}

function authError(message, code) { const error = new Error(message); error.code = code; return error; }

export async function sendRegistrationCode(repository, { email, password, name, phone }, { resend = false } = {}) {
  email = String(email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) throw authError('Enter a valid email address.', 'INVALID_EMAIL');
  let existing = await repository.getEmailVerification(email);
  if (resend) {
    if (!existing) throw authError('Start account creation again to request a new code.', 'VERIFICATION_NOT_FOUND');
    name = existing.name; phone = existing.phone; password = null;
  } else {
    if (!name || !password || String(password).length < 6) throw authError('Name and a password of at least 6 characters are required.', 'INVALID_REGISTRATION');
    if (await repository.getUserByEmail(email)) throw authError('An account with this email already exists.', 'EMAIL_TAKEN');
    if (existing && new Date(existing.lastSentAt).getTime() > Date.now() - 60_000) {
      throw authError('A code was just sent. Please wait a minute before requesting another.', 'OTP_COOLDOWN');
    }
  }
  if (resend && new Date(existing.lastSentAt).getTime() > Date.now() - 60_000) {
    throw authError('Please wait a minute before requesting another code.', 'OTP_COOLDOWN');
  }
  if (resend && Number(existing.attempts || 0) >= 5) {
    await repository.deleteEmailVerification(email);
    throw authError('Too many incorrect attempts. Start account creation again.', 'OTP_ATTEMPTS_EXCEEDED');
  }
  const code = String(randomInt(100000, 1000000));
  const passwordHash = password ? await bcrypt.hash(password, 12) : existing.passwordHash;
  const now = new Date();
  await repository.saveEmailVerification({
    email, name: name.trim(), phone: phone || '', passwordHash,
    codeHash: verificationCodeHash(email, code), attempts: 0,
    expiresAt: new Date(now.getTime() + 10 * 60_000), lastSentAt: now,
  });
  try { await sendVerificationEmail(email, name, code); }
  catch (error) {
    console.error('[email-verification] send failed:', error.message);
    throw authError('We could not send the verification email. Check the email address and try again shortly.', 'EMAIL_SEND_FAILED');
  }
  return { pending: true, message: `We sent a 6-digit code to ${email}. It expires in 10 minutes.` };
}

export async function verifyRegistrationCode(repository, email, code) {
  email = String(email || '').trim().toLowerCase();
  code = String(code || '').trim();
  const pending = await repository.getEmailVerification(email);
  if (!pending) throw authError('That verification code has expired. Start account creation again.', 'OTP_EXPIRED');
  if (new Date(pending.expiresAt).getTime() <= Date.now()) {
    await repository.deleteEmailVerification(email);
    throw authError('That verification code has expired. Start account creation again.', 'OTP_EXPIRED');
  }
  if (Number(pending.attempts || 0) >= 5) {
    await repository.deleteEmailVerification(email);
    throw authError('Too many incorrect attempts. Start account creation again.', 'OTP_ATTEMPTS_EXCEEDED');
  }
  const expected = Buffer.from(pending.codeHash, 'hex');
  const actual = Buffer.from(verificationCodeHash(email, code), 'hex');
  if (!/^\d{6}$/.test(code) || expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    await repository.incrementEmailVerificationAttempts(email);
    throw authError('That code is incorrect. Check the email and try again.', 'INVALID_OTP');
  }
  if (await repository.getUserByEmail(email)) {
    await repository.deleteEmailVerification(email);
    throw authError('An account with this email already exists. Please sign in.', 'EMAIL_TAKEN');
  }
  const user = await repository.createUser({
    id: `U-${randomUUID().slice(0, 8).toUpperCase()}`,
    email, passwordHash: pending.passwordHash, name: pending.name,
    phone: pending.phone || '', role: 'USER',
  });
  await repository.deleteEmailVerification(email);
  return { token: signUserToken(user), user: sanitizeUser(user) };
}

export async function registerAdmin(repository, { email, password, name, phone, adminPassword }) {
  const expected = process.env.ADMIN_SIGNUP_PASSWORD;
  if (!expected || !adminPassword || adminPassword !== expected) {
    const e = new Error('Invalid admin signup password.');
    e.code = 'INVALID_ADMIN_PASSWORD';
    throw e;
  }
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
    role: 'admin',
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
  if (['OWNER', 'ADMIN', 'MANAGER', 'STAFF'].includes(String(user.role || '').toUpperCase())) return null;
  if (!user.passwordHash) return null;
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return null;
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

  const transport = buildTransport();
  if (!transport) {
    const error = new Error('Password reset email delivery is not configured.');
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }
  if (!APP_BASE_URL) {
    const error = new Error('APP_BASE_URL must be configured to the live website URL in production.');
    error.code = 'APP_BASE_URL_NOT_CONFIGURED';
    throw error;
  }

  const rawToken = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_HOURS * 60 * 60 * 1000);
  await repository.createPasswordResetToken(user.id, rawToken, expiresAt);

  const resetLink = `${APP_BASE_URL}/reset-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(email)}`;
  try {
    await transport.sendMail({
      from: process.env.GMAIL_USER,
      to: user.email,
      subject: 'Reset your Especially For U password',
      text: `Hi ${user.name},\n\nClick below to reset your password (valid for ${PASSWORD_RESET_TTL_HOURS} hour):\n${resetLink}\n\nIf you did not request this, simply ignore this email. Nothing was changed.\n\nWith love,\nEspecially For U`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;"><h2 style="font-family:'Fraunces',serif;color:#5a3f56;">Hi ${user.name} 🌸</h2><p>Click below to reset your password. This link is valid for <strong>${PASSWORD_RESET_TTL_HOURS} hour</strong>.</p><p style="margin:24px 0;"><a href="${resetLink}" style="display:inline-block;padding:12px 22px;background:#c55a83;color:#fff;border-radius:12px;text-decoration:none;">Reset my password</a></p><p style="color:#888;font-size:12px;">If you did not request this, simply ignore this email. Nothing was changed.</p><p style="color:#c55a83;font-family:'Fraunces',serif;">With love, Especially For U</p></div>`,
    });
  } catch (err) {
    try { await repository.consumePasswordResetToken(rawToken); } catch { /* Preserve the email delivery error. */ }
    console.error('[reset-email] send failed:', err.message);
    const error = new Error('Password reset email could not be sent.');
    error.code = 'EMAIL_SEND_FAILED';
    throw error;
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
    passwordResetProvider: buildTransport() ? 'gmail' : 'console-fallback',
  };
}
