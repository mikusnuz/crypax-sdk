**English** | [한국어](./README.ko.md)

# Crypax SDK

Crypto payment gateway SDK for any EVM-compatible blockchain.

## Packages

| Package | Description | Install |
|---------|-------------|---------|
| [`@crypax/js`](./packages/js) | Core SDK — payment modal, wallet integration | `npm i @crypax/js` |
| [`@crypax/react`](./packages/react) | React bindings — Provider, hooks, components | `npm i @crypax/react` |
| [`@crypax/vue`](./packages/vue) | Vue bindings — plugin, composables, components | `npm i @crypax/vue` |
| [`@crypax/node`](./packages/node) | Server SDK — payment CRUD, webhook verification | `npm i @crypax/node` |

## How It Works

Crypax follows the **Stripe PaymentIntent pattern**:

```
┌─ Your Server ─┐     ┌─ Crypax API ─┐     ┌─ Blockchain ─┐
│                │     │              │     │              │
│ POST /payments ├────►│ Create       │     │              │
│ (sk_live_xxx)  │◄────┤ clientSecret │     │              │
│                │     │              │     │              │
│ → clientSecret │     │              │     │              │
│   to frontend  │     │              │     │              │
└────────────────┘     └──────────────┘     └──────────────┘
                                                    ▲
┌─ Frontend ─────┐     ┌─ Crypax SDK ─┐            │
│                │     │              │            │
│ confirmPayment ├────►│ Show modal   │            │
│ (clientSecret) │     │ Connect      │            │
│                │     │ wallet  ─────┼────────────┘
│                │◄────┤ Poll result  │  Send TX
└────────────────┘     └──────────────┘
```

1. **Server** creates a payment via `@crypax/node` → receives `clientSecret`
2. **Frontend** calls `confirmPayment(clientSecret)` via `@crypax/js` (or React/Vue bindings)
3. SDK shows a payment modal, connects wallet, sends the transaction
4. SDK polls until confirmed → resolves with result
5. **Webhook** notifies your server of the final status

## Quick Start

### Server (Node.js)

```ts
import { Crypax } from '@crypax/node'

const crypax = new Crypax('sk_live_xxxxx')

const payment = await crypax.payments.create({
  amount: '10',
  recipientAddress: '0x...',
  orderId: 'order_123',
})

// Send payment.clientSecret to your frontend
```

### Frontend (Vanilla JS)

```ts
import { Crypax } from '@crypax/js'

const crypax = new Crypax('pk_live_xxxxx')

const result = await crypax.confirmPayment(clientSecret)
if (result.status === 'confirmed') {
  console.log('Payment confirmed:', result.txHash)
}
```

### Frontend (React)

```tsx
import { CrypaxProvider, CheckoutButton } from '@crypax/react'

function App() {
  return (
    <CrypaxProvider publishableKey="pk_live_xxxxx">
      <CheckoutButton
        clientSecret={clientSecret}
        onSuccess={(result) => console.log('Paid!', result.txHash)}
      >
        Pay 10 PLM
      </CheckoutButton>
    </CrypaxProvider>
  )
}
```

### Webhook Verification

```ts
import { Crypax } from '@crypax/node'

const crypax = new Crypax('sk_live_xxxxx')

const event = crypax.webhooks.constructEvent(rawBody, signature, webhookSecret)
// event.type: 'payment.confirmed' | 'payment.failed' | 'payment.expired'
```

## Chain Configuration

Crypax defaults to [Plumise Mainnet](https://plumise.com), but supports any EVM chain:

```ts
const crypax = new Crypax('pk_live_xxxxx', {
  chainId: 1,
  rpcUrl: 'https://eth.llamarpc.com',
  chainName: 'Ethereum',
  explorerUrl: 'https://etherscan.io',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
})
```

## License

MIT
