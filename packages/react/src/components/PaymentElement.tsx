import React, { useCallback } from 'react'
import { useConfirmPayment } from '../hooks'
import type { PaymentResult } from '@crypax/shared'

interface PaymentElementProps {
  clientSecret: string
  onSuccess?: (result: PaymentResult) => void
  onError?: (error: string) => void
  className?: string
}

export function PaymentElement({ clientSecret, onSuccess, onError, className }: PaymentElementProps) {
  const { confirmPayment, status, error } = useConfirmPayment()

  const handlePay = useCallback(async () => {
    try {
      const result = await confirmPayment(clientSecret)
      if (result.status === 'confirmed') onSuccess?.(result)
    } catch (e: any) {
      onError?.(e.message)
    }
  }, [clientSecret, confirmPayment, onSuccess, onError])

  const isProcessing = !['idle', 'ready', 'confirmed', 'failed', 'cancelled', 'expired'].includes(status)

  return (
    <div className={className} style={{ fontFamily: 'system-ui, sans-serif' }}>
      <button
        onClick={handlePay}
        disabled={isProcessing}
        style={{
          width: '100%', padding: '14px 24px', borderRadius: '12px', border: 'none',
          background: isProcessing ? '#94a3b8' : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
          color: 'white', fontSize: '16px', fontWeight: 600, cursor: isProcessing ? 'not-allowed' : 'pointer',
        }}
      >
        {isProcessing ? 'Processing...' : status === 'confirmed' ? 'Paid' : 'Pay Now'}
      </button>
      {error && <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '8px' }}>{error}</p>}
    </div>
  )
}
