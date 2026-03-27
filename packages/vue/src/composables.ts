import { ref, type Ref } from 'vue'
import type { PaymentResult, PaymentStatus, WalletInfo, ChainInfo } from '@crypax/shared'
import { CHAINS } from '@crypax/shared'
import { useCrypax } from './plugin'

export function useConfirmPayment() {
  const crypax = useCrypax()
  const status: Ref<PaymentStatus> = ref('idle')
  const result: Ref<PaymentResult | null> = ref(null)
  const error: Ref<string | null> = ref(null)

  async function confirmPayment(clientSecret: string): Promise<PaymentResult> {
    status.value = 'loading'
    error.value = null
    result.value = null

    const unsubscribe = crypax.on('status_change', (data: any) => {
      status.value = data.status
    })

    try {
      const res = await crypax.confirmPayment(clientSecret)
      result.value = res
      status.value = res.status === 'confirmed' ? 'confirmed' : (res.status as PaymentStatus)
      return res
    } catch (err: any) {
      error.value = err.message
      status.value = 'failed'
      return { status: 'failed' as const, error: err.message }
    } finally {
      unsubscribe()
    }
  }

  function reset() {
    status.value = 'idle'
    result.value = null
    error.value = null
  }

  return { confirmPayment, status, result, error, reset }
}

export function useWallet() {
  const crypax = useCrypax()
  const wallet: Ref<WalletInfo | null> = ref(null)
  const loading = ref(false)

  async function detect() {
    loading.value = true
    try {
      const info = await crypax.getWallet()
      wallet.value = info
      return info
    } finally {
      loading.value = false
    }
  }

  return { wallet, loading, detect }
}

export function usePaymentStatus(clientSecret: Ref<string | null> | string) {
  const status: Ref<PaymentStatus> = ref('idle')
  const error: Ref<string | null> = ref(null)
  const crypax = useCrypax()
  let pollTimer: ReturnType<typeof setTimeout> | null = null

  async function poll() {
    const secret = typeof clientSecret === 'string' ? clientSecret : clientSecret.value
    if (!secret) return
    try {
      const res = await fetch(`${(crypax as any).apiUrl || 'https://api.crypax.io'}/v1/payments/status?clientSecret=${secret}`, {
        headers: { 'x-crypax-key': (crypax as any).publishableKey || '' },
      })
      const data = await res.json()
      status.value = data.status as PaymentStatus
      if (data.status !== 'confirmed' && data.status !== 'failed' && data.status !== 'expired' && data.status !== 'cancelled') {
        pollTimer = setTimeout(poll, 2000)
      }
    } catch (e: any) {
      error.value = e.message
    }
  }

  function start() {
    status.value = 'loading'
    poll()
  }

  function stop() {
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }
  }

  return { status, error, start, stop }
}

export function useChains() {
  const chains: Ref<ChainInfo[]> = ref(Object.values(CHAINS))
  return { chains }
}
