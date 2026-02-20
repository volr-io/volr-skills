---
name: volr-sellers
description: Use for e-commerce seller integrations — marketplace payments with Volr Checkout
---

# Volr Checkout — Global Sellers Integration

> Specialized guide for e-commerce, marketplace sellers, and cross-border commerce.

## Use Case

Online sellers accepting stablecoin payments for physical and digital goods. Eliminates payment processor restrictions, reduces fees, and enables instant global payments.

## Why Stablecoin Checkout for Sellers?

- **No merchant account required**: Start accepting payments in minutes
- **Global payments**: Accept from any country without regional restrictions
- **Lower fees**: ~0.5% vs 2.9% + $0.30 per transaction
- **No chargebacks**: Blockchain transactions are final
- **Instant settlement**: Funds in your wallet immediately after confirmation
- **No currency conversion**: Receive stablecoins pegged to USD

## Integration Pattern

### 1. Project Setup

```bash
volr project create --type checkout --name "My Store"
volr checkout setup
```

### 2. Product Checkout

```typescript
// Server-side: create checkout when customer clicks "Pay with Crypto"
const checkout = await volr.create({
  chainId: 8453,
  tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  merchantAddress: process.env.MERCHANT_WALLET!,
  fiatAmount: order.totalUsd.toString(),
  fiatCurrency: 'USD',
  itemName: order.items.map(i => i.name).join(', '),
  itemDescription: `Order #${order.id} — ${order.items.length} items`,
  referenceId: order.id,
  customerEmail: order.customerEmail,
  customerName: order.customerName,
  expiryMinutes: 30,
  successUrl: `https://mystore.com/orders/${order.id}/success`,
  cancelUrl: `https://mystore.com/orders/${order.id}`,
  metadata: {
    orderId: order.id,
    items: order.items.map(i => ({ sku: i.sku, qty: i.qty })),
  },
});
```

### 3. Webhook — Order Fulfillment

```typescript
case 'checkout.paid':
  await markOrderPaid(event.data.referenceId!);
  await sendOrderConfirmation(event.data.customerEmail!);
  await beginShipment(event.data.referenceId!);
  break;
case 'checkout.expired':
  await markOrderExpired(event.data.referenceId!);
  await restoreInventory(event.data.metadata!.items);
  break;
```

## Seller-Specific Tips

- **referenceId**: Always map to your internal order ID for reconciliation
- **fiatAmount**: Price in fiat so customers see familiar prices; auto-converted to token amount
- **customerEmail**: Include for receipt delivery and support
- **metadata**: Store line items for order fulfillment automation
- **Refunds**: Support partial refunds for individual items

### Multi-Chain Support

Offer customers chain choice for lower fees:

```typescript
// Let customer choose chain at checkout
const chains = [
  { id: 8453, name: 'Base', token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  { id: 137, name: 'Polygon', token: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
];
```

## Resources

- [Base guide](./volr-checkout-base.md)
- [Fiat payment docs](https://docs.volr.io/checkout-api/fiat-payment)
- [Refund docs](https://docs.volr.io/checkout-api/refunds)
