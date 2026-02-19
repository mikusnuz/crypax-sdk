import { useState, useCallback } from 'react'
import type { PaymentResult, PaymentStatus, WalletInfo } from '@crypax/js'
import { useCrypax } from './provider'

export function useConfirmPayment() {
  const crypax = useCrypax()
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [result, setResult] = useState<PaymentResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const confirmPayment = useCallback(async (clientSecret: string) => {
    setStatus('loading')
    setError(null)
    setResult(null)

    const unsubscribe = crypax.on('status_change', (data) => {
      setStatus((data as { status: PaymentStatus }).status)
    })

    try {
      const res = await crypax.confirmPayment(clientSecret)
      setResult(res)
      setStatus(res.status === 'confirmed' ? 'confirmed' : (res.status as PaymentStatus))
      return res
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      setStatus('failed')
      return { status: 'failed' as const, error: message }
    } finally {
      unsubscribe()
    }
  }, [crypax])

  const reset = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setError(null)
  }, [])

  return { confirmPayment, status, result, error, reset }
}

export function useWallet() {
  const crypax = useCrypax()
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [loading, setLoading] = useState(false)

  const detect = useCallback(async () => {
    setLoading(true)
    try {
      const info = await crypax.getWallet()
      setWallet(info)
      return info
    } finally {
      setLoading(false)
    }
  }, [crypax])

  return { wallet, loading, detect }
}
