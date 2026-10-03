import Razorpay from 'razorpay';
import crypto from 'node:crypto';

// ── Razorpay instance ──────────────────────────────────────────────────
let instance;

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  if (process.env.RAZORPAY_KEY_ID === 'rzp_test_REPLACE_ME') return null;
  if (!instance) {
    instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return instance;
}

// ── Config info (safe for health endpoint) ─────────────────────────────
export function paymentConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  return {
    configured: Boolean(getRazorpay()),
    testMode: keyId.startsWith('rzp_test_'),
    keyId: keyId.startsWith('rzp_') ? keyId : '',
  };
}

// ── Create Razorpay order ──────────────────────────────────────────────
export async function createRazorpayOrder({ amount, currency = 'INR', receipt, notes = {} }) {
  const rz = getRazorpay();
  if (!rz) {
    return {
      status: 'mock',
      message: 'Razorpay not configured. Order created in mock payment mode.',
      mockOrderId: `mock_order_${Date.now()}`,
      amount,
      currency,
    };
  }

  const order = await rz.orders.create({
    amount: amount * 100, // Razorpay uses paise
    currency,
    receipt,
    notes,
  });

  return {
    status: 'created',
    razorpayOrderId: order.id,
    amount: order.amount / 100,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  };
}

// ── Verify Razorpay payment signature ──────────────────────────────────
export function verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const rz = getRazorpay();
  if (!rz) {
    // In mock mode, always accept
    return { verified: true, mock: true };
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const verified = expectedSignature === razorpay_signature;
  return { verified, mock: false };
}

// ── Verify Razorpay webhook signature ──────────────────────────────────
export function verifyWebhookSignature(body, signature) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
}

// ── Fetch payment details ──────────────────────────────────────────────
export async function fetchPayment(paymentId) {
  const rz = getRazorpay();
  if (!rz) return null;
  return rz.payments.fetch(paymentId);
}
