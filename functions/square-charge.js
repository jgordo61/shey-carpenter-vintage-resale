/**
 * Cloudflare Pages Function — Square Charge
 * Route: POST /square-charge
 *
 * Environment variables to set in Cloudflare Pages dashboard:
 *   SQUARE_ACCESS_TOKEN  — your Square secret access token
 *   SQUARE_ENVIRONMENT   — "sandbox" or "production"
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers so the browser can call this from the same domain
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

  const { sourceId, amount, currency = 'USD', buyerEmail, buyerName } = body;

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
        amount: Math.round(parseFloat(amount) * 100), // convert dollars → cents
        currency,
      },
      buyer_email_address: buyerEmail || undefined,
      note: buyerName ? `Order for ${buyerName}` : 'Shey Carpenter Vintage',
    }),
  });

  const data = await squareRes.json();

  if (data.payment?.status === 'COMPLETED') {
    return new Response(JSON.stringify({ success: true, paymentId: data.payment.id }), { headers });
  }

  const errorMsg = data.errors?.[0]?.detail || 'Payment failed';
  return new Response(JSON.stringify({ success: false, error: errorMsg }), { status: 400, headers });
}

// Handle preflight CORS requests
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
