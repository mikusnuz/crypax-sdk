**English** | [한국어](./README.ko.md)

# @crypax/react

React bindings for Crypax — crypto payment gateway for any EVM chain.

## Install

```bash
npm install @crypax/react
```

> `@crypax/js` is included as a dependency — no need to install separately.

## Quick Start

### 1. Wrap with Provider

```tsx
import { CrypaxProvider } from '@crypax/react'

function App() {
  return (
    <CrypaxProvider publishableKey="pk_live_xxxxx">
      <Checkout />
    </CrypaxProvider>
  )
}
```

### 2. Use CheckoutButton

```tsx
import { CheckoutButton } from '@crypax/react'

function Checkout() {
  return (
    <CheckoutButton
      clientSecret={clientSecret}
      onSuccess={(result) => console.log('Paid!', result.txHash)}
      onCancel={() => console.log('Cancelled')}
      onError={(err) => console.error(err)}
    >
      Pay 10 PLM
    </CheckoutButton>
  )
}
```

### 3. Or use hooks for full control

```tsx
import { useConfirmPayment, useWallet } from '@crypax/react'

function CustomCheckout({ clientSecret }: { clientSecret: string }) {
  const { confirmPayment, status, result, error, reset } = useConfirmPayment()
  const { wallet, detect } = useWallet()

  return (
    <div>
      <p>Status: {status}</p>
      <button onClick={() => confirmPayment(clientSecret)}>
        {status === 'idle' ? 'Pay Now' : 'Processing...'}
      </button>
      {result?.status === 'confirmed' && <p>TX: {result.txHash}</p>}
      {error && <p>Error: {error}</p>}
    </div>
  )
}
```

## API

### `<CrypaxProvider>`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `publishableKey` | `string` | Yes | Your Crypax publishable key |
| `options` | `CrypaxConfig` | No | Chain, theme, locale config |

### `<CheckoutButton>`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `clientSecret` | `string` | Yes | From server `payments.create()` |
| `onSuccess` | `(result) => void` | No | Called on confirmed payment |
| `onCancel` | `() => void` | No | Called when user cancels |
| `onError` | `(error: string) => void` | No | Called on failure |
| `className` | `string` | No | Custom CSS class |
| `disabled` | `boolean` | No | Disable button |

### `useConfirmPayment()`

Returns `{ confirmPayment, status, result, error, reset }`

### `useWallet()`

Returns `{ wallet, loading, detect }`

### `useCrypax()`

Returns the underlying `Crypax` instance.

## License

MIT
