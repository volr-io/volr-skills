# Volr Checkout — Fandom & K-Culture Integration

> Specialized guide for fan commerce, K-pop merchandise, event tickets, and digital collectibles.

## Use Case

Global fans purchasing K-culture merchandise, concert tickets, fan meeting passes, and digital goods. Stablecoin payments eliminate cross-border payment friction — no FX fees, no card declines for international fans.

## Why Stablecoin Checkout for Fandom?

- **Global reach**: Fans in 100+ countries pay without card restrictions
- **No chargebacks**: Blockchain finality protects sellers
- **Instant settlement**: No 30-day payment processor holds
- **Low fees**: ~0.5% vs 3-5% card processing + FX
- **Fan-friendly**: QR scan from any crypto wallet

## Integration Pattern

### 1. Project Setup

```bash
volr project create --type checkout --name "K-Star Shop"
volr checkout setup
```

### 2. Ticket / Merch Checkout

```typescript
const checkout = await volr.create({
  chainId: 8453,
  tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  merchantAddress: process.env.MERCHANT_WALLET!,
  fiatAmount: '45.00',
  fiatCurrency: 'USD',
  itemName: 'BTS World Tour 2026 - General Admission',
  itemDescription: 'Seoul Olympic Stadium, March 15, 2026',
  itemImageUrl: 'https://yourcdn.com/ticket-image.jpg',
  referenceId: `ticket_${ticketId}`,
  expiryMinutes: 15,  // Shorter expiry for limited inventory
  metadata: {
    eventId: 'bts-world-tour-2026',
    seatSection: 'GA',
    fanId: user.id,
  },
});
```

### 3. Webhook — Ticket Fulfillment

```typescript
case 'checkout.paid':
  const { referenceId, metadata } = event.data;
  await reserveTicket(referenceId!, metadata!.seatSection as string);
  await sendTicketEmail(event.data.customerEmail!, referenceId!);
  break;
case 'checkout.expired':
  await releaseTicketHold(event.data.referenceId!);
  break;
```

## Fandom-Specific Tips

- **Short expiry** (10-15 min): High-demand items sell out; don't hold inventory too long
- **itemImageUrl**: Show the actual merch/ticket photo in the checkout — increases conversion
- **metadata**: Store event/section/seat info for post-purchase fulfillment
- **Multi-currency**: Use `fiatAmount` + `fiatCurrency` so fans see prices in their local currency
- **Refund policy**: Use `CANCELLATION` refund type with strict time windows for event tickets

## Supported Languages

Volr Checkout supports EN/KO/JA/ES — covering the primary K-culture fan markets. Pass `?lang=ko` to the checkout URL for Korean fans.

## Resources

- [Base guide](./volr-checkout-base.md)
- [API Reference](https://docs.volr.io/checkout-api/api-reference)
