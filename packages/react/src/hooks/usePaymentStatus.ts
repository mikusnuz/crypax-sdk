import { useState, useEffect, useRef } from 'react'
import { useCrypax } from '../provider'

export function usePaymentStatus(clientSecret: string | null, options?: { pollInterval?: number }) {
  const crypax = useCrypax()
  const [status, setStatus] = useState<string>('unknown')
  const [payment, setPayment] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => {
    if (!clientSecret) return

    const paymentId = clientSecret.split('_secret_')[0].replace('pi_', '')
    const pollInterval = options?.pollInterval || 3000

    const poll = async () => {
      try {
        setLoading(true)
        const apiUrl = (crypax as any).config?.apiUrl || 'https://api.crypax.io'
        const key = (crypax as any).config?.publishableKey || ''
        const res = await fetch(`${apiUrl}/v1/payments/${paymentId}?clientSecret=${clientSecret}`, {
          headers: { 'x-crypax-key': key },
        })
        if (res.ok) {
          const data = await res.json()
          setPayment(data)
          setStatus(data.status)
          if (['confirmed', 'failed', 'expired'].includes(data.status)) {
            clearInterval(intervalRef.current!)
          }
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    poll()
    intervalRef.current = setInterval(poll, pollInterval)
    return () => clearInterval(intervalRef.current!)
  }, [clientSecret])

  return { status, payment, loading, error }
}
