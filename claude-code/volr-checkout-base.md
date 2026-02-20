---
name: volr-checkout-base
description: Use when building Volr Checkout integrations — stablecoin payment API setup
---

# Volr Checkout Integration Guide

> Common guide for integrating stablecoin checkout payments via Volr.

## What is Volr Checkout?

Volr Checkout is a server-side API + hosted checkout page for accepting stablecoin payments (USDC, USDT) on EVM chains. You create a checkout via API, redirect your customer to the hosted page, and receive webhook notifications when payment is confirmed.

## Prerequisites

- A Volr account at [dashboard.volr.io](https://dashboard.volr.io)
- A project with Checkout type created
- Server API Key (`volr_server_...`) from your project settings
- A merchant wallet address to receive payments

## Step 1: Install the CLI

```bash
npm install -g @volr/cli
volr auth login
```

## Step 2: Create a Project

```bash
volr project create --type checkout --name "My Store"
```

## Step 3: Install the SDK

```bash
npm install @volr/checkout-sdk
```

## Step 4: Create a Checkout

```typescript
import { VolrCheckout } from '@volr/checkout-sdk';

const volr = new VolrCheckout({
  serverKey: process.env.VOLR_SERVER_KEY!,
});

const checkout = await volr.create({
  chainId: 8453,                // Base
  tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
  merchantAddress: '0xYOUR_WALLET',
  amount: '10000000',           // 10 USDC (6 decimals)
  itemName: 'Product Name',
  referenceId: 'order_123',     // Your internal order ID
  successUrl: 'https://yoursite.com/success',
  cancelUrl: 'https://yoursite.com/cancel',
});

// Redirect customer to checkout
const checkoutUrl = `https://checkout.volr.io/${checkout.id}`;
```

## Step 5: Handle Webhooks

Set your webhook URL in the dashboard or via CLI:

```bash
volr checkout setup
```

Then implement the webhook endpoint:

```typescript
import { VolrCheckout, type WebhookPayload } from '@volr/checkout-sdk';

app.post('/webhook/volr', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-volr-signature'] as string;
  const isValid = await VolrCheckout.verifySignature(
    req.body.toString(),
    signature,
    process.env.VOLR_WEBHOOK_SECRET!,
  );

  if (!isValid) return res.status(401).send('Invalid signature');

  const event: WebhookPayload = JSON.parse(req.body.toString());

  switch (event.event) {
    case 'checkout.paid':
      await fulfillOrder(event.data.referenceId!, event.data.paymentTxHash!);
      break;
    case 'checkout.expired':
      await releaseInventory(event.data.referenceId!);
      break;
  }

  res.status(200).send('OK');
});
```

## Step 6: Verify Setup

```bash
volr checkout doctor      # Check configuration
volr checkout create-test # Create a test checkout on Base Sepolia
```

## Webhook Events

| Event | When |
|-------|------|
| `checkout.paid` | Payment confirmed on-chain |
| `checkout.expired` | Checkout expired without payment |
| `checkout.cancelled` | Checkout was cancelled |
| `checkout.settled` | Funds settled to merchant |
| `checkout.late_paid` | Payment received after expiry |

## Supported Chains & Tokens

| Chain | ID | Tokens |
|-------|-----|--------|
| Base | 8453 | USDC, USDT |
| Polygon | 137 | USDC, USDT |
| Arbitrum | 42161 | USDC |

## Resources

- [API Reference](https://docs.volr.io/checkout-api/api-reference)
- [SDK Reference](https://docs.volr.io/checkout-sdk/intro)
- [Postman Collection](https://docs.volr.io/volr-checkout.postman_collection.json)
