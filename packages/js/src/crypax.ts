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
import {
  createModal,
  showModal,
  updateStatus,
  hideModal,
  destroyModal,
  showDirectPayment,
  updateModalBody,
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

    const cfg = this.config
    createModal({
      theme: cfg.theme,
      locale: cfg.locale,
      explorerUrl: cfg.explorerUrl,
      chainName: cfg.chainName,
      currencySymbol: cfg.nativeCurrency.symbol,
      chainId: cfg.chainId,
    })

    return new Promise<PaymentResult>((resolve) => {
      const finish = (result: PaymentResult) => {
        setTimeout(() => hideModal(), result.status === 'confirmed' ? 2000 : 0)
        resolve(result)
      }

      const handleClose = () => {
        this.abortController?.abort()
        hideModal()
        resolve({ status: 'cancelled', paymentId })
      }

      const handleWalletPayment = async () => {
        try {
          this.setStatus('connecting')
          const address = await connectWallet()

          const currentChainId = await getChainId()
          if (currentChainId !== cfg.chainId) {
            this.setStatus('switching_chain')
            await switchChain({
              chainId: cfg.chainId,
              name: cfg.chainName,
              rpcUrl: cfg.rpcUrl,
              explorerUrl: cfg.explorerUrl,
              symbol: cfg.nativeCurrency.symbol,
              decimals: cfg.nativeCurrency.decimals,
            })
          }

          this.setStatus('awaiting_approval')

          let txHash: string
          if (paymentInfo.currency === 'native') {
            txHash = await sendNativeTransaction(
              paymentInfo.recipientAddress,
              paymentInfo.amount,
              address,
              cfg.nativeCurrency.decimals,
            )
          } else {
            txHash = await sendERC20Transaction(
              paymentInfo.currency,
              paymentInfo.recipientAddress,
              paymentInfo.amount,
              address,
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
          case 'wallet':
            handleWalletPayment()
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
