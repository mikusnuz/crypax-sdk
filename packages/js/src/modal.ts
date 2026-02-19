import type { PaymentStatus, BackendPaymentInfo, WalletInfo, PaymentMethod, ModalBranding } from './types'
import type { Locale } from './i18n'
import { t } from './i18n'
import { generateQrSvg, buildEip681Uri, ensureWei, normalizeAmount } from './qr'
import { detectAvailableWallets } from './wallet'
import { ICON_PEXUS, ICON_METAMASK, ICON_WALLETCONNECT, ICON_COINBASE, ICON_PHANTOM, ICON_DIRECT } from './icons'

interface ModalConfig {
  theme: 'light' | 'dark' | 'auto'
  locale: Locale
  explorerUrl: string
  chainName: string
  currencySymbol: string
  chainId: number
  decimals: number
  branding?: ModalBranding | null
  fiatCurrency?: string | null
  fiatAmount?: string | null
  cryptoAmount?: string | null
  exchangeRate?: string | null
  quoteExpiresAt?: string | null
  tokenAddress?: string | null
  tokenSymbol?: string | null
  tokenDecimals?: number | null
}

interface ModalHandlers {
  onSelectMethod: (method: PaymentMethod) => void
  onClose: () => void
  onRetry: () => void
  onBack: () => void
}

let host: HTMLElement | null = null
let shadow: ShadowRoot | null = null
let currentLocale: Locale = 'ko'
let currentTheme: 'light' | 'dark' | 'auto' = 'auto'
let currentConfig: ModalConfig | null = null
let currentBranding: ModalBranding | null = null
let handlers: Partial<ModalHandlers> = {}
let currentPaymentStatus: PaymentStatus | null = null
let quoteTimerInterval: ReturnType<typeof setInterval> | null = null
let onQuoteExpired: (() => void) | null = null

const UNCLOSABLE_STATUSES: PaymentStatus[] = [
  'connecting', 'switching_chain', 'awaiting_approval', 'submitted', 'waiting_direct',
]

const STYLES = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 16px;
    line-height: 1.5;
    box-sizing: border-box;
    --cp-primary-start: #7c3aed;
    --cp-primary-end: #06b6d4;
    --cp-light-bg: #ffffff;
    --cp-light-text: #111827;
    --cp-dark-bg: #1a1a2e;
    --cp-dark-text: #f1f5f9;
    --cp-radius: 20px;
  }

  *, *::before, *::after {
    box-sizing: inherit;
  }

  .overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .modal {
    width: 100%;
    max-width: 420px;
    border-radius: var(--cp-radius);
    overflow: hidden;
    animation: slideUp 0.25s ease;
    position: relative;
  }

  .light .modal {
    background: var(--cp-light-bg);
    box-shadow: 0 24px 64px rgba(0,0,0,0.18);
    color: var(--cp-light-text);
  }

  .dark .modal {
    background: var(--cp-dark-bg);
    box-shadow: 0 24px 64px rgba(0,0,0,0.5);
    color: var(--cp-dark-text);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 20px 0;
  }

  .modal-logo {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logo-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--cp-primary-start), var(--cp-primary-end));
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 13px;
    overflow: hidden;
  }

  .logo-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .logo-text {
    font-weight: 700;
    font-size: 15px;
    background: linear-gradient(135deg, var(--cp-primary-start), var(--cp-primary-end));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    transition: background 0.15s;
    padding: 0;
  }

  .light .close-btn { color: #6b7280; }
  .light .close-btn:hover { background: #f3f4f6; }
  .dark .close-btn { color: #9ca3af; }
  .dark .close-btn:hover { background: rgba(255,255,255,0.08); }

  .modal-body {
    padding: 20px;
  }

  .payment-info {
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 20px;
  }

  .light .payment-info {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
  }

  .dark .payment-info {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    margin-bottom: 8px;
  }

  .info-row:last-child { margin-bottom: 0; }

  .info-label {
    font-weight: 500;
    opacity: 0.6;
  }

  .info-value {
    font-weight: 600;
    text-align: right;
    max-width: 60%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .amount-value {
    font-size: 15px;
    background: linear-gradient(135deg, var(--cp-primary-start), var(--cp-primary-end));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .desc-text {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 16px;
    opacity: 0.85;
  }

  .btn {
    width: 100%;
    padding: 14px 16px;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 10px;
    position: relative;
  }

  .btn:last-child { margin-bottom: 0; }

  .btn-primary {
    background: linear-gradient(135deg, var(--cp-primary-start), var(--cp-primary-end));
    color: white;
  }

  .btn-primary:hover {
    opacity: 0.92;
    transform: translateY(-1px);
    box-shadow: 0 8px 24px color-mix(in srgb, var(--cp-primary-start) 35%, transparent);
  }

  .btn-primary:active { transform: translateY(0); }

  .light .btn-secondary {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #e5e7eb;
  }

  .light .btn-secondary:hover { background: #e5e7eb; }

  .dark .btn-secondary {
    background: rgba(255,255,255,0.06);
    color: #e5e7eb;
    border: 1px solid rgba(255,255,255,0.1);
  }

  .dark .btn-secondary:hover { background: rgba(255,255,255,0.1); }

  .btn-tag {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255,255,255,0.2);
    font-weight: 500;
    margin-left: auto;
  }

  .divider {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 12px 0;
    font-size: 12px;
    opacity: 0.5;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
  }

  .light .divider::before,
  .light .divider::after { background: #e5e7eb; }

  .dark .divider::before,
  .dark .divider::after { background: rgba(255,255,255,0.1); }

  .status-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 0;
    gap: 16px;
    text-align: center;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 3px solid color-mix(in srgb, var(--cp-primary-start) 20%, transparent);
    border-top-color: var(--cp-primary-start);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .status-icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
  }

  @keyframes scaleIn {
    from { transform: scale(0); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  @keyframes checkDraw {
    from { stroke-dashoffset: 24; }
    to { stroke-dashoffset: 0; }
  }

  .icon-success { background: rgba(16,185,129,0.1); animation: scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1); }

  .icon-success svg {
    width: 32px;
    height: 32px;
  }

  .icon-success svg path {
    stroke-dasharray: 24;
    stroke-dashoffset: 24;
    animation: checkDraw 0.4s ease 0.3s forwards;
  }

  .confirmed-title {
    animation: scaleIn 0.3s ease 0.2s both;
  }
  .icon-error { background: rgba(239,68,68,0.1); }
  .icon-cancel { background: rgba(107,114,128,0.1); }
  .icon-expired { background: rgba(245,158,11,0.1); }

  .status-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
  }

  .status-sub {
    font-size: 13px;
    opacity: 0.6;
    margin: 0;
    max-width: 300px;
  }

  .tx-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
    color: var(--cp-primary-start);
    padding: 8px 16px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--cp-primary-start) 8%, transparent);
    transition: background 0.15s;
  }

  .tx-link:hover { background: color-mix(in srgb, var(--cp-primary-start) 15%, transparent); }

  .modal-footer {
    padding: 12px 20px 16px;
    text-align: center;
    font-size: 11px;
  }

  .light .modal-footer { color: #9ca3af; }
  .dark .modal-footer { color: #6b7280; }

  .powered-link {
    text-decoration: none;
    font-weight: 500;
  }

  .light .powered-link { color: var(--cp-primary-start); }
  .dark .powered-link { color: var(--cp-primary-start); }

  .method-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .method-btn {
    width: 100%;
    padding: 14px 16px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 12px;
    transition: all 0.15s;
    border: none;
    text-align: left;
  }

  .method-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .method-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .method-btn-pexus {
    background: linear-gradient(135deg, var(--cp-primary-start), var(--cp-primary-end));
    color: white;
  }

  .method-btn-pexus:hover:not(:disabled) {
    box-shadow: 0 8px 24px color-mix(in srgb, var(--cp-primary-start) 35%, transparent);
  }

  .light .method-btn-wallet {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #e5e7eb;
  }

  .light .method-btn-wallet:hover:not(:disabled) { background: #e5e7eb; }

  .dark .method-btn-wallet {
    background: rgba(255,255,255,0.06);
    color: #e5e7eb;
    border: 1px solid rgba(255,255,255,0.1);
  }

  .dark .method-btn-wallet:hover:not(:disabled) { background: rgba(255,255,255,0.1); }

  .light .method-btn-direct {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #e5e7eb;
  }

  .light .method-btn-direct:hover:not(:disabled) { background: #e5e7eb; }

  .dark .method-btn-direct {
    background: rgba(255,255,255,0.06);
    color: #e5e7eb;
    border: 1px solid rgba(255,255,255,0.1);
  }

  .dark .method-btn-direct:hover:not(:disabled) { background: rgba(255,255,255,0.1); }

  .method-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }

  .method-icon svg {
    width: 24px;
    height: 24px;
  }

  .icon-pexus { background: rgba(255,255,255,0.2); }

  .light .icon-wallet { background: #e5e7eb; }
  .dark .icon-wallet { background: rgba(255,255,255,0.1); }

  .light .icon-direct { background: #e5e7eb; }
  .dark .icon-direct { background: rgba(255,255,255,0.1); }

  .method-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .method-title { font-size: 14px; font-weight: 600; }

  .method-sub {
    font-size: 11px;
    font-weight: 400;
    opacity: 0.65;
  }

  .qr-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 8px 0;
  }

  .qr-box {
    border-radius: 16px;
    padding: 16px;
    display: inline-flex;
  }

  .light .qr-box { background: #ffffff; border: 1px solid #e5e7eb; }
  .dark .qr-box { background: #ffffff; border: 1px solid rgba(255,255,255,0.1); }

  .addr-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .addr-text {
    flex: 1;
    font-family: monospace;
    font-size: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    word-break: break-all;
    user-select: all;
  }

  .light .addr-text { background: #f3f4f6; color: #374151; }
  .dark .addr-text { background: rgba(255,255,255,0.06); color: #e5e7eb; }

  .copy-btn {
    padding: 10px 14px;
    border-radius: 8px;
    border: none;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
  }

  .light .copy-btn { background: #e5e7eb; color: #374151; }
  .light .copy-btn:hover { background: #d1d5db; }
  .dark .copy-btn { background: rgba(255,255,255,0.1); color: #e5e7eb; }
  .dark .copy-btn:hover { background: rgba(255,255,255,0.15); }

  .waiting-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 500;
    padding: 10px 16px;
    border-radius: 10px;
  }

  .light .waiting-badge { background: #fef3c7; color: #92400e; }
  .dark .waiting-badge { background: rgba(245,158,11,0.15); color: #fbbf24; }

  .waiting-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

  .waiting-sub {
    font-size: 12px;
    opacity: 0.5;
    text-align: center;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 500;
    border: none;
    background: none;
    cursor: pointer;
    padding: 8px 0;
    transition: opacity 0.15s;
  }

  .light .back-link { color: #6b7280; }
  .dark .back-link { color: #9ca3af; }
  .back-link:hover { opacity: 0.7; }
`

function getThemeClass(theme: 'light' | 'dark' | 'auto'): 'light' | 'dark' {
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

function formatAmount(amount: string, symbol: string, decimals = 18): string {
  const display = normalizeAmount(amount, decimals)
  const n = parseFloat(display)
  if (isNaN(n)) return `${display} ${symbol}`
  if (n === Math.floor(n)) return `${n} ${symbol}`
  return `${display} ${symbol}`
}

function buildInfoRow(label: string, value: string, valueClass = ''): string {
  return `<div class="info-row"><span class="info-label">${label}</span><span class="info-value ${valueClass}">${value}</span></div>`
}

function buildPaymentInfoBlock(info: BackendPaymentInfo): string {
  const locale = currentLocale
  const cfg = currentConfig!
  const symbol = info.tokenSymbol || (info.currency === 'native' ? cfg.currencySymbol : info.currency)
  const decimals = info.tokenDecimals ?? cfg.decimals
  const rows: string[] = []

  if (info.description) {
    rows.push(`<div class="desc-text">${info.description}</div>`)
  }

  if (info.fiatCurrency && info.fiatAmount) {
    const fiatSymbol = info.fiatCurrency === 'USD' ? '$' : '₩'
    const fiatDisplay = info.fiatCurrency === 'USD'
      ? `${fiatSymbol}${parseFloat(info.fiatAmount).toFixed(2)}`
      : `${fiatSymbol}${parseInt(info.fiatAmount).toLocaleString()}`
    const cryptoDisplay = info.cryptoAmount
      ? `≈ ${formatAmount(info.cryptoAmount, symbol, decimals)}`
      : ''

    rows.push(`<div class="info-row">
      <span class="info-label">${t(locale, 'amount')}</span>
      <span class="info-value">
        <span class="amount-value">${fiatDisplay}</span>
        ${cryptoDisplay ? `<br/><span style="font-size:11px;opacity:0.6;">${cryptoDisplay}</span>` : ''}
      </span>
    </div>`)
  } else {
    rows.push(buildInfoRow(t(locale, 'amount'), formatAmount(info.amount, symbol, decimals), 'amount-value'))
  }

  rows.push(
    buildInfoRow(
      t(locale, 'recipient'),
      `${info.recipientAddress.slice(0, 6)}...${info.recipientAddress.slice(-4)}`,
    ),
  )
  rows.push(buildInfoRow(t(locale, 'network'), cfg.chainName))

  if (info.quoteExpiresAt) {
    rows.push(`<div class="info-row" id="quote-timer-row">
      <span class="info-label">${t(locale, 'quote_expires')}</span>
      <span class="info-value" id="quote-countdown" style="font-size:12px;font-weight:600;">--</span>
    </div>`)
  }

  return `<div class="payment-info">${rows.join('')}</div>`
}

export function startQuoteTimer(expiresAt: string): void {
  stopQuoteTimer()
  const target = new Date(expiresAt).getTime()

  const update = () => {
    const el = shadow?.querySelector('#quote-countdown')
    if (!el) { stopQuoteTimer(); return }

    const remaining = Math.max(0, Math.floor((target - Date.now()) / 1000))
    if (remaining <= 0) {
      el.textContent = '0s'
      el.setAttribute('style', 'font-size:12px;font-weight:600;color:#ef4444;')
      stopQuoteTimer()
      onQuoteExpired?.()
      return
    }

    el.textContent = `${remaining}s`
    if (remaining <= 5) {
      el.setAttribute('style', 'font-size:12px;font-weight:600;color:#ef4444;')
    }
  }

  update()
  quoteTimerInterval = setInterval(update, 1000)
}

export function stopQuoteTimer(): void {
  if (quoteTimerInterval) {
    clearInterval(quoteTimerInterval)
    quoteTimerInterval = null
  }
}

export function setQuoteExpiredHandler(handler: (() => void) | null): void {
  onQuoteExpired = handler
}

interface WalletButton {
  id: string
  html: string
}

function buildWalletButtons(locale: Locale): WalletButton[] {
  const available = detectAvailableWallets()
  const hasPexus = available.has('pexus')
  const hasMetaMask = available.has('metamask')
  const hasCoinbase = available.has('coinbase')
  const hasPhantom = available.has('phantom')

  const all: WalletButton[] = [
    {
      id: 'pexus',
      html: `<button class="method-btn method-btn-pexus" id="method-pexus">
        <span class="method-icon icon-pexus">${ICON_PEXUS}</span>
        <span class="method-text">
          <span class="method-title">${hasPexus ? t(locale, 'pay_with_pexus') : t(locale, 'install_pexus')}</span>
          <span class="method-sub">${t(locale, 'pexus_desc')}</span>
        </span>
      </button>`,
    },
    {
      id: 'metamask',
      html: `<button class="method-btn method-btn-wallet" id="method-metamask" ${!hasMetaMask ? 'disabled' : ''}>
        <span class="method-icon icon-wallet">${ICON_METAMASK}</span>
        <span class="method-text">
          <span class="method-title">${t(locale, 'pay_with_metamask')}</span>
          <span class="method-sub">${!hasMetaMask ? t(locale, 'wallet_not_installed') : t(locale, 'metamask_desc')}</span>
        </span>
      </button>`,
    },
    {
      id: 'walletconnect',
      html: `<button class="method-btn method-btn-wallet" id="method-walletconnect">
        <span class="method-icon icon-wallet">${ICON_WALLETCONNECT}</span>
        <span class="method-text">
          <span class="method-title">${t(locale, 'pay_with_walletconnect')}</span>
          <span class="method-sub">${t(locale, 'walletconnect_desc')}</span>
        </span>
      </button>`,
    },
    {
      id: 'coinbase',
      html: `<button class="method-btn method-btn-wallet" id="method-coinbase" ${!hasCoinbase ? 'disabled' : ''}>
        <span class="method-icon icon-wallet">${ICON_COINBASE}</span>
        <span class="method-text">
          <span class="method-title">${t(locale, 'pay_with_coinbase')}</span>
          <span class="method-sub">${!hasCoinbase ? t(locale, 'wallet_not_installed') : t(locale, 'coinbase_desc')}</span>
        </span>
      </button>`,
    },
    {
      id: 'phantom',
      html: `<button class="method-btn method-btn-wallet" id="method-phantom" ${!hasPhantom ? 'disabled' : ''}>
        <span class="method-icon icon-wallet">${ICON_PHANTOM}</span>
        <span class="method-text">
          <span class="method-title">${t(locale, 'pay_with_phantom')}</span>
          <span class="method-sub">${!hasPhantom ? t(locale, 'wallet_not_installed') : t(locale, 'phantom_desc')}</span>
        </span>
      </button>`,
    },
    {
      id: 'direct',
      html: `<button class="method-btn method-btn-direct" id="method-direct">
        <span class="method-icon icon-direct">${ICON_DIRECT}</span>
        <span class="method-text">
          <span class="method-title">${t(locale, 'direct_payment')}</span>
          <span class="method-sub">${t(locale, 'direct_payment_desc')}</span>
        </span>
      </button>`,
    },
  ]

  // Filter out hidden wallets
  const hidden = currentBranding?.hiddenWallets || []
  const visible = all.filter((b) => !hidden.includes(b.id))

  const order = currentBranding?.walletOrder
  if (order && order.length > 0) {
    const sorted: WalletButton[] = []
    for (const wid of order) {
      const btn = visible.find((b) => b.id === wid)
      if (btn) sorted.push(btn)
    }
    // Add any remaining not in order
    for (const btn of visible) {
      if (!sorted.includes(btn)) sorted.push(btn)
    }
    return sorted
  }

  return visible
}

function renderMethodSelection(info: BackendPaymentInfo, _walletInfo: WalletInfo): string {
  const locale = currentLocale
  const buttons = buildWalletButtons(locale)

  return `
    ${buildPaymentInfoBlock(info)}
    <div class="method-list">
      ${buttons.map((b) => b.html).join('\n')}
    </div>
  `
}

function renderDirectPayment(info: BackendPaymentInfo): string {
  const locale = currentLocale
  const cfg = currentConfig!
  const symbol = info.currency === 'native' ? cfg.currencySymbol : info.currency
  const weiAmount = ensureWei(info.amount, cfg.decimals)
  const uri = buildEip681Uri(info.recipientAddress, weiAmount, cfg.chainId)
  const qrSvg = generateQrSvg(uri, 180)

  return `
    <div class="qr-section">
      <p style="margin:0;font-size:14px;font-weight:600;opacity:0.85;">${t(locale, 'send_to_address')}</p>
      <div class="qr-box">${qrSvg}</div>
      <div class="addr-row">
        <span class="addr-text">${info.recipientAddress}</span>
        <button class="copy-btn" id="copy-addr-btn">${t(locale, 'copy_address')}</button>
      </div>
      ${buildInfoRow(t(locale, 'amount'), formatAmount(info.amount, symbol, cfg.decimals), 'amount-value')}
      ${buildInfoRow(t(locale, 'network'), cfg.chainName)}
      <div class="waiting-badge">
        <span class="waiting-dot"></span>
        ${t(locale, 'waiting_deposit')}
      </div>
      <p class="waiting-sub">${t(locale, 'deposit_auto_detect')}</p>
    </div>
    <button class="back-link" id="back-btn">← ${t(locale, 'other_method')}</button>
  `
}

function renderProcessing(statusText: string, txHash?: string): string {
  const locale = currentLocale
  const cfg = currentConfig!
  return `
    <div class="status-center">
      <div class="spinner"></div>
      <p class="status-title">${statusText}</p>
      ${txHash ? `<a class="tx-link" href="${cfg.explorerUrl}/tx/${txHash}" target="_blank" rel="noopener">${t(locale, 'view_tx')} ↗</a>` : ''}
    </div>
  `
}

function renderConfirmed(txHash?: string, blockNumber?: number): string {
  const locale = currentLocale
  const cfg = currentConfig!
  return `
    <div class="status-center">
      <div class="status-icon icon-success">
        <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <p class="status-title confirmed-title">${t(locale, 'confirmed')}</p>
      ${blockNumber ? `<p class="status-sub">Block #${blockNumber}</p>` : ''}
      ${txHash ? `<a class="tx-link" href="${cfg.explorerUrl}/tx/${txHash}" target="_blank" rel="noopener">${t(locale, 'view_tx')} ↗</a>` : ''}
      <button class="btn btn-primary" id="close-final-btn" style="margin-top:12px;max-width:200px;">
        ${t(locale, 'close')}
      </button>
    </div>
  `
}

function renderCancelled(): string {
  const locale = currentLocale
  return `
    <div class="status-center">
      <div class="status-icon icon-cancel">✕</div>
      <p class="status-title">${t(locale, 'cancelled')}</p>
      <button class="btn btn-secondary" id="close-final-btn" style="margin-top:8px;max-width:200px;">
        ${t(locale, 'close')}
      </button>
    </div>
  `
}

function renderExpired(): string {
  const locale = currentLocale
  return `
    <div class="status-center">
      <div class="status-icon icon-expired">⏱</div>
      <p class="status-title">${t(locale, 'expired')}</p>
      <button class="btn btn-secondary" id="close-final-btn" style="margin-top:8px;max-width:200px;">
        ${t(locale, 'close')}
      </button>
    </div>
  `
}

function renderFailed(message?: string): string {
  const locale = currentLocale
  return `
    <div class="status-center">
      <div class="status-icon icon-error">⚠</div>
      <p class="status-title">${t(locale, 'failed')}</p>
      ${message ? `<p class="status-sub">${message}</p>` : ''}
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button class="btn btn-secondary" id="retry-btn" style="max-width:120px;">${t(locale, 'retry')}</button>
        <button class="btn btn-secondary" id="close-final-btn" style="max-width:120px;">${t(locale, 'close')}</button>
      </div>
    </div>
  `
}

function getModalBody(): HTMLElement | null {
  return shadow?.querySelector('.modal-body') ?? null
}

function attachBodyListeners(): void {
  const body = getModalBody()
  if (!body) return

  // Method selection buttons
  body.querySelector('#method-pexus')?.addEventListener('click', () => handlers.onSelectMethod?.('pexus'))
  body.querySelector('#method-metamask')?.addEventListener('click', () => handlers.onSelectMethod?.('metamask'))
  body.querySelector('#method-walletconnect')?.addEventListener('click', () => handlers.onSelectMethod?.('walletconnect'))
  body.querySelector('#method-coinbase')?.addEventListener('click', () => handlers.onSelectMethod?.('coinbase'))
  body.querySelector('#method-phantom')?.addEventListener('click', () => handlers.onSelectMethod?.('phantom'))
  body.querySelector('#method-direct')?.addEventListener('click', () => handlers.onSelectMethod?.('direct'))

  body.querySelector('#close-final-btn')?.addEventListener('click', () => handlers.onClose?.())
  body.querySelector('#retry-btn')?.addEventListener('click', () => handlers.onRetry?.())

  // Copy address
  body.querySelector('#copy-addr-btn')?.addEventListener('click', (e) => {
    const addrEl = body.querySelector('.addr-text')
    if (addrEl) {
      navigator.clipboard.writeText(addrEl.textContent?.trim() || '')
      const btn = e.target as HTMLButtonElement
      const original = btn.textContent
      btn.textContent = t(currentLocale, 'copied')
      setTimeout(() => { btn.textContent = original }, 2000)
    }
  })

  // Back button
  body.querySelector('#back-btn')?.addEventListener('click', () => handlers.onBack?.())
}

function applyBrandingVars(): void {
  if (!host || !currentBranding) return
  const b = currentBranding
  if (b.primaryColorStart) host.style.setProperty('--cp-primary-start', b.primaryColorStart)
  if (b.primaryColorEnd) host.style.setProperty('--cp-primary-end', b.primaryColorEnd)
  if (b.lightBg) host.style.setProperty('--cp-light-bg', b.lightBg)
  if (b.lightText) host.style.setProperty('--cp-light-text', b.lightText)
  if (b.darkBg) host.style.setProperty('--cp-dark-bg', b.darkBg)
  if (b.darkText) host.style.setProperty('--cp-dark-text', b.darkText)
  if (b.borderRadius !== undefined) host.style.setProperty('--cp-radius', `${b.borderRadius}px`)
}

function getLogoHtml(): string {
  if (currentBranding?.logoDataUrl) {
    return `<img src="${currentBranding.logoDataUrl}" alt="" />`
  }
  return 'C'
}

function getBrandName(): string {
  return currentBranding?.brandName || 'Crypax'
}

export function createModal(config: ModalConfig): void {
  if (host) return

  currentLocale = config.locale
  currentTheme = config.theme
  currentConfig = config
  currentBranding = config.branding || null

  host = document.createElement('div')
  host.id = '__crypax-modal__'
  shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = STYLES
  shadow.appendChild(style)

  applyBrandingVars()

  document.body.appendChild(host)
}

export function updateModalBody(info: BackendPaymentInfo, walletInfo: WalletInfo): void {
  const body = getModalBody()
  if (!body) return
  body.innerHTML = renderMethodSelection(info, walletInfo)
  attachBodyListeners()
  if (info.quoteExpiresAt) {
    startQuoteTimer(info.quoteExpiresAt)
  }
}

export function showDirectPayment(info: BackendPaymentInfo): void {
  const body = getModalBody()
  if (!body) return
  body.innerHTML = renderDirectPayment(info)
  attachBodyListeners()
}

export function showModal(
  info: BackendPaymentInfo,
  walletInfo: WalletInfo,
  hdlrs: Partial<ModalHandlers>,
): void {
  if (!shadow) return

  handlers = hdlrs
  const themeClass = getThemeClass(currentTheme)
  const locale = currentLocale

  const existingWrapper = shadow.querySelector('.theme-wrapper')
  if (existingWrapper) existingWrapper.remove()

  const wrapper = document.createElement('div')
  wrapper.className = `theme-wrapper ${themeClass}`
  const brandName = getBrandName()
  const logoHtml = getLogoHtml()
  const hideFooter = currentBranding?.hideFooter === true

  wrapper.innerHTML = `
    <div class="overlay" id="overlay">
      <div class="modal" role="dialog" aria-modal="true" aria-label="${brandName} Payment">
        <div class="modal-header">
          <div class="modal-logo">
            <div class="logo-icon">${logoHtml}</div>
            <span class="logo-text">${brandName}</span>
          </div>
          <button class="close-btn" id="modal-close-btn" aria-label="${t(locale, 'close')}">✕</button>
        </div>
        <div class="modal-body">
          ${renderMethodSelection(info, walletInfo)}
        </div>
        ${hideFooter ? '' : `<div class="modal-footer">
          <span class="powered-link">${t(locale, 'powered_by')}</span>
        </div>`}
      </div>
    </div>
  `

  shadow.appendChild(wrapper)

  wrapper.querySelector('#modal-close-btn')?.addEventListener('click', () => {
    if (currentPaymentStatus && UNCLOSABLE_STATUSES.includes(currentPaymentStatus)) return
    handlers.onClose?.()
  })
  wrapper.querySelector('#overlay')?.addEventListener('click', (e) => {
    if (currentPaymentStatus && UNCLOSABLE_STATUSES.includes(currentPaymentStatus)) return
    if (e.target === wrapper.querySelector('#overlay')) handlers.onClose?.()
  })

  attachBodyListeners()

  if (info.quoteExpiresAt) {
    startQuoteTimer(info.quoteExpiresAt)
  }
}

export function updateStatus(
  status: PaymentStatus,
  extra?: { txHash?: string; blockNumber?: number; error?: string },
): void {
  const body = getModalBody()
  if (!body) return
  const locale = currentLocale
  currentPaymentStatus = status

  // Hide/show close button based on status
  const closeBtn = shadow?.querySelector('#modal-close-btn') as HTMLElement | null
  if (closeBtn) {
    const hide = UNCLOSABLE_STATUSES.includes(status)
    closeBtn.style.visibility = hide ? 'hidden' : 'visible'
    closeBtn.style.pointerEvents = hide ? 'none' : 'auto'
  }

  switch (status) {
    case 'connecting':
      body.innerHTML = renderProcessing(t(locale, 'connect_wallet'))
      break
    case 'switching_chain':
      body.innerHTML = renderProcessing(t(locale, 'switch_network'))
      break
    case 'awaiting_approval':
      body.innerHTML = renderProcessing(t(locale, 'submitting'))
      break
    case 'submitted':
      body.innerHTML = renderProcessing(t(locale, 'waiting'), extra?.txHash)
      break
    case 'waiting_direct':
      body.innerHTML = renderProcessing(t(locale, 'waiting_deposit'))
      break
    case 'confirmed':
      body.innerHTML = renderConfirmed(extra?.txHash, extra?.blockNumber)
      body.querySelector('#close-final-btn')?.addEventListener('click', () => handlers.onClose?.())
      break
    case 'cancelled':
      body.innerHTML = renderCancelled()
      body.querySelector('#close-final-btn')?.addEventListener('click', () => handlers.onClose?.())
      break
    case 'expired':
      body.innerHTML = renderExpired()
      body.querySelector('#close-final-btn')?.addEventListener('click', () => handlers.onClose?.())
      break
    case 'failed':
      body.innerHTML = renderFailed(extra?.error)
      body.querySelector('#close-final-btn')?.addEventListener('click', () => handlers.onClose?.())
      body.querySelector('#retry-btn')?.addEventListener('click', () => handlers.onRetry?.())
      break
  }
}

export function hideModal(): void {
  currentPaymentStatus = null
  stopQuoteTimer()
  const wrapper = shadow?.querySelector('.theme-wrapper') as HTMLElement | null
  if (wrapper) {
    wrapper.style.opacity = '0'
    wrapper.style.transition = 'opacity 0.2s ease'
    setTimeout(() => wrapper.remove(), 200)
  }
}

export function destroyModal(): void {
  stopQuoteTimer()
  hideModal()
  if (host) {
    host.remove()
    host = null
    shadow = null
    currentConfig = null
    currentBranding = null
  }
}
