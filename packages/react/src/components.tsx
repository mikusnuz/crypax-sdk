import React, { useCallback } from 'react'
import type { PaymentResult } from '@crypax/js'
import { useConfirmPayment } from './hooks'

export interface CheckoutButtonProps {
  clientSecret: string
  onSuccess?: (result: PaymentResult) => void
  onCancel?: () => void
  onError?: (error: string) => void
  className?: string
  children?: React.ReactNode
  disabled?: boolean
}

export function CheckoutButton({
  clientSecret,
  onSuccess,
  onCancel,
  onError,
  className,
  children,
  disabled,
}: CheckoutButtonProps) {
  const { confirmPayment, status } = useConfirmPayment()

  const handleClick = useCallback(async () => {
    const result = await confirmPayment(clientSecret)
    if (result.status === 'confirmed') onSuccess?.(result)
    else if (result.status === 'cancelled') onCancel?.()
    else if (result.status === 'failed') onError?.(result.error || 'Unknown error')
  }, [clientSecret, confirmPayment, onSuccess, onCancel, onError])

  const isLoading =
    status !== 'idle' &&
    status !== 'confirmed' &&
    status !== 'cancelled' &&
    status !== 'failed' &&
    status !== 'expired'

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={className}
      style={
        !className
          ? {
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: isLoading || disabled ? 'not-allowed' : 'pointer',
              opacity: isLoading || disabled ? 0.6 : 1,
              transition: 'opacity 0.2s',
            }
          : undefined
      }
    >
      {children || (isLoading ? 'Processing...' : 'Pay')}
    </button>
  )
}
