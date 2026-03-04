# Volr Checkout Integration Guide

> Complete guide for integrating stablecoin payments via Volr Checkout.

## What is Volr Checkout?

Volr Checkout is a hosted checkout page + server-side API for accepting stablecoin payments (USDC, USDT) on EVM chains. You create a checkout session via API, redirect your customer to the hosted page, and get notified via webhook when payment is confirmed.

## Prerequisites

- A Volr project at [dashboard.volr.io](https://dashboard.volr.io)
- Server API Key (`volr_server_...`) from project settings
- Webhook URL configured in project settings (for payment notifications)

## How It Works

```
1. Your server creates a checkout (POST /v1/checkouts)
2. Redirect customer to https://checkout.volr.io/c/{checkoutId}
3. Customer selects token & chain, then pays via QR or wallet
4. Volr detects payment on-chain, confirms it
5. Your server receives a webhook (checkout.paid)
6. Customer is redirected back to your successUrl
```

Key: You do NOT specify chain or token when creating a checkout. The customer chooses which token and chain to pay with on the checkout page. Volr handles token selection, exchange rate, and deposit address generation.

## Step 1: Install

```bash
npm install @volr/checkout-sdk
```

## Step 2: Create a Checkout

```typescript
import { VolrCheckout } from '@volr/checkout-sdk';

const volr = new VolrCheckout({
  serverKey: process.env.VOLR_SERVER_KEY!,
});

const checkout = await volr.create({
  fiatAmount: '25.00',
  fiatCurrency: 'USD',
  itemName: 'Premium Plan',
  referenceId: 'order_123',           // Your internal order ID
  successUrl: 'https://yoursite.com/success?orderId=order_123',
  cancelUrl: 'https://yoursite.com/cancel',
  expiryMinutes: 30,                  // 5-1440 minutes
  // Optional:
  // itemDescription: 'Monthly subscription',
  // itemImageUrl: 'https://yoursite.com/product.jpg',
  // customerEmail: 'buyer@example.com',
  // customerName: 'John Doe',
  // metadata: { orderId: 'order_123', plan: 'premium' },
});

// Redirect customer to the checkout page
const checkoutUrl = `https://checkout.volr.io/c/${checkout.id}`;
```

### Create Checkout Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `fiatAmount` | Yes* | Price in fiat (e.g., "25.00") |
| `fiatCurrency` | Yes* | Currency code: "USD", "KRW", "EUR", etc. |
| `amount` | Yes* | OR: token amount in smallest unit (e.g., "25000000" for 25 USDC) |
| `amountMode` | No | `FIXED` (default) or `MINIMUM` |
| `itemName` | No | Product name shown on checkout page |
| `itemDescription` | No | Product description |
| `itemImageUrl` | No | Product image URL (shown as thumbnail on checkout) |
| `referenceId` | No | Your internal order/reference ID |
| `successUrl` | No | Redirect URL after payment |
| `cancelUrl` | No | Redirect URL on cancel |
| `expiryMinutes` | No | Expiry time, 5-1440 min (default: 30) |
| `customerEmail` | No | Customer email for receipts |
| `customerName` | No | Customer name |
| `metadata` | No | Arbitrary JSON for your own use |

*Either `fiatAmount` + `fiatCurrency` OR `amount` must be provided.

## Step 3: Handle Payment Completion on Your Frontend

After the customer pays, they are redirected to your `successUrl`. But **do not trust the redirect alone** — always verify via webhook on your server.

To show real-time payment status on your frontend:

```typescript
// Poll checkout status from your server
const pollCheckoutStatus = async (checkoutId: string) => {
  const interval = setInterval(async () => {
    const res = await fetch(`/api/checkout-status/${checkoutId}`);
    const checkout = await res.json();

    if (checkout.status === 'PAID' || checkout.status === 'SETTLED') {
      clearInterval(interval);
      showSuccessUI(checkout);
    } else if (checkout.status === 'EXPIRED' || checkout.status === 'CANCELLED') {
      clearInterval(interval);
      showFailureUI(checkout);
    }
  }, 5000); // Poll every 5 seconds
};
```

Your server proxies the status check:

```typescript
// Server-side: proxy checkout status
app.get('/api/checkout-status/:id', async (req, res) => {
  const checkout = await volr.get(req.params.id);
  res.json({ status: checkout.status, paidAmount: checkout.paidAmount });
});
```

## Step 4: Handle Webhooks (Server-Side)

Webhooks are the **primary** way to confirm payment. Never rely solely on redirects or polling.

```typescript
import { VolrCheckout, type WebhookPayload } from '@volr/checkout-sdk';

app.post('/webhook/volr', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-volr-signature'] as string;
  const payload = req.body.toString();

  // 1. Always verify signature
  const isValid = await VolrCheckout.verifySignature(
    payload,
    signature,
    process.env.VOLR_WEBHOOK_SECRET!,
  );

  if (!isValid) return res.status(401).send('Invalid signature');

  // 2. Handle the event
  const event: WebhookPayload = JSON.parse(payload);

  switch (event.event) {
    case 'checkout.paid':
      // Payment confirmed — fulfill the order
      await fulfillOrder(event.data.referenceId!, event.data);
      break;
    case 'checkout.expired':
      // No payment received — release any held inventory
      await handleExpired(event.data.referenceId!);
      break;
    case 'checkout.late_paid':
      // Payment arrived after expiry — review manually
      await flagForReview(event.data.referenceId!, event.data);
      break;
    case 'checkout.settled':
      // Funds settled to merchant wallet
      await markSettled(event.data.referenceId!);
      break;
  }

  // 3. Return 200 quickly — process asynchronously if needed
  res.status(200).send('OK');
});
```

### Webhook Events

| Event | When | Action |
|-------|------|--------|
| `checkout.paid` | Payment confirmed on-chain | Fulfill order, send confirmation |
| `checkout.expired` | Checkout expired | Release held inventory |
| `checkout.cancelled` | Merchant cancelled | Clean up |
| `checkout.settled` | Funds in merchant wallet | Update accounting |
| `checkout.late_paid` | Payment after expiry | Flag for manual review |

### Webhook Retry Policy

| Attempt | Delay |
|---------|-------|
| 1st | Immediate |
| 2nd | 1 minute |
| 3rd | 5 minutes |
| 4th | 15 minutes |

Each attempt has a 5-second timeout. Always return 200 quickly.

## Checkout Statuses

```
PENDING → DETECTED → PAID → SETTLED
                  ↘ LATE_PAID
PENDING → EXPIRED
PENDING → CANCELLED
PAID → REFUNDED
```

| Status | Meaning |
|--------|---------|
| `PENDING` | Waiting for payment |
| `DETECTED` | Payment seen on-chain, confirming (~10s) |
| `PAID` | Payment confirmed |
| `SETTLED` | Funds sent to merchant wallet |
| `EXPIRED` | No payment before deadline |
| `LATE_PAID` | Payment arrived after expiry |
| `CANCELLED` | Cancelled by merchant |
| `REFUNDED` | Refund processed |

## Checkout Page Features

The hosted checkout page (`checkout.volr.io/c/{id}`) handles:

- **Token selection** — Customer picks which stablecoin and chain to pay with
- **QR code** — Scannable payment address
- **Wallet connect** — Pay directly from browser wallet (MetaMask, etc.)
- **Auto-detection** — Monitors blockchain for incoming payment
- **Manual verification** — Customer can paste tx hash if auto-detection fails
- **Multi-language** — EN, KO, JA, ES (auto-detected from browser)
- **Product display** — Shows `itemName`, `itemDescription`, `itemImageUrl` if provided

## Supported Chains & Tokens

| Chain | Chain ID | Tokens |
|-------|----------|--------|
| Base | 8453 | USDC, USDT |
| Polygon | 137 | USDC, USDT |
| Arbitrum | 42161 | USDC |

## Full Integration Example (Next.js)

```typescript
// app/api/create-checkout/route.ts
import { VolrCheckout } from '@volr/checkout-sdk';

const volr = new VolrCheckout({ serverKey: process.env.VOLR_SERVER_KEY! });

export async function POST(req: Request) {
  const { orderId, amount, productName, imageUrl } = await req.json();

  const checkout = await volr.create({
    fiatAmount: amount,
    fiatCurrency: 'USD',
    itemName: productName,
    itemImageUrl: imageUrl,
    referenceId: orderId,
    successUrl: `${process.env.NEXT_PUBLIC_URL}/orders/${orderId}?paid=true`,
    cancelUrl: `${process.env.NEXT_PUBLIC_URL}/orders/${orderId}`,
    expiryMinutes: 30,
  });

  return Response.json({ checkoutUrl: `https://checkout.volr.io/c/${checkout.id}` });
}
```

```typescript
// app/api/webhook/volr/route.ts
import { VolrCheckout, type WebhookPayload } from '@volr/checkout-sdk';

export async function POST(req: Request) {
  const signature = req.headers.get('x-volr-signature')!;
  const body = await req.text();

  const isValid = await VolrCheckout.verifySignature(
    body, signature, process.env.VOLR_WEBHOOK_SECRET!,
  );
  if (!isValid) return new Response('Invalid', { status: 401 });

  const event: WebhookPayload = JSON.parse(body);

  if (event.event === 'checkout.paid') {
    await db.order.update({
      where: { id: event.data.referenceId! },
      data: {
        status: 'PAID',
        txHash: event.data.paymentTxHash,
        paidAt: new Date(event.data.paidAt!),
      },
    });
  }

  return new Response('OK');
}
```

```tsx
// app/orders/[id]/page.tsx — Show payment status
'use client';

export default function OrderPage({ params, searchParams }) {
  const [order, setOrder] = useState(null);

  useEffect(() => {
    // Poll for status updates after redirect
    if (searchParams.paid) {
      const interval = setInterval(async () => {
        const res = await fetch(`/api/orders/${params.id}`);
        const data = await res.json();
        setOrder(data);
        if (data.status === 'PAID') clearInterval(interval);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <div>
      {order?.status === 'PAID' ? (
        <div>Payment confirmed! Thank you.</div>
      ) : (
        <div>Confirming your payment...</div>
      )}
    </div>
  );
}
```

## Resources

- [SDK Docs](https://docs.volr.io/checkout-sdk/intro)
- [API Reference](https://docs.volr.io/checkout-api/api-reference)
- [Webhook Reference](https://docs.volr.io/checkout-sdk/webhooks)
