<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/banner-dark.png">
  <source media="(prefers-color-scheme: light)" srcset=".github/banner-light.png">
  <img alt="Volr Skills" src=".github/banner-light.png" width="100%">
</picture>

<p align="center">
  <a href="https://www.npmjs.com/package/@volr/checkout-sdk"><img src="https://img.shields.io/npm/v/@volr/checkout-sdk?style=flat-square&color=111827&label=SDK" alt="npm"></a>
  <a href="https://docs.volr.io"><img src="https://img.shields.io/badge/docs-volr.io-111827?style=flat-square" alt="docs"></a>
  <a href="https://github.com/volr-io/volr-skills/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-111827?style=flat-square" alt="license"></a>
</p>

---

<h3 align="center">Paste this into your AI coding assistant:</h3>

```
Add crypto checkout to my app using github.com/volr-io/volr-skills
```

<p align="center">That's it. Your AI handles the rest — setup, wallet, tokens, and code.</p>

## What Is This?

**Volr Skills** is a single context file that teaches any AI coding assistant how to integrate [Volr Checkout](https://volr.io) — stablecoin payments on Base and BNB Chain. From zero to working checkout, guided entirely by AI.

## Quick Start

Copy [`volr.md`](./volr.md) into your AI assistant's context:

| IDE | Destination |
|-----|-------------|
| **Claude Code** | `.claude/skills/volr.md` |
| **Cursor** | `.cursor/rules/volr.md` |
| **Codex** | Copy contents into `AGENTS.md` |
| **Windsurf** | Copy contents into `.windsurfrules` |
| **Any other AI** | Add as context / system prompt |

Then prompt your AI:

> *"Add crypto checkout to my app using github.com/volr-io/volr-skills"*

Your AI will walk you through everything:

1. **Login** — email + OTP
2. **Wallet** — connect existing or create one with Face ID / Touch ID
3. **Tokens** — pick which stablecoins to accept (with recommendations)
4. **Code** — write the integration for your stack

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

## Supported Chains

| Chain | Tokens |
|-------|--------|
| **Base** | USDC |
| **BNB Chain** | USDT |

## Links

- [Volr Dashboard](https://dashboard.volr.io)
- [Documentation](https://docs.volr.io)
- [Checkout SDK](https://www.npmjs.com/package/@volr/checkout-sdk)
- [Volr CLI](https://www.npmjs.com/package/create-volr)

## License

[MIT](./LICENSE)
