import { ref, type Ref } from 'vue'
import type { PaymentResult, PaymentStatus, WalletInfo } from '@crypax/js'
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
