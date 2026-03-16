# Volr Checkout Integration

You are helping the user add stablecoin payments to their app using Volr Checkout.
Follow this guide step by step. Do not skip ahead.

## Step 1: Setup

Run `npx volr next --json` and follow the response.

The response is `{ "ok": true, "data": { "currentStep": ..., "nextAction": ..., "progress": ... } }`.

Loop:
1. Run `npx volr next --json`
2. Read `data.nextAction` from the response:
   - `ask_user`: Ask the user the question. Present options if provided. Items marked `recommended: true` should be highlighted with the reason. Always offer "I'm not sure, explain more" as an option. After the user answers, run the `command_template` with their input.
   - `open_browser`: Tell the user a browser will open. Run the `command` and wait for it to complete.
   - `run_command`: Run the `command` directly.
   - `error`: Show the error message. If `recovery_command` is provided, run it.
   - `done`: Setup is complete. Move to Step 2.
3. Repeat until `done`.

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

### If project has a backend (Next.js, Express, NestJS, etc.)

Write both server-side and client-side code:

**Server-side — Create checkout endpoint:**

```typescript
import VolrCheckout from '@volr/checkout-sdk';

const volr = new VolrCheckout(process.env.VOLR_SERVER_KEY);

const checkout = await volr.create({
  fiatAmount: '25.00',
  fiatCurrency: 'USD',
  itemName: 'Product Name',
  successUrl: 'https://yoursite.com/success',
  cancelUrl: 'https://yoursite.com/cancel',
});

// Return checkout.id to the frontend
```

**Server-side — Webhook handler:**

```typescript
app.post('/webhook/volr', async (req, res) => {
  const isValid = VolrCheckout.verifySignature(
    req.body,
    req.headers['x-volr-signature'],
    process.env.VOLR_WEBHOOK_SECRET,
  );

  if (!isValid) return res.status(401).send('Invalid signature');

  const event = JSON.parse(req.body);

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
window.location.href = `https://checkout.volr.io/c/${checkoutId}`;
```

### If project is frontend-only

Create a guide file for the backend team:

```markdown
<!-- Save as VOLR_BACKEND_GUIDE.md in the project root -->

# Volr Backend Setup Guide

Your backend needs two endpoints to accept crypto payments via Volr.

## 1. POST /api/create-checkout

Creates a payment session. Install `@volr/checkout-sdk`, initialize with `VOLR_SERVER_KEY` from `.env`, call `volr.create()` with amount and redirect URLs, return the checkout ID.

## 2. POST /webhook/volr

Receives payment confirmations. Verify signature with `VolrCheckout.verifySignature()`, handle `checkout.paid` to fulfill orders.

See https://docs.volr.io for full reference.
```

Then write the frontend code that calls the backend endpoint and redirects.

## Step 3: Verify

After writing the code, suggest running a test checkout:

```bash
npx volr checkout create-test
```

This creates a $1 test checkout to verify the integration works end-to-end.

## Rules

- **Off-ramp**: Volr does not convert crypto to fiat currency. If the user asks about cashing out stablecoins:
  - Korean-speaking users: Mention Upbit, Binance as options
  - English-speaking users: Mention Coinbase, Binance as options (do NOT mention Upbit)
- **Language**: Always respond in the user's language. CLI output is English — translate naturally.
- **Explain when confused**: If the user seems unfamiliar with crypto concepts, explain simply without jargon. Always be patient.
- **Never hardcode tokens/chains**: Always get available options from `npx volr next --json`.
- **Server key security**: `VOLR_SERVER_KEY` must be in `.env` and never committed to git.

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
