<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/banner-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset=".github/banner-light.svg">
  <img alt="Volr Skills" src=".github/banner-light.svg" width="100%">
</picture>

<p align="center">
  <a href="https://www.npmjs.com/package/@volr/checkout-sdk"><img src="https://img.shields.io/npm/v/@volr/checkout-sdk?style=flat-square&color=111827&label=SDK" alt="npm"></a>
  <a href="https://docs.volr.io"><img src="https://img.shields.io/badge/docs-volr.io-111827?style=flat-square" alt="docs"></a>
  <a href="https://github.com/volr-io/volr-skills/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-111827?style=flat-square" alt="license"></a>
</p>

---

**Volr Skills** are pre-built context files that give AI coding assistants everything they need to integrate [Volr Checkout](https://volr.io) — stablecoin payments on Base, Polygon, and Arbitrum.

Drop a single file into your project and your AI assistant instantly knows how to create checkouts, handle webhooks, poll payment status, and build the complete payment flow.

## How It Works

```
Your Server                    Volr                         Customer
    │                           │                              │
    │  POST /v1/checkouts       │                              │
    │  (fiatAmount, successUrl) │                              │
    ├──────────────────────────►│                              │
    │                           │                              │
    │  { id: "ck_abc123" }     │                              │
    │◄──────────────────────────┤                              │
    │                           │                              │
    │          Redirect to checkout.volr.io/c/ck_abc123        │
    │─────────────────────────────────────────────────────────►│
    │                           │                              │
    │                           │    Select token, pay via     │
    │                           │    QR scan or wallet connect │
    │                           │◄─────────────────────────────┤
    │                           │                              │
    │  Webhook: checkout.paid   │                              │
    │◄──────────────────────────┤    Redirect to successUrl    │
    │                           │─────────────────────────────►│
    │                           │                              │
    │  Fulfill order            │                              │
    ├──────────────────────────►│                              │
```

## Quick Start

### Automatic (via CLI)

```bash
npx @volr/cli skill install
```

The CLI detects your IDE and installs the correct format.

### Manual

Pick the file for your IDE and copy it into your project:

| IDE | File | Destination |
|-----|------|-------------|
| **Claude Code** | [`claude-code/volr-checkout.md`](./claude-code/volr-checkout.md) | `.claude/skills/volr-checkout.md` |
| **Cursor** | [`cursor/volr-checkout.mdc`](./cursor/volr-checkout.mdc) | `.cursor/rules/volr-checkout.mdc` |
| **Codex** | [`codex/AGENTS.md`](./codex/AGENTS.md) | `AGENTS.md` (project root) |
| **Windsurf** | [`windsurf/.windsurfrules`](./windsurf/.windsurfrules) | `.windsurfrules` (project root) |

Then just ask your AI:

> *"Add Volr Checkout to accept payments for my product"*

## What Your AI Learns

The skill teaches your AI assistant the complete payment integration:

```typescript
// 1. Create a checkout
const checkout = await volr.create({
  fiatAmount: '25.00',
  fiatCurrency: 'USD',
  itemName: 'Premium Plan',
  itemImageUrl: 'https://yoursite.com/product.jpg',
  successUrl: 'https://yoursite.com/success',
  referenceId: 'order_123',
});

// 2. Redirect customer
window.location.href = `https://checkout.volr.io/c/${checkout.id}`;
```

```typescript
// 3. Handle webhook on your server
app.post('/webhook/volr', async (req, res) => {
  const isValid = await VolrCheckout.verifySignature(
    req.body.toString(),
    req.headers['x-volr-signature'],
    process.env.VOLR_WEBHOOK_SECRET!,
  );

  if (event.event === 'checkout.paid') {
    await fulfillOrder(event.data.referenceId);
  }

  res.status(200).send('OK');
});
```

### Full Coverage

| Topic | Included |
|-------|----------|
| Checkout creation (fiat & token pricing) | Yes |
| All API parameters with descriptions | Yes |
| Frontend payment status polling | Yes |
| Webhook handling + signature verification | Yes |
| Status lifecycle (PENDING → PAID → SETTLED) | Yes |
| Checkout page features (token selection, QR, wallet) | Yes |
| Full Next.js integration example | Yes |
| Supported chains & tokens reference | Yes |

## Repository Structure

```
volr-skills/
├── core/                    # Canonical skill (IDE-agnostic)
│   └── volr-checkout.md
├── claude-code/             # Claude Code format
│   └── volr-checkout.md
├── cursor/                  # Cursor rules format (.mdc)
│   └── volr-checkout.mdc
├── codex/                   # OpenAI Codex format
│   └── AGENTS.md
└── windsurf/                # Windsurf rules format
    └── .windsurfrules
```

All formats contain the same content — pick the one that matches your IDE.

## Supported Chains

| Chain | Tokens |
|-------|--------|
| **Base** | USDC, USDT |
| **Polygon** | USDC, USDT |
| **Arbitrum** | USDC |

## Links

- [Volr Dashboard](https://dashboard.volr.io) — Create your project
- [Documentation](https://docs.volr.io) — Full API & SDK reference
- [Checkout SDK](https://www.npmjs.com/package/@volr/checkout-sdk) — npm package
- [Volr CLI](https://www.npmjs.com/package/@volr/cli) — CLI tool

## License

[MIT](./LICENSE)
