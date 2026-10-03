import nodemailer from 'nodemailer';

const MAX_TITLE = 1200;
const MAX_CONTENT = 20000;

// ── Gmail transporter ──────────────────────────────────────────────────
let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (process.env.EMAIL_PROVIDER !== 'gmail') return null;
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  return transporter;
}

// ── Config (safe for health endpoint) ──────────────────────────────────
export function notificationConfig() {
  return {
    enabled: process.env.NOTIFICATIONS_ENABLED === 'true',
    recipientConfigured: Boolean(process.env.ORDER_NOTIFICATION_EMAIL),
    provider: process.env.EMAIL_PROVIDER || 'placeholder',
    gmailConfigured: Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
  };
}

// ── Format order details as HTML ───────────────────────────────────────
function formatOrderHTML(order) {
  const items = (order.pricing?.lineItems || [])
    .map((item) => `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${item.productName}</td><td style="padding:8px;border-bottom:1px solid #eee;">×${item.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">₹${item.lineTotal}</td></tr>`)
    .join('');

  return `
    <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#FFFBFE;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#FFAFCC 0%,#BDE0FE 100%);padding:32px 24px;text-align:center;">
        <h1 style="margin:0;color:#3B2A4A;font-size:24px;">✦ New Order Received!</h1>
        <p style="margin:8px 0 0;color:#6B5B7B;font-size:14px;">Especially For U · Studio Desk</p>
      </div>
      <div style="padding:24px;">
        <table style="width:100%;margin-bottom:16px;">
          <tr><td style="color:#6B5B7B;padding:4px 0;">Order ID</td><td style="font-weight:700;color:#3B2A4A;">${order.id}</td></tr>
          <tr><td style="color:#6B5B7B;padding:4px 0;">Customer</td><td style="color:#3B2A4A;">${order.customer?.name || 'N/A'}</td></tr>
          <tr><td style="color:#6B5B7B;padding:4px 0;">Phone</td><td style="color:#3B2A4A;">${order.customer?.phone || 'N/A'}</td></tr>
          <tr><td style="color:#6B5B7B;padding:4px 0;">Email</td><td style="color:#3B2A4A;">${order.customer?.email || 'N/A'}</td></tr>
          <tr><td style="color:#6B5B7B;padding:4px 0;">Delivery</td><td style="color:#3B2A4A;">${order.delivery?.area || 'N/A'} · ${order.delivery?.method || ''}</td></tr>
          <tr><td style="color:#6B5B7B;padding:4px 0;">Payment Plan</td><td style="color:#3B2A4A;">${order.pricing?.paymentPlan || 'N/A'}</td></tr>
        </table>
        ${items ? `<table style="width:100%;border-collapse:collapse;margin:16px 0;"><thead><tr style="background:#f8f4fc;"><th style="padding:8px;text-align:left;color:#6B5B7B;">Item</th><th style="padding:8px;color:#6B5B7B;">Qty</th><th style="padding:8px;text-align:right;color:#6B5B7B;">Amount</th></tr></thead><tbody>${items}</tbody></table>` : ''}
        <div style="background:#f8f4fc;border-radius:12px;padding:16px;margin-top:16px;">
          <table style="width:100%;">
            <tr><td style="color:#6B5B7B;">Subtotal</td><td style="text-align:right;color:#3B2A4A;">₹${order.pricing?.subtotal || 0}</td></tr>
            <tr><td style="color:#6B5B7B;">Delivery</td><td style="text-align:right;color:#3B2A4A;">₹${order.pricing?.deliveryFee || 0}</td></tr>
            ${order.pricing?.giftWrapFee ? `<tr><td style="color:#6B5B7B;">Gift Wrap</td><td style="text-align:right;color:#3B2A4A;">₹${order.pricing.giftWrapFee}</td></tr>` : ''}
            <tr><td style="font-weight:700;color:#3B2A4A;padding-top:8px;border-top:1px solid #ddd;">Total</td><td style="font-weight:700;text-align:right;color:#3B2A4A;padding-top:8px;border-top:1px solid #ddd;">₹${order.pricing?.total || 0}</td></tr>
            ${order.pricing?.advanceDue > 0 ? `<tr><td style="color:#C55A83;">Advance Due</td><td style="text-align:right;color:#C55A83;font-weight:700;">₹${order.pricing.advanceDue}</td></tr>` : ''}
          </table>
        </div>
        ${order.gift?.isGift ? `<div style="margin-top:16px;padding:12px;background:#fff5f8;border-radius:10px;"><strong style="color:#C55A83;">🎁 Gift Order</strong><p style="margin:4px 0 0;color:#6B5B7B;font-size:13px;">To: ${order.gift.recipientName || 'N/A'}${order.gift.message ? ` · "${order.gift.message}"` : ''}</p></div>` : ''}
        ${order.pricing?.locationApproval === 'PENDING' ? `<div style="margin-top:12px;padding:12px;background:#FFF3CD;border-radius:10px;color:#856404;font-size:13px;">⚠️ Manual location approval required</div>` : ''}
      </div>
      <div style="background:#f8f4fc;padding:16px;text-align:center;color:#6B5B7B;font-size:12px;">
        Especially For U · Muradnagar · heychosenforu@gmail.com
      </div>
    </div>
  `;
}

// ── Format custom request as HTML ──────────────────────────────────────
function formatCustomRequestHTML(request) {
  return `
    <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#FFFBFE;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#E8C8D8 0%,#BDE0FE 100%);padding:32px 24px;text-align:center;">
        <h1 style="margin:0;color:#3B2A4A;font-size:24px;">✦ New Custom Request!</h1>
        <p style="margin:8px 0 0;color:#6B5B7B;font-size:14px;">Someone wants something special</p>
      </div>
      <div style="padding:24px;">
        <h2 style="color:#3B2A4A;margin:0 0 16px;">${request.title}</h2>
        <table style="width:100%;margin-bottom:16px;">
          <tr><td style="color:#6B5B7B;padding:4px 0;">Request ID</td><td style="font-weight:700;color:#3B2A4A;">${request.id}</td></tr>
          <tr><td style="color:#6B5B7B;padding:4px 0;">Customer</td><td style="color:#3B2A4A;">${request.customer?.name || 'N/A'}</td></tr>
          <tr><td style="color:#6B5B7B;padding:4px 0;">Phone</td><td style="color:#3B2A4A;">${request.customer?.phone || 'N/A'}</td></tr>
          <tr><td style="color:#6B5B7B;padding:4px 0;">Email</td><td style="color:#3B2A4A;">${request.customer?.email || 'N/A'}</td></tr>
          ${request.productName ? `<tr><td style="color:#6B5B7B;padding:4px 0;">Linked Product</td><td style="color:#3B2A4A;">${request.productName}</td></tr>` : ''}
          ${request.budget ? `<tr><td style="color:#6B5B7B;padding:4px 0;">Budget</td><td style="color:#3B2A4A;">${request.budget}</td></tr>` : ''}
          ${request.neededBy ? `<tr><td style="color:#6B5B7B;padding:4px 0;">Needed By</td><td style="color:#3B2A4A;">${request.neededBy}</td></tr>` : ''}
          ${request.occasion ? `<tr><td style="color:#6B5B7B;padding:4px 0;">Occasion</td><td style="color:#3B2A4A;">${request.occasion}</td></tr>` : ''}
        </table>
        <div style="background:#f8f4fc;border-radius:12px;padding:16px;">
          <strong style="color:#6B5B7B;font-size:12px;">DESCRIPTION</strong>
          <p style="color:#3B2A4A;margin:8px 0 0;line-height:1.6;">${request.description}</p>
        </div>
      </div>
      <div style="background:#f8f4fc;padding:16px;text-align:center;color:#6B5B7B;font-size:12px;">
        Especially For U · Muradnagar · heychosenforu@gmail.com
      </div>
    </div>
  `;
}

// ── Send email via Gmail ───────────────────────────────────────────────
async function sendGmail({ to, subject, html }) {
  const transport = getTransporter();
  if (!transport) throw new Error('Gmail transporter not configured');

  const result = await transport.sendMail({
    from: `"Especially For U" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });

  return { messageId: result.messageId, accepted: result.accepted };
}

// ── Notify new order ───────────────────────────────────────────────────
export async function notifyNewOrder(order) {
  const config = notificationConfig();
  const subject = `New order ${order.id} · ₹${order.pricing?.total || 0} · ${order.customer?.name || 'Customer'}`;

  if (!config.enabled) {
    return { status: 'disabled', message: 'Notifications are disabled. Set NOTIFICATIONS_ENABLED=true in .env' };
  }

  const recipient = process.env.ORDER_NOTIFICATION_EMAIL;
  if (!recipient) {
    return { status: 'no-recipient', message: 'Set ORDER_NOTIFICATION_EMAIL in .env' };
  }

  // Gmail path
  if (config.provider === 'gmail' && config.gmailConfigured) {
    try {
      const result = await sendGmail({
        to: recipient,
        subject: subject.slice(0, MAX_TITLE),
        html: formatOrderHTML(order),
      });
      return { status: 'sent', provider: 'gmail', messageId: result.messageId };
    } catch (error) {
      console.error('[notification-error] Gmail send failed:', error.message);
      return { status: 'failed', provider: 'gmail', message: error.message };
    }
  }

  // Legacy Manus owner notification path
  if (process.env.MANUS_API_URL && process.env.MANUS_API_KEY && config.provider === 'manus-owner') {
    const content = [
      `New order ${order.id}`,
      `Customer: ${order.customer?.name} · ${order.customer?.phone}`,
      `Total: ₹${order.pricing?.total}`,
      `Payment plan: ${order.pricing?.paymentPlan}`,
      `Delivery: ${order.delivery?.area} · ${order.delivery?.method}`,
    ].join('\n');

    const response = await fetch(`${process.env.MANUS_API_URL}/webdevtoken.v1.WebDevService/SendNotification`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MANUS_API_KEY}`,
        'Content-Type': 'application/json',
        'connect-protocol-version': '1',
      },
      body: JSON.stringify({ title: subject.slice(0, MAX_TITLE), content: content.slice(0, MAX_CONTENT) }),
    });
    if (!response.ok) throw new Error(`Owner notification failed with ${response.status}`);
    return { status: 'accepted', provider: 'manus-owner' };
  }

  return { status: 'no-provider', message: 'Recipient configured but no email provider is active.' };
}

// ── Notify new custom request ──────────────────────────────────────────
export async function notifyNewCustomRequest(request) {
  const config = notificationConfig();
  if (!config.enabled || !config.gmailConfigured || config.provider !== 'gmail') {
    return { status: 'skipped' };
  }

  const recipient = process.env.ORDER_NOTIFICATION_EMAIL;
  if (!recipient) return { status: 'no-recipient' };

  try {
    const result = await sendGmail({
      to: recipient,
      subject: `Custom request ${request.id} · ${request.title} · ${request.customer?.name || 'Customer'}`,
      html: formatCustomRequestHTML(request),
    });
    return { status: 'sent', provider: 'gmail', messageId: result.messageId };
  } catch (error) {
    console.error('[notification-error] Gmail custom request notification failed:', error.message);
    return { status: 'failed', provider: 'gmail', message: error.message };
  }
}

// ── Send customer order confirmation ───────────────────────────────────
export async function sendOrderConfirmation(order) {
  const config = notificationConfig();
  if (!config.gmailConfigured || config.provider !== 'gmail') return { status: 'skipped' };

  const customerEmail = order.customer?.email;
  if (!customerEmail) return { status: 'no-email' };

  try {
    const result = await sendGmail({
      to: customerEmail,
      subject: `Your Especially For U order ${order.id} is confirmed! ✦`,
      html: `
        <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#FFFBFE;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#FFAFCC 0%,#BDE0FE 100%);padding:32px 24px;text-align:center;">
            <h1 style="margin:0;color:#3B2A4A;font-size:24px;">Thank you, ${order.customer.name}! ✦</h1>
            <p style="margin:8px 0 0;color:#6B5B7B;font-size:14px;">Your order is being crafted with love</p>
          </div>
          <div style="padding:24px;">
            <p style="color:#3B2A4A;line-height:1.6;">We've received your order <strong>${order.id}</strong> and we're getting started on it!</p>
            <div style="background:#f8f4fc;border-radius:12px;padding:16px;margin:16px 0;">
              <table style="width:100%;">
                <tr><td style="color:#6B5B7B;">Order Total</td><td style="text-align:right;font-weight:700;color:#3B2A4A;">₹${order.pricing?.total || 0}</td></tr>
                ${order.pricing?.advanceDue > 0 ? `<tr><td style="color:#6B5B7B;">Advance Paid</td><td style="text-align:right;color:#3B2A4A;">₹${order.pricing.advanceDue}</td></tr><tr><td style="color:#6B5B7B;">Balance Due</td><td style="text-align:right;color:#C55A83;">₹${order.pricing.balanceDue}</td></tr>` : ''}
                <tr><td style="color:#6B5B7B;">Delivery</td><td style="text-align:right;color:#3B2A4A;">${order.delivery?.area || 'Muradnagar'}</td></tr>
              </table>
            </div>
            <p style="color:#6B5B7B;font-size:13px;">We'll keep you updated on WhatsApp. For questions, reach us at heychosenforu@gmail.com</p>
          </div>
          <div style="background:#f8f4fc;padding:16px;text-align:center;color:#6B5B7B;font-size:12px;">
            Especially For U · Muradnagar · Made with love ♡
          </div>
        </div>
      `,
    });
    return { status: 'sent', messageId: result.messageId };
  } catch (error) {
    console.error('[notification-error] Customer confirmation failed:', error.message);
    return { status: 'failed', message: error.message };
  }
}
