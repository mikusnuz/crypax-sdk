import React, { createContext, useContext, useState, useCallback } from 'react'
import type { CrypaxConfig, PaymentResult, PaymentStatus, WalletInfo } from '@crypax/shared'

interface CrypaxRNContext {
  config: CrypaxConfig
  apiUrl: string
}

const Ctx = createContext<CrypaxRNContext | null>(null)

export function CrypaxProvider({ publishableKey, children, ...opts }: { publishableKey: string; children: React.ReactNode } & Partial<Omit<CrypaxConfig, 'publishableKey'>>) {
  const apiUrl = opts.apiUrl || 'https://api.crypax.io'
  const config: CrypaxConfig = { publishableKey, ...opts }
  return <Ctx.Provider value={{ config, apiUrl }}>{children}</Ctx.Provider>
}

export function useCrypax() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCrypax must be used within CrypaxProvider')
  return ctx
}

export function useConfirmPayment() {
  const { config, apiUrl } = useCrypax()
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [result, setResult] = useState<PaymentResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const confirmPayment = useCallback(async (clientSecret: string) => {
    setStatus('loading'); setError(null)
    try {
      const paymentId = clientSecret.split('_secret_')[0].replace('pi_', '')
      const res = await fetch(`${apiUrl}/v1/payments/${paymentId}?clientSecret=${clientSecret}`, {
        headers: { 'x-crypax-key': config.publishableKey },
      })
      const data = await res.json()
      const paymentResult: PaymentResult = { status: data.status === 'confirmed' ? 'confirmed' : data.status === 'expired' ? 'expired' : 'failed', paymentId: data.id, txHash: data.txHash }
      setResult(paymentResult); setStatus(data.status)
      return paymentResult
    } catch (e: any) { setError(e.message); setStatus('failed'); throw e }
  }, [config, apiUrl])

  return { confirmPayment, status, result, error, reset: () => { setStatus('idle'); setResult(null); setError(null) } }
}

export function useWallet() {
  return { wallet: null as WalletInfo | null, loading: false, detect: async (): Promise<WalletInfo> => ({ type: 'none' }) }
}
