import type {
  CrypaxConfig,
  ResolvedConfig,
  PaymentResult,
  PaymentStatus,
  WalletInfo,
  CrypaxEventType,
  BackendPaymentInfo,
  PaymentMethod,
} from './types'
import { buildDefaultConfig, PEXUS_CHROME_STORE_URL, BACKEND_POLL_INTERVAL_MS, BACKEND_POLL_TIMEOUT_MS } from './constants'
import { CrypaxApiClient } from './api'
import {
  detectWallet,
  connectWallet,
  getChainId,
  switchChain,
  sendNativeTransaction,
  sendERC20Transaction,
} from './wallet'
import { normalizeAmount } from './qr'
import {
  createModal,
  showModal,
  updateStatus,
  hideModal,
  destroyModal,
  showDirectPayment,
  updateModalBody,
  setQuoteExpiredHandler,
  startQuoteTimer,
} from './modal'

export class Crypax {
  private config: ResolvedConfig
  private api: CrypaxApiClient
  private listeners: Map<CrypaxEventType, Set<(data: unknown) => void>>
  private abortController: AbortController | null = null

  constructor(publishableKey: string, config?: Omit<CrypaxConfig, 'publishableKey'>) {
    const defaults = buildDefaultConfig(publishableKey)
    this.config = {
      ...defaults,
      ...config,
      publishableKey,
      nativeCurrency: config?.nativeCurrency ?? defaults.nativeCurrency,
    }
    this.api = new CrypaxApiClient(this.config.apiUrl, this.config.publishableKey)
    this.listeners = new Map()
  }

  on(event: CrypaxEventType, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  private emit(event: CrypaxEventType, data: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(data))
  }

  private setStatus(status: PaymentStatus, extra?: { txHash?: string; blockNumber?: number; error?: string }): void {
    this.emit('status_change', { status, ...extra })
    updateStatus(status, extra)
  }

  async getWallet(): Promise<WalletInfo> {
    const info = detectWallet()
    if (info.type !== 'none') {
      try {
        const chainId = await getChainId()
        return { ...info, chainId }
      } catch {
        return info
      }
    }
    return info
  }

  async confirmPayment(clientSecret: string): Promise<PaymentResult> {
    const paymentId = clientSecret.split('_secret_')[0]
    if (!paymentId) throw new Error('Invalid clientSecret format')

    this.abortController = new AbortController()

    this.setStatus('loading')

    let paymentInfo: BackendPaymentInfo
    try {
      paymentInfo = await this.api.fetchPayment(paymentId, clientSecret)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.emit('error', { error: msg })
      throw err
    }

    this.setStatus('ready')

    const walletInfo = detectWallet()
    this.emit('wallet_detected', walletInfo)

    // Resolve chain info: prefer backend payment response, fallback to config
    const chainId = paymentInfo.chainId ?? this.config.chainId
    const chainName = paymentInfo.chainName ?? this.config.chainName
    const rpcUrl = paymentInfo.rpcUrl ?? this.config.rpcUrl
    const explorerUrl = paymentInfo.explorerUrl ?? this.config.explorerUrl
    const symbol = paymentInfo.symbol ?? this.config.nativeCurrency.symbol
    const decimals = paymentInfo.decimals ?? this.config.nativeCurrency.decimals

    const cfg = this.config
    createModal({
      theme: cfg.theme,
      locale: cfg.locale,
      explorerUrl,
      chainName,
      currencySymbol: symbol,
      chainId,
      decimals,
      branding: paymentInfo.branding,
      fiatCurrency: paymentInfo.fiatCurrency,
      fiatAmount: paymentInfo.fiatAmount,
      cryptoAmount: paymentInfo.cryptoAmount,
      exchangeRate: paymentInfo.exchangeRate,
      quoteExpiresAt: paymentInfo.quoteExpiresAt,
      tokenAddress: paymentInfo.tokenAddress,
      tokenSymbol: paymentInfo.tokenSymbol,
      tokenDecimals: paymentInfo.tokenDecimals,
    })

    return new Promise<PaymentResult>((resolve) => {
      let pendingResult: PaymentResult | null = null

      const finish = (result: PaymentResult) => {
        if (result.status === 'confirmed') {
          // Don't auto-close — let user see the result and manually close
          pendingResult = result
        } else {
          hideModal()
          resolve(result)
        }
      }

      const handleClose = () => {
        this.abortController?.abort()
        hideModal()
        if (pendingResult) {
          resolve(pendingResult)
        } else {
          resolve({ status: 'cancelled', paymentId })
        }
      }

      const handleWalletPayment = async () => {
        try {
          this.setStatus('connecting')
          const address = await connectWallet()

          const currentChainId = await getChainId()
          if (currentChainId !== chainId) {
            this.setStatus('switching_chain')
            await switchChain({
              chainId,
              name: chainName,
              rpcUrl,
              explorerUrl,
              symbol,
              decimals,
            })

            // Re-verify chain after switch
            const verifiedChainId = await getChainId()
            if (verifiedChainId !== chainId) {
              throw new Error(`Chain switch failed: expected ${chainId}, got ${verifiedChainId}`)
            }
          }

          this.setStatus('awaiting_approval')

          let txHash: string
          const isNative = !paymentInfo.tokenAddress || paymentInfo.tokenAddress === 'native'
          const tokenDec = paymentInfo.tokenDecimals ?? decimals
          const payAmount = paymentInfo.cryptoAmount
            ? normalizeAmount(paymentInfo.cryptoAmount, tokenDec)
            : normalizeAmount(paymentInfo.amount, tokenDec)

          if (isNative) {
            txHash = await sendNativeTransaction(
              paymentInfo.recipientAddress,
              payAmount,
              address,
              tokenDec,
            )
          } else {
            txHash = await sendERC20Transaction(
              paymentInfo.tokenAddress!,
              paymentInfo.recipientAddress,
              payAmount,
              address,
              tokenDec,
            )
          }

          this.emit('tx_submitted', { txHash })
          this.setStatus('submitted', { txHash })

          await this.api.confirmPayment(paymentId, {
            clientSecret,
            txHash,
            senderAddress: address,
          })

          const finalInfo = await this.api.pollPaymentStatus(
            paymentId,
            clientSecret,
            BACKEND_POLL_TIMEOUT_MS,
            BACKEND_POLL_INTERVAL_MS,
          )

          if (finalInfo.status === 'confirmed') {
            const blockNumber = finalInfo.blockNumber ?? undefined
            this.emit('tx_confirmed', { txHash, blockNumber })
            this.setStatus('confirmed', { txHash, blockNumber })
            finish({ status: 'confirmed', paymentId, txHash, blockNumber })
          } else if (finalInfo.status === 'failed') {
            this.setStatus('failed', { error: 'Transaction failed on-chain' })
            finish({ status: 'failed', paymentId, txHash, error: 'Transaction failed on-chain' })
          } else if (finalInfo.status === 'expired') {
            this.setStatus('expired')
            finish({ status: 'expired', paymentId })
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          const isUserReject =
            msg.toLowerCase().includes('rejected') ||
            msg.toLowerCase().includes('denied') ||
            (err as { code?: number }).code === 4001

          if (isUserReject) {
            this.setStatus('cancelled')
            finish({ status: 'cancelled', paymentId })
          } else {
            this.emit('error', { error: msg })
            this.setStatus('failed', { error: msg })
          }
        }
      }

      const handleDirectPayment = async () => {
        try {
          await this.api.watchPayment(paymentId, clientSecret)
          showDirectPayment(paymentInfo)

          const finalInfo = await this.api.pollPaymentStatus(
            paymentId,
            clientSecret,
            BACKEND_POLL_TIMEOUT_MS,
            BACKEND_POLL_INTERVAL_MS,
          )

          if (finalInfo.status === 'confirmed') {
            const blockNumber = finalInfo.blockNumber ?? undefined
            const txHash = finalInfo.txHash ?? undefined
            this.emit('tx_confirmed', { txHash, blockNumber })
            this.setStatus('confirmed', { txHash, blockNumber })
            finish({ status: 'confirmed', paymentId, txHash, blockNumber })
          } else if (finalInfo.status === 'failed') {
            this.setStatus('failed', { error: 'Transaction failed' })
            finish({ status: 'failed', paymentId, error: 'Transaction failed' })
          } else if (finalInfo.status === 'expired') {
            this.setStatus('expired')
            finish({ status: 'expired', paymentId })
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          this.emit('error', { error: msg })
          this.setStatus('failed', { error: msg })
        }
      }

      const handleSelectMethod = (method: PaymentMethod) => {
        switch (method) {
          case 'pexus':
            if (walletInfo.type !== 'pexus') {
              window.open(PEXUS_CHROME_STORE_URL, '_blank', 'noopener')
              return
            }
            handleWalletPayment()
            break
          case 'metamask':
          case 'coinbase':
          case 'phantom':
            handleWalletPayment()
            break
          case 'walletconnect':
            handleDirectPayment()
            break
          case 'direct':
            handleDirectPayment()
            break
        }
      }

      const handleBack = () => {
        updateModalBody(paymentInfo, walletInfo)
      }

      const handleRetry = () => {
        showModal(paymentInfo, walletInfo, {
          onSelectMethod: handleSelectMethod,
          onClose: handleClose,
          onRetry: handleRetry,
          onBack: handleBack,
        })
      }

      const refreshPaymentQuote = async () => {
        try {
          const refreshed = await this.api.refreshQuote(paymentId, clientSecret)
          paymentInfo.cryptoAmount = refreshed.cryptoAmount
          paymentInfo.exchangeRate = refreshed.exchangeRate
          paymentInfo.quoteExpiresAt = refreshed.quoteExpiresAt
          paymentInfo.amount = refreshed.amount ?? paymentInfo.amount
          updateModalBody(paymentInfo, walletInfo)
          if (paymentInfo.quoteExpiresAt) {
            startQuoteTimer(paymentInfo.quoteExpiresAt)
          }
        } catch {
          console.warn('[crypax] Quote refresh failed')
        }
      }

      setQuoteExpiredHandler(refreshPaymentQuote)

      showModal(paymentInfo, walletInfo, {
        onSelectMethod: handleSelectMethod,
        onClose: handleClose,
        onRetry: handleRetry,
        onBack: handleBack,
      })
    })
  }

  setConfig(config: Partial<Omit<CrypaxConfig, 'publishableKey'>>): void {
    Object.assign(this.config, config)
    if (config.nativeCurrency) {
      this.config.nativeCurrency = config.nativeCurrency
    }
    if (config.apiUrl) {
      this.api = new CrypaxApiClient(this.config.apiUrl, this.config.publishableKey)
    }
  }

  destroy(): void {
    this.abortController?.abort()
    destroyModal()
    this.listeners.clear()
  }
}
