import type { PaymentStatus, BackendPaymentInfo, WalletInfo, PaymentMethod } from './types'
import type { Locale } from './i18n'
import { t } from './i18n'
import { generateQrSvg, buildEip681Uri, ensureWei, normalizeAmount } from './qr'

interface ModalConfig {
  theme: 'light' | 'dark' | 'auto'
  locale: Locale
  explorerUrl: string
  chainName: string
  currencySymbol: string
  chainId: number
  decimals: number
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
let handlers: Partial<ModalHandlers> = {}

const STYLES = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 16px;
    line-height: 1.5;
    box-sizing: border-box;
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
    border-radius: 20px;
    overflow: hidden;
    animation: slideUp 0.25s ease;
    position: relative;
  }

  .light .modal {
    background: #ffffff;
    box-shadow: 0 24px 64px rgba(0,0,0,0.18);
    color: #111827;
  }

  .dark .modal {
    background: #1a1a2e;
    box-shadow: 0 24px 64px rgba(0,0,0,0.5);
    color: #f1f5f9;
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
    background: linear-gradient(135deg, #7c3aed, #06b6d4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 13px;
  }

  .logo-text {
    font-weight: 700;
    font-size: 15px;
    background: linear-gradient(135deg, #7c3aed, #06b6d4);
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
    background: linear-gradient(135deg, #7c3aed, #06b6d4);
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
    background: linear-gradient(135deg, #7c3aed, #06b6d4);
    color: white;
  }

  .btn-primary:hover {
    opacity: 0.92;
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(124,58,237,0.35);
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
    border: 3px solid rgba(124,58,237,0.2);
    border-top-color: #7c3aed;
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

  .icon-success { background: rgba(16,185,129,0.1); }
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
    color: #7c3aed;
    padding: 8px 16px;
    border-radius: 8px;
    background: rgba(124,58,237,0.08);
    transition: background 0.15s;
  }

  .tx-link:hover { background: rgba(124,58,237,0.15); }

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

  .light .powered-link { color: #7c3aed; }
  .dark .powered-link { color: #a78bfa; }

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
    background: linear-gradient(135deg, #7c3aed, #06b6d4);
    color: white;
  }

  .method-btn-pexus:hover:not(:disabled) {
    box-shadow: 0 8px 24px rgba(124,58,237,0.35);
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
  const symbol = info.currency === 'native' ? cfg.currencySymbol : info.currency
  const rows: string[] = []

  if (info.description) {
    rows.push(`<div class="desc-text">${info.description}</div>`)
  }

  rows.push(buildInfoRow(t(locale, 'amount'), formatAmount(info.amount, symbol, cfg.decimals), 'amount-value'))
  rows.push(
    buildInfoRow(
      t(locale, 'recipient'),
      `${info.recipientAddress.slice(0, 6)}...${info.recipientAddress.slice(-4)}`,
    ),
  )
  rows.push(buildInfoRow(t(locale, 'network'), cfg.chainName))

  return `<div class="payment-info">${rows.join('')}</div>`
}

function renderMethodSelection(info: BackendPaymentInfo, walletInfo: WalletInfo): string {
  const locale = currentLocale

  const hasPexus = walletInfo.type === 'pexus'
  const hasWallet = walletInfo.type !== 'none'

  return `
    ${buildPaymentInfoBlock(info)}
    <div class="method-list">
      <button class="method-btn method-btn-pexus" id="method-pexus" ${!hasPexus ? 'disabled' : ''}>
        <span class="method-icon icon-pexus">🟣</span>
        <span class="method-text">
          <span class="method-title">${t(locale, 'pay_with_pexus')}</span>
          ${!hasPexus ? `<span class="method-sub">${t(locale, 'pexus_not_installed')}</span>` : ''}
        </span>
      </button>
      <button class="method-btn method-btn-wallet" id="method-wallet" ${!hasWallet ? 'disabled' : ''}>
        <span class="method-icon icon-wallet">🦊</span>
        <span class="method-text">
          <span class="method-title">${t(locale, 'wallet_payment')}</span>
          ${!hasWallet ? `<span class="method-sub">${t(locale, 'wallet_not_detected')}</span>` : ''}
        </span>
      </button>
      <button class="method-btn method-btn-direct" id="method-direct">
        <span class="method-icon icon-direct">📱</span>
        <span class="method-text">
          <span class="method-title">${t(locale, 'direct_payment')}</span>
          <span class="method-sub">${t(locale, 'direct_payment_desc')}</span>
        </span>
      </button>
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
      <div class="status-icon icon-success">✅</div>
      <p class="status-title">${t(locale, 'confirmed')}</p>
      ${blockNumber ? `<p class="status-sub">Block #${blockNumber}</p>` : ''}
      ${txHash ? `<a class="tx-link" href="${cfg.explorerUrl}/tx/${txHash}" target="_blank" rel="noopener">${t(locale, 'view_tx')} ↗</a>` : ''}
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
  body.querySelector('#method-wallet')?.addEventListener('click', () => handlers.onSelectMethod?.('wallet'))
  body.querySelector('#method-direct')?.addEventListener('click', () => handlers.onSelectMethod?.('direct'))

  // Legacy buttons (for status screens)
  body.querySelector('#pay-wallet-btn')?.addEventListener('click', () => handlers.onSelectMethod?.('pexus'))
  body.querySelector('#install-pexus-btn')?.addEventListener('click', () => handlers.onSelectMethod?.('pexus'))
  body.querySelector('#other-wallet-btn')?.addEventListener('click', () => handlers.onSelectMethod?.('wallet'))
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

export function createModal(config: ModalConfig): void {
  if (host) return

  currentLocale = config.locale
  currentTheme = config.theme
  currentConfig = config

  host = document.createElement('div')
  host.id = '__crypax-modal__'
  shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = STYLES
  shadow.appendChild(style)

  document.body.appendChild(host)
}

export function updateModalBody(info: BackendPaymentInfo, walletInfo: WalletInfo): void {
  const body = getModalBody()
  if (!body) return
  body.innerHTML = renderMethodSelection(info, walletInfo)
  attachBodyListeners()
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
  wrapper.innerHTML = `
    <div class="overlay" id="overlay">
      <div class="modal" role="dialog" aria-modal="true" aria-label="Crypax Payment">
        <div class="modal-header">
          <div class="modal-logo">
            <div class="logo-icon">C</div>
            <span class="logo-text">Crypax</span>
          </div>
          <button class="close-btn" id="modal-close-btn" aria-label="${t(locale, 'close')}">✕</button>
        </div>
        <div class="modal-body">
          ${renderMethodSelection(info, walletInfo)}
        </div>
        <div class="modal-footer">
          <span class="powered-link">${t(locale, 'powered_by')}</span>
        </div>
      </div>
    </div>
  `

  shadow.appendChild(wrapper)

  wrapper.querySelector('#modal-close-btn')?.addEventListener('click', () => handlers.onClose?.())
  wrapper.querySelector('#overlay')?.addEventListener('click', (e) => {
    if (e.target === wrapper.querySelector('#overlay')) handlers.onClose?.()
  })

  attachBodyListeners()
}

export function updateStatus(
  status: PaymentStatus,
  extra?: { txHash?: string; blockNumber?: number; error?: string },
): void {
  const body = getModalBody()
  if (!body) return
  const locale = currentLocale

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
  const wrapper = shadow?.querySelector('.theme-wrapper') as HTMLElement | null
  if (wrapper) {
    wrapper.style.opacity = '0'
    wrapper.style.transition = 'opacity 0.2s ease'
    setTimeout(() => wrapper.remove(), 200)
  }
}

export function destroyModal(): void {
  hideModal()
  if (host) {
    host.remove()
    host = null
    shadow = null
    currentConfig = null
  }
}
