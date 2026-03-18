# Volr Checkout Integration

You are helping the user add stablecoin payments to their app using Volr Checkout.
Follow this guide step by step. Do not skip ahead.

## Step 1: Setup

Run `npx volr next --json` and follow the response.

The response is `{ "ok": true, "data": { "currentStep": ..., "nextAction": ..., "progress": ... } }`.

**IMPORTANT: Never run `npx volr auth login` without `--email` flag. Never run CLI commands that are not provided by `command_template` in the response. Only run commands that `nextAction` tells you to run.**

Loop:
1. Run `npx volr next --json`
2. Read `data.nextAction.type` from the response:
   - `ask_user`: Ask the user the question in `nextAction.question`. Present options if provided. Items marked `recommended: true` should be highlighted with the reason. Always offer "I'm not sure, explain more" as an option. After the user answers, substitute their answer into `command_template` and run it.
   - `open_browser`: Tell the user a browser will open for this step. Run the `command` field (e.g., `npx volr wallet setup`) and wait for it to complete. The command opens the browser and polls until the step is done.
   - `run_command`: Run the `command` directly.
   - `error`: Show the error message. If `recovery_command` is provided, run it.
   - `done`: Setup is complete. Move to Step 2.
3. Repeat until `done`.

### Authentication

The auth flow has two steps:
1. `npx volr next --json` returns `ask_user` with question "What is your email address?" → run `npx volr auth login --email "{email}"` (this sends an OTP code to the email)
2. Ask the user for the 6-digit OTP code they received → run `npx volr auth verify --email "{email}" --otp "{code}"`
3. Run `npx volr next --json` again to proceed to the next step

### Wallet Connection

Before running the wallet step, ask:

> "Who will manage the payment funds — you, or someone else (like a finance team)?"

- **"Me"**: Proceed with wallet connection normally. If the user doesn't have a wallet, a Passkey wallet can be created instantly with Face ID / Touch ID in the browser.
- **"Someone else"**: Offer two options:
  1. Set up with your own wallet now, transfer recipient later (run `npx volr wallet transfer` after setup completes)
  2. Have them run `npx volr init` directly
- **"Not sure"**: Explain that a wallet is like a bank account for receiving crypto payments. It can be created in seconds and changed later.

### Token Selection

When presenting token options from `--next`:
- Highlight recommended tokens with the reason provided
- Explain in the user's language what each token/chain is if they seem unfamiliar
- Always include "I don't know, explain more" as an option
- Never hardcode token or chain lists — always use what the API returns

## Step 2: Integration Code

After setup is complete, detect the user's project type:
- Check for `package.json`, `next.config.*`, `nuxt.config.*`, `tsconfig.json`, etc.
- Check for existing server-side code (API routes, Express, Fastify, NestJS, etc.)

There are three cases:

1. **Fullstack project** (Next.js, Nuxt, Remix, etc. with API routes) → Write server + client code directly
2. **Frontend repo with separate backend** (React/Vue/Svelte + backend in another repo) → Create `VOLR_BACKEND_GUIDE.md` for the backend team + write frontend code
3. **Static site with no backend at all** (HTML, Astro static, etc.) → Ask the user: "Volr needs a server to create checkouts securely. Want me to add a simple server (e.g., Express)?" If yes, create a minimal server. If no, create the backend guide.

**Important:** The server key (`VOLR_SERVER_KEY`) must NEVER be exposed to the browser. A server-side endpoint is required for creating checkouts. This is not optional — it's a security requirement.

### Product Image (itemImageUrl)

The checkout page displays a product thumbnail. An empty thumbnail looks unprofessional to customers. Before writing the checkout code:

1. **Look for an existing image** in the project — check for logos, product images, or OG images in `public/`, `static/`, `assets/`, or referenced in HTML meta tags.
2. **If found**, use its public URL as `itemImageUrl`.
3. **If not found**, ask the user: "The checkout page shows a product image to customers. Do you have an image URL to use? If not, I can leave it blank for now and you can add one later."

Always set `itemImageUrl` when a suitable image is available. Do not silently skip it.

### Case 1: Fullstack project (has server-side capabilities)

Write both server-side and client-side code:

**Server-side — Create checkout endpoint:**

```typescript
import { VolrCheckout } from '@volr/checkout-sdk';

const volr = new VolrCheckout({ serverKey: process.env.VOLR_SERVER_KEY! });

const checkout = await volr.create({
  fiatAmount: '25.00',
  fiatCurrency: 'USD',
  itemName: 'Product Name',
  itemImageUrl: 'https://yoursite.com/product.png', // Product thumbnail shown on checkout page
  successUrl: 'https://yoursite.com/success',
  cancelUrl: 'https://yoursite.com/cancel',
});

// Redirect customer to checkout.checkoutUrl
```

**Server-side — Webhook handler:**

```typescript
app.post('/webhook/volr', async (req, res) => {
  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const isValid = await VolrCheckout.verifySignature(
    body,
    req.headers['x-volr-signature'] as string,
    process.env.VOLR_WEBHOOK_SECRET!,
  );

  if (!isValid) return res.status(401).send('Invalid signature');

  const event = JSON.parse(body);

  switch (event.event) {
    case 'checkout.paid':
      await fulfillOrder(event.data.referenceId);
      break;
    case 'checkout.expired':
      // No payment received — release inventory
      break;
  }

  res.status(200).send('OK');
});
```

**Client-side — Redirect to checkout:**

```typescript
window.location.href = checkout.checkoutUrl;
```

### Case 2: Frontend repo with separate backend

The frontend and backend are in different repos/projects. Create a guide for the backend team and write the frontend code.

**Create `VOLR_BACKEND_GUIDE.md` in the project root:**

```markdown
# Volr Checkout — Backend Integration Guide

Your backend needs two endpoints to accept crypto payments via Volr.

## Setup

npm install @volr/checkout-sdk

Add `VOLR_SERVER_KEY` and `VOLR_WEBHOOK_SECRET` to your environment variables.
Get these from your volr.json / .env file or the Volr Dashboard.

## 1. POST /api/create-checkout

Creates a payment session. Returns a checkout ID for the frontend to redirect to.

import { VolrCheckout } from '@volr/checkout-sdk';
const volr = new VolrCheckout({ serverKey: process.env.VOLR_SERVER_KEY! });

const checkout = await volr.create({
  fiatAmount: req.body.amount,
  fiatCurrency: 'USD',
  itemName: req.body.itemName,
  successUrl: 'https://yoursite.com/success',
  cancelUrl: 'https://yoursite.com/cancel',
  referenceId: req.body.orderId,
});

res.json({ checkoutId: checkout.id });

## 2. POST /webhook/volr

Receives payment confirmations from Volr. Verify the signature, then fulfill the order.

const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
const isValid = await VolrCheckout.verifySignature(
  body, req.headers['x-volr-signature'], process.env.VOLR_WEBHOOK_SECRET!
);

if (isValid && event.event === 'checkout.paid') {
  await fulfillOrder(event.data.referenceId);
}

## Reference

Full docs: https://docs.volr.io
SDK: https://www.npmjs.com/package/@volr/checkout-sdk
```

Then write the frontend code that calls the backend's `/api/create-checkout` endpoint and redirects to `https://checkout.volr.io/c/${checkoutId}`.

### Case 3: Static site with no backend

Ask the user:

> "Volr needs a server-side endpoint to create checkouts securely (the server key can't be exposed in the browser). Want me to add a simple Express server to your project?"

**If yes:** Create a minimal `server.js` with Express:
- `POST /api/create-checkout` — creates checkout via SDK
- `POST /webhook/volr` — handles payment webhooks
- Add `@volr/checkout-sdk` and `express` to dependencies
- Add start script to package.json

**If no:** Create `VOLR_BACKEND_GUIDE.md` (same as Case 2) and explain that a backend is needed before the integration can work in production.

## Step 3: Done

After writing the code, tell the user:

> "Integration complete! Run your app and test the checkout flow. You can view payment history and manage settings on your dashboard: https://dashboard.volr.io"

## Rules

- **Off-ramp**: Volr does not convert crypto to fiat currency. If the user asks about cashing out stablecoins:
  - Korean-speaking users: Mention Upbit, Binance as options
  - English-speaking users: Mention Coinbase, Binance as options (do NOT mention Upbit)
- **Language**: Always respond in the user's language. CLI output is English — translate naturally.
- **Explain when confused**: If the user seems unfamiliar with crypto concepts, explain simply without jargon. Always be patient.
- **Never hardcode tokens/chains**: Always get available options from `npx volr next --json`.
- **Server key security**: `VOLR_SERVER_KEY` must be in `.env` and never committed to git.
- **localhost URLs not supported**: The Volr API rejects `http://localhost:*` for `successUrl` and `cancelUrl`. For local development, either omit these fields (the checkout page will show a "return to merchant" button instead of auto-redirecting) or use a tunnel service (ngrok, cloudflare tunnel) to get an HTTPS URL.
- **Checkout URL**: Use `checkout.checkoutUrl` from the SDK response to redirect customers
- **verifySignature is async**: Always `await` the result. Without `await`, the Promise object is truthy and signature verification is bypassed. This is a security issue.

## Checkout Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fiatAmount` | string | Yes* | Amount in fiat (e.g., "25.00") |
| `fiatCurrency` | string | Yes* | Currency code (e.g., "USD") |
| `amount` | string | Yes* | Token amount in smallest unit |
| `itemName` | string | No | Product name shown on checkout page |
| `itemDescription` | string | No | Product description |
| `itemImageUrl` | string | No | Product image URL |
| `referenceId` | string | No | Your internal order ID |
| `successUrl` | string | No | Redirect after successful payment |
| `cancelUrl` | string | No | Redirect on cancel |
| `expiryMinutes` | number | No | Checkout expiration (default: 30) |
| `customerEmail` | string | No | Pre-fill customer email |
| `metadata` | object | No | Arbitrary key-value data |
| `amountMode` | string | No | FIXED, MINIMUM, or OPEN |

*Either `fiatAmount` + `fiatCurrency` OR `amount` is required.

## Webhook Events

| Event | When | Action |
|-------|------|--------|
| `checkout.paid` | Payment confirmed on-chain | Fulfill the order |
| `checkout.expired` | No payment before expiry | Release inventory |
| `checkout.late_paid` | Payment received after expiry | Flag for manual review |
| `checkout.settled` | Funds arrived in merchant wallet | Update accounting |
| `checkout.cancelled` | Merchant cancelled checkout | Clean up |

## Checkout Status Flow

```
PENDING → DETECTED → PAID → SETTLED
                  ↘ EXPIRED
                  ↘ LATE_PAID
                  ↘ CANCELLED → REFUNDED
```

## Resources

- Documentation: https://docs.volr.io
- Dashboard: https://dashboard.volr.io
- SDK: https://www.npmjs.com/package/@volr/checkout-sdk
- CLI: https://www.npmjs.com/package/create-volr
