[English](./README.md) | **한국어**

# @crypax/js

모든 EVM 체인을 지원하는 Crypax 암호화폐 결제 게이트웨이의 Core SDK입니다.

Stripe PaymentIntent 패턴을 기반으로, 지갑 연결(MetaMask, Pexus 등)이 내장된 결제 모달을 제공합니다.

## 설치

```bash
npm install @crypax/js
```

## 사용법

```ts
import { Crypax } from '@crypax/js'

const crypax = new Crypax('pk_live_xxxxx')

// clientSecret은 서버에서 @crypax/node로 발급
const result = await crypax.confirmPayment(clientSecret)

if (result.status === 'confirmed') {
  console.log('Paid!', result.txHash)
} else if (result.status === 'cancelled') {
  console.log('User cancelled')
}
```

## API

### `new Crypax(publishableKey, config?)`

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `apiUrl` | `string` | `https://api.crypax.io` | Crypax API 엔드포인트 |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | 모달 테마 |
| `locale` | `'ko' \| 'en'` | `'ko'` | 모달 언어 |
| `chainId` | `number` | `41956` | 대상 체인 ID |
| `rpcUrl` | `string` | Plumise Mainnet | RPC 엔드포인트 |
| `chainName` | `string` | `'Plumise Mainnet'` | 체인 표시명 |
| `explorerUrl` | `string` | Plumise Explorer | 블록 익스플로러 URL |
| `nativeCurrency` | `object` | `{ name: 'PLM', symbol: 'PLM', decimals: 18 }` | 네이티브 통화 정보 |

### `crypax.confirmPayment(clientSecret): Promise<PaymentResult>`

결제 모달을 열고, 지갑을 연결하고, 트랜잭션을 전송한 뒤 컨펌될 때까지 폴링합니다.

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

연결 요청 없이 현재 연결된 지갑 정보를 감지합니다.

### `crypax.on(event, callback): () => void`

이벤트를 구독합니다. 구독 해제 함수를 반환합니다.

이벤트 종류: `status_change`, `wallet_detected`, `tx_submitted`, `tx_confirmed`, `error`

### `crypax.destroy()`

모달과 이벤트 리스너를 정리합니다.

## 결제 상태 흐름

```
idle → loading → ready → connecting → switching_chain → awaiting_approval → submitted → confirmed
                                                                                      → failed
                                                                          → cancelled
                                                                          → expired
```

## 라이선스

MIT
