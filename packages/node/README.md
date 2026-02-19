**English** | [한국어](./README.ko.md)

# @crypax/node

Server-side SDK for Crypax — crypto payment gateway for any EVM chain.

Create payments, verify webhooks, and validate on-chain transactions.

## Install

```bash
npm install @crypax/node
```

## Quick Start

```ts
import { Crypax } from '@crypax/node'

const crypax = new Crypax('sk_live_xxxxx')

// Create a payment
const payment = await crypax.payments.create({
  amount: '10',
  recipientAddress: '0x...',
  orderId: 'order_123',
})

// Send payment.clientSecret to your frontend
```

## API

### `new Crypax(secretKey, config?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiUrl` | `string` | `https://api.crypax.io` | API endpoint |
| `rpcUrl` | `string` | Plumise Mainnet | RPC for on-chain verification |
| `chainId` | `number` | `41956` | Chain ID for verification |

### Payments

```ts
// Create
const payment = await crypax.payments.create({
  amount: '10',
  recipientAddress: '0x...',
  currency: 'native',         // optional, default: 'native'
  orderId: 'order_123',       // optional
  description: 'Premium plan', // optional
  expiresInMinutes: 30,       // optional
  metadata: { userId: '42' }, // optional
})

// Retrieve
const payment = await crypax.payments.retrieve('pay_xxxxx')

// List
const { data, total } = await crypax.payments.list({
  status: 'confirmed',
  page: 1,
  limit: 20,
})
```

### Webhooks

Verify webhook signatures (HMAC-SHA256) and parse events:

```ts
// In your webhook endpoint handler
const event = crypax.webhooks.constructEvent(
  rawBody,       // raw request body (string or Buffer)
  signature,     // X-Crypax-Signature header
  webhookSecret, // from your Crypax dashboard
)

switch (event.type) {
  case 'payment.confirmed':
    // Fulfill order
    break
  case 'payment.failed':
    // Handle failure
    break
  case 'payment.expired':
    // Handle expiry
    break
}

// Or just verify without parsing
const isValid = crypax.webhooks.verifySignature(rawBody, signature, webhookSecret)
```

### On-Chain Verification

Independently verify transactions against the blockchain:

```ts
// Verify native token transfer
const result = await crypax.verification.verifyPayment(txHash, {
  to: '0x...',
  amount: '10',
  decimals: 18, // optional, default: 18
})

// Verify ERC-20 transfer
const result = await crypax.verification.verifyERC20Payment(txHash, {
  tokenAddress: '0x...',
  to: '0x...',
  amount: '1000',
  decimals: 6,
})

// result: { valid, amountMatch, recipientMatch, chainMatch, tx, error }
```

## License

MIT
