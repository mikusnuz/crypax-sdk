**English** | [한국어](./README.ko.md)

# @crypax/js

Core SDK for Crypax — crypto payment gateway for any EVM chain.

Provides a payment modal with built-in wallet connection (MetaMask, Pexus, etc.) using the Stripe PaymentIntent pattern.

## Install

```bash
npm install @crypax/js
```

## Usage

```ts
import { Crypax } from '@crypax/js'

const crypax = new Crypax('pk_live_xxxxx')

// clientSecret comes from your server via @crypax/node
const result = await crypax.confirmPayment(clientSecret)

if (result.status === 'confirmed') {
  console.log('Paid!', result.txHash)
} else if (result.status === 'cancelled') {
  console.log('User cancelled')
}
```

## API

### `new Crypax(publishableKey, config?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiUrl` | `string` | `https://api.crypax.io` | Crypax API endpoint |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | Modal theme |
| `locale` | `'ko' \| 'en'` | `'ko'` | Modal language |
| `chainId` | `number` | `41956` | Target chain ID |
| `rpcUrl` | `string` | Plumise Mainnet | RPC endpoint |
| `chainName` | `string` | `'Plumise Mainnet'` | Chain display name |
| `explorerUrl` | `string` | Plumise Explorer | Block explorer URL |
| `nativeCurrency` | `object` | `{ name: 'PLM', symbol: 'PLM', decimals: 18 }` | Native currency info |

### `crypax.confirmPayment(clientSecret): Promise<PaymentResult>`

Opens the payment modal, connects wallet, sends TX, and polls until confirmed.

```ts
interface PaymentResult {
  status: 'confirmed' | 'cancelled' | 'expired' | 'failed'
  paymentId?: string
  txHash?: string
  blockNumber?: number
  error?: string
}
```

### `crypax.getWallet(): Promise<WalletInfo>`

Detects connected wallet without triggering connection.

### `crypax.on(event, callback): () => void`

Subscribe to events. Returns an unsubscribe function.

Events: `status_change`, `wallet_detected`, `tx_submitted`, `tx_confirmed`, `error`

### `crypax.destroy()`

Clean up modal and event listeners.

## Payment Status Flow

```
idle → loading → ready → connecting → switching_chain → awaiting_approval → submitted → confirmed
                                                                                      → failed
                                                                          → cancelled
                                                                          → expired
```

## License

MIT
