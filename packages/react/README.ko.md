[English](./README.md) | **한국어**

# @crypax/react

모든 EVM 체인을 지원하는 Crypax 암호화폐 결제 게이트웨이의 React 바인딩입니다.

## 설치

```bash
npm install @crypax/react
```

> `@crypax/js`가 의존성으로 포함되어 있어 별도로 설치할 필요가 없습니다.

## 빠른 시작

### 1. Provider로 감싸기

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

### 2. CheckoutButton 사용

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

### 3. hooks로 직접 제어하기

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

| Prop | 타입 | 필수 | 설명 |
|------|------|------|------|
| `publishableKey` | `string` | 필수 | Crypax publishable key |
| `options` | `CrypaxConfig` | 선택 | 체인, 테마, 언어 설정 |

### `<CheckoutButton>`

| Prop | 타입 | 필수 | 설명 |
|------|------|------|------|
| `clientSecret` | `string` | 필수 | 서버의 `payments.create()`에서 발급 |
| `onSuccess` | `(result) => void` | 선택 | 결제 컨펌 시 호출 |
| `onCancel` | `() => void` | 선택 | 사용자가 취소할 때 호출 |
| `onError` | `(error: string) => void` | 선택 | 실패 시 호출 |
| `className` | `string` | 선택 | 커스텀 CSS 클래스 |
| `disabled` | `boolean` | 선택 | 버튼 비활성화 |

### `useConfirmPayment()`

`{ confirmPayment, status, result, error, reset }`을 반환합니다.

### `useWallet()`

`{ wallet, loading, detect }`을 반환합니다.

### `useCrypax()`

내부 `Crypax` 인스턴스를 반환합니다.

## 라이선스

MIT
