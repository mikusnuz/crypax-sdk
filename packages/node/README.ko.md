[English](./README.md) | **한국어**

# @crypax/node

모든 EVM 체인을 지원하는 Crypax 암호화폐 결제 게이트웨이의 서버 사이드 SDK입니다.

결제 생성, 웹훅 검증, 온체인 트랜잭션 확인 기능을 제공합니다.

## 설치

```bash
npm install @crypax/node
```

## 빠른 시작

```ts
import { Crypax } from '@crypax/node'

const crypax = new Crypax('sk_live_xxxxx')

// 결제 생성
const payment = await crypax.payments.create({
  amount: '10',
  recipientAddress: '0x...',
  orderId: 'order_123',
})

// payment.clientSecret을 프론트엔드로 전달
```

## API

### `new Crypax(secretKey, config?)`

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `apiUrl` | `string` | `https://api.crypax.io` | API 엔드포인트 |
| `rpcUrl` | `string` | Plumise Mainnet | 온체인 검증용 RPC |
| `chainId` | `number` | `41956` | 검증에 사용할 체인 ID |

### 결제 (Payments)

```ts
// 생성
const payment = await crypax.payments.create({
  amount: '10',
  recipientAddress: '0x...',
  currency: 'native',         // 선택, 기본값: 'native'
  orderId: 'order_123',       // 선택
  description: 'Premium plan', // 선택
  expiresInMinutes: 30,       // 선택
  metadata: { userId: '42' }, // 선택
})

// 조회
const payment = await crypax.payments.retrieve('pay_xxxxx')

// 목록
const { data, total } = await crypax.payments.list({
  status: 'confirmed',
  page: 1,
  limit: 20,
})
```

### 웹훅 (Webhooks)

웹훅 서명(HMAC-SHA256)을 검증하고 이벤트를 파싱합니다.

```ts
// 웹훅 엔드포인트 핸들러에서
const event = crypax.webhooks.constructEvent(
  rawBody,       // 원본 요청 바디 (string 또는 Buffer)
  signature,     // X-Crypax-Signature 헤더값
  webhookSecret, // Crypax 대시보드에서 확인
)

switch (event.type) {
  case 'payment.confirmed':
    // 주문 처리
    break
  case 'payment.failed':
    // 실패 처리
    break
  case 'payment.expired':
    // 만료 처리
    break
}

// 파싱 없이 서명만 검증
const isValid = crypax.webhooks.verifySignature(rawBody, signature, webhookSecret)
```

### 온체인 검증 (On-Chain Verification)

블록체인에서 직접 트랜잭션을 검증합니다.

```ts
// 네이티브 토큰 전송 검증
const result = await crypax.verification.verifyPayment(txHash, {
  to: '0x...',
  amount: '10',
  decimals: 18, // 선택, 기본값: 18
})

// ERC-20 전송 검증
const result = await crypax.verification.verifyERC20Payment(txHash, {
  tokenAddress: '0x...',
  to: '0x...',
  amount: '1000',
  decimals: 6,
})

// result: { valid, amountMatch, recipientMatch, chainMatch, tx, error }
```

## 라이선스

MIT
