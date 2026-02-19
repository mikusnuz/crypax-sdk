[English](./README.md) | **한국어**

# @crypax/vue

모든 EVM 체인을 지원하는 Crypax 암호화폐 결제 게이트웨이의 Vue 바인딩입니다.

## 설치

```bash
npm install @crypax/vue
```

> `@crypax/js`가 의존성으로 포함되어 있어 별도로 설치할 필요가 없습니다.

## 빠른 시작

### 1. Plugin 설치

```ts
import { createApp } from 'vue'
import { CrypaxPlugin } from '@crypax/vue'

const app = createApp(App)
app.use(CrypaxPlugin, { publishableKey: 'pk_live_xxxxx' })
app.mount('#app')
```

### 2. CheckoutButton 사용

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

### 3. composables로 직접 제어하기

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
  chainId: 41956,       // 선택
  theme: 'auto',        // 선택
  locale: 'ko',         // 선택
})
```

### `<CheckoutButton>`

| Prop | 타입 | 필수 | 설명 |
|------|------|------|------|
| `clientSecret` | `string` | 필수 | 서버의 `payments.create()`에서 발급 |

| 이벤트 | 페이로드 | 설명 |
|--------|----------|------|
| `success` | `PaymentResult` | 결제 컨펌 |
| `cancel` | — | 사용자 취소 |
| `error` | `string` | 실패 메시지 |

### `useConfirmPayment()`

`{ confirmPayment, status, result, error, reset }`을 반환합니다. (모두 ref)

### `useWallet()`

`{ wallet, loading, detect }`을 반환합니다. (모두 ref)

### `useCrypax()`

내부 `Crypax` 인스턴스를 반환합니다.

## 라이선스

MIT
