**English** | [한국어](./README.ko.md)

# @crypax/vue

Vue bindings for Crypax — crypto payment gateway for any EVM chain.

## Install

```bash
npm install @crypax/vue
```

> `@crypax/js` is included as a dependency — no need to install separately.

## Quick Start

### 1. Install Plugin

```ts
import { createApp } from 'vue'
import { CrypaxPlugin } from '@crypax/vue'

const app = createApp(App)
app.use(CrypaxPlugin, { publishableKey: 'pk_live_xxxxx' })
app.mount('#app')
```

### 2. Use CheckoutButton

```vue
<script setup>
import { CheckoutButton } from '@crypax/vue'

const clientSecret = ref('...')
</script>

<template>
  <CheckoutButton
    :client-secret="clientSecret"
    @success="(r) => console.log('Paid!', r.txHash)"
    @cancel="() => console.log('Cancelled')"
    @error="(e) => console.error(e)"
  >
    Pay 10 PLM
  </CheckoutButton>
</template>
```

### 3. Or use composables for full control

```vue
<script setup>
import { useConfirmPayment, useWallet } from '@crypax/vue'

const { confirmPayment, status, result, error, reset } = useConfirmPayment()
const { wallet, detect } = useWallet()
</script>

<template>
  <div>
    <p>Status: {{ status }}</p>
    <button @click="confirmPayment(clientSecret)">
      {{ status === 'idle' ? 'Pay Now' : 'Processing...' }}
    </button>
    <p v-if="result?.status === 'confirmed'">TX: {{ result.txHash }}</p>
    <p v-if="error">Error: {{ error }}</p>
  </div>
</template>
```

## API

### `CrypaxPlugin`

```ts
app.use(CrypaxPlugin, {
  publishableKey: 'pk_live_xxxxx',
  chainId: 41956,       // optional
  theme: 'auto',        // optional
  locale: 'ko',         // optional
})
```

### `<CheckoutButton>`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `clientSecret` | `string` | Yes | From server `payments.create()` |

| Event | Payload | Description |
|-------|---------|-------------|
| `success` | `PaymentResult` | Confirmed payment |
| `cancel` | — | User cancelled |
| `error` | `string` | Failure message |

### `useConfirmPayment()`

Returns `{ confirmPayment, status, result, error, reset }` (all refs)

### `useWallet()`

Returns `{ wallet, loading, detect }` (all refs)

### `useCrypax()`

Returns the underlying `Crypax` instance.

## License

MIT
