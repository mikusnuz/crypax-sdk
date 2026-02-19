const messages = {
  ko: {
    pay_with: '{wallet}(으)로 결제',
    install_pexus: 'Pexus 설치하기',
    install_pexus_desc: '추천 · 원클릭 결제',
    other_wallet: '다른 지갑으로 결제',
    processing: '처리 중...',
    confirmed: '결제 완료',
    cancelled: '결제 취소됨',
    expired: '결제 만료됨',
    failed: '결제 실패',
    copy_address: '주소 복사',
    copied: '복사됨',
    amount: '금액',
    recipient: '받는 주소',
    network: '네트워크',
    waiting: '블록 확인 대기 중...',
    expires_in: '{time} 남음',
    powered_by: 'Powered by Crypax',
    close: '닫기',
    retry: '다시 시도',
    view_tx: '트랜잭션 보기',
    switch_network: '네트워크 전환',
    connect_wallet: '지갑 연결 중...',
    submitting: '트랜잭션 전송 중...',
    or: '또는',
  },
  en: {
    pay_with: 'Pay with {wallet}',
    install_pexus: 'Install Pexus',
    install_pexus_desc: 'Recommended · One-click',
    other_wallet: 'Pay with other wallet',
    processing: 'Processing...',
    confirmed: 'Payment Complete',
    cancelled: 'Payment Cancelled',
    expired: 'Payment Expired',
    failed: 'Payment Failed',
    copy_address: 'Copy address',
    copied: 'Copied',
    amount: 'Amount',
    recipient: 'Recipient',
    network: 'Network',
    waiting: 'Waiting for confirmation...',
    expires_in: '{time} remaining',
    powered_by: 'Powered by Crypax',
    close: 'Close',
    retry: 'Retry',
    view_tx: 'View Transaction',
    switch_network: 'Switch Network',
    connect_wallet: 'Connecting wallet...',
    submitting: 'Submitting transaction...',
    or: 'or',
  },
} as const

export type Locale = keyof typeof messages
export type MessageKey = keyof (typeof messages)['ko']

export function t(locale: Locale, key: MessageKey, vars?: Record<string, string>): string {
  let msg: string = messages[locale]?.[key] ?? messages['en'][key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      msg = msg.replace(`{${k}}`, v)
    }
  }
  return msg
}
