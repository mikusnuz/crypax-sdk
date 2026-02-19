[English](./README.md) | **한국어**

# Crypax SDK

모든 EVM 호환 블록체인을 지원하는 암호화폐 결제 게이트웨이 SDK입니다.

## 패키지

| 패키지 | 설명 | 설치 |
|--------|------|------|
| [`@crypax/js`](./packages/js) | Core SDK — 결제 모달, 지갑 연동 | `npm i @crypax/js` |
| [`@crypax/react`](./packages/react) | React 바인딩 — Provider, hooks, 컴포넌트 | `npm i @crypax/react` |
| [`@crypax/vue`](./packages/vue) | Vue 바인딩 — plugin, composables, 컴포넌트 | `npm i @crypax/vue` |
| [`@crypax/node`](./packages/node) | 서버 SDK — 결제 CRUD, 웹훅 검증 | `npm i @crypax/node` |

## 동작 방식

Crypax는 **Stripe PaymentIntent 패턴**을 따릅니다.

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

1. **서버**에서 `@crypax/node`로 결제를 생성하고 `clientSecret`을 받습니다.
2. **프론트엔드**에서 `@crypax/js`(또는 React/Vue 바인딩)의 `confirmPayment(clientSecret)`을 호출합니다.
3. SDK가 결제 모달을 열고 지갑을 연결한 뒤 트랜잭션을 전송합니다.
4. SDK가 컨펌될 때까지 폴링한 후 결과를 반환합니다.
5. **웹훅**으로 최종 상태를 서버에 통보합니다.

## 빠른 시작

### 서버 (Node.js)

```ts
import { Crypax } from '@crypax/node'

const crypax = new Crypax('sk_live_xxxxx')

const payment = await crypax.payments.create({
  amount: '10',
  recipientAddress: '0x...',
  orderId: 'order_123',
})

// payment.clientSecret을 프론트엔드로 전달
```

### 프론트엔드 (Vanilla JS)

```ts
import { Crypax } from '@crypax/js'

const crypax = new Crypax('pk_live_xxxxx')

const result = await crypax.confirmPayment(clientSecret)
if (result.status === 'confirmed') {
  console.log('Payment confirmed:', result.txHash)
}
```

### 프론트엔드 (React)

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

### 웹훅 검증

```ts
import { Crypax } from '@crypax/node'

const crypax = new Crypax('sk_live_xxxxx')

const event = crypax.webhooks.constructEvent(rawBody, signature, webhookSecret)
// event.type: 'payment.confirmed' | 'payment.failed' | 'payment.expired'
```

## 체인 설정

Crypax는 기본적으로 [Plumise Mainnet](https://plumise.com)을 사용하지만, 모든 EVM 체인을 지원합니다.

```ts
const crypax = new Crypax('pk_live_xxxxx', {
  chainId: 1,
  rpcUrl: 'https://eth.llamarpc.com',
  chainName: 'Ethereum',
  explorerUrl: 'https://etherscan.io',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
})
```

## 라이선스

MIT
