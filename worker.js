/**
 * Cloudflare Worker — Shey Carpenter Vintage
 * Handles POST /square-charge, serves static assets for everything else.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── Square charge endpoint ──────────────────────────────────
    if (url.pathname === '/square-charge') {

      // CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }

      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
      }

      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      };

      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ success: false, error: 'Invalid request body' }), { status: 400, headers });
      }

      const { sourceId, amount, currency = 'USD', buyerEmail, buyerName, items = [], shippingAddress = {} } = body;

      if (!sourceId || !amount) {
        return new Response(JSON.stringify({ success: false, error: 'Missing sourceId or amount' }), { status: 400, headers });
      }

      const baseUrl = env.SQUARE_ENVIRONMENT === 'production'
        ? 'https://connect.squareup.com'
        : 'https://connect.squareupsandbox.com';

      const squareRes = await fetch(`${baseUrl}/v2/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'Square-Version': '2024-01-17',
        },
        body: JSON.stringify({
          source_id: sourceId,
          idempotency_key: crypto.randomUUID(),
          amount_money: {
            amount: Math.round(parseFloat(amount) * 100),
            currency,
          },
          buyer_email_address: buyerEmail || undefined,
          note: buyerName ? `Order for ${buyerName}` : 'Shey Carpenter Vintage',
        }),
      });

      const data = await squareRes.json();

      if (data.payment?.status === 'COMPLETED') {
        // Send confirmation email to customer
        if (buyerEmail) {
          const itemRows = items.map(i =>
            `<tr>
               <td style="padding:8px 0;font-family:'Georgia',serif;font-size:15px;color:#3a3530;border-bottom:1px solid #e8e2da;">${i.name}${i.size ? ' &middot; ' + i.size : ''}</td>
               <td style="padding:8px 0;font-family:'Georgia',serif;font-size:15px;color:#3a3530;border-bottom:1px solid #e8e2da;text-align:right;">$${parseFloat(i.price).toFixed(2)}</td>
             </tr>`
          ).join('');

          const addr = [shippingAddress.street, shippingAddress.city, shippingAddress.state, shippingAddress.zip].filter(Boolean).join(', ');

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'She Found Us <shey@shefound.us>',
              to: buyerEmail,
              subject: 'Your She Found Us Order',
              html: `
                <div style="max-width:560px;margin:0 auto;font-family:'Georgia',serif;color:#3a3530;background:#faf7f4;padding:40px 32px;">
                  <h1 style="font-family:'Georgia',serif;font-weight:400;font-size:28px;margin:0 0 4px;">She Found Us</h1>
                  <p style="font-size:13px;letter-spacing:0.1em;text-transform:uppercase;color:#9a8e84;margin:0 0 32px;">Order Confirmation</p>

                  <p style="font-size:16px;line-height:1.7;margin:0 0 24px;">Hi ${buyerName || 'there'},<br>Thank you for your order. We'll be in touch shortly with shipping details.</p>

                  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
                    ${itemRows}
                    <tr>
                      <td style="padding:12px 0;font-family:'Georgia',serif;font-size:15px;font-weight:bold;">Total</td>
                      <td style="padding:12px 0;font-family:'Georgia',serif;font-size:15px;font-weight:bold;text-align:right;">$${parseFloat(amount).toFixed(2)}</td>
                    </tr>
                  </table>

                  ${addr ? `<p style="font-size:14px;color:#9a8e84;margin:0 0 32px;">Shipping to: ${addr}</p>` : ''}

                  <p style="font-size:13px;color:#9a8e84;border-top:1px solid #e8e2da;padding-top:24px;margin:0;">Questions? Reply to this email or visit <a href="https://shefound.us" style="color:#3a3530;">shefound.us</a></p>
                </div>
              `,
            }),
          });
        }

        return new Response(JSON.stringify({ success: true, paymentId: data.payment.id }), { headers });
      }

      const err0 = data.errors?.[0];
      const errorMsg = [err0?.category, err0?.code, err0?.detail].filter(Boolean).join(' — ') || 'Payment failed';
      return new Response(JSON.stringify({ success: false, error: errorMsg, env: env.SQUARE_ENVIRONMENT || 'not-set' }), { status: 400, headers });
    }

    // ── Contact / booking form endpoint ────────────────────────
    if (url.pathname === '/contact') {

      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }

      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
      }

      const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ success: false, error: 'Invalid request body' }), { status: 400, headers });
      }

      const { first_name, last_name, email, service, format, message } = body;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'She Found Us <noreply@shefound.us>',
          to: 'shey@shefound.us',
          reply_to: email,
          subject: `New Booking Inquiry — ${first_name} ${last_name}`,
          html: `
            <h2>New Booking Inquiry</h2>
            <p><strong>Name:</strong> ${first_name} ${last_name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Service:</strong> ${service || '—'}</p>
            <p><strong>Format:</strong> ${format || '—'}</p>
            <p><strong>Message:</strong><br>${message || '—'}</p>
          `,
        }),
      });

      if (res.ok) {
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      const err = await res.json();
      const errMsg = err.message || err.name || JSON.stringify(err);
      return new Response(JSON.stringify({ success: false, error: errMsg, status: res.status }), { status: 500, headers });
    }

    // ── Everything else → static assets ────────────────────────
    return env.ASSETS.fetch(request);
  },
};
