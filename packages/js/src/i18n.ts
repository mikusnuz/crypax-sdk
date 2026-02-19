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
    direct_payment: '직접 송금',
    direct_payment_desc: 'QR코드 · 주소 복사',
    pay_with_pexus: 'Pexus로 결제',
    pexus_not_installed: '설치 필요',
    wallet_payment: '지갑 연결 결제',
    wallet_not_detected: '지갑 미감지',
    choose_method: '결제 방법 선택',
    send_to_address: '아래 주소로 송금해주세요',
    waiting_deposit: '입금 대기 중...',
    deposit_auto_detect: '입금이 감지되면 자동 확인됩니다',
    other_method: '다른 방법으로 결제',
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
    copy_address: 'Copy Address',
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
    direct_payment: 'Direct Transfer',
    direct_payment_desc: 'QR Code · Copy Address',
    pay_with_pexus: 'Pay with Pexus',
    pexus_not_installed: 'Install Required',
    wallet_payment: 'Pay with Wallet',
    wallet_not_detected: 'No Wallet Detected',
    choose_method: 'Choose Payment Method',
    send_to_address: 'Send to the address below',
    waiting_deposit: 'Waiting for deposit...',
    deposit_auto_detect: 'Payment will be confirmed automatically',
    other_method: 'Use different method',
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
