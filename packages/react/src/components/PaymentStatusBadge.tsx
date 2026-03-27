import React from 'react'
import { usePaymentStatus } from '../hooks/usePaymentStatus'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: '#dcfce7', text: '#16a34a' },
  processing: { bg: '#fef3c7', text: '#d97706' },
  submitted: { bg: '#fef3c7', text: '#d97706' },
  created: { bg: '#e0e7ff', text: '#4f46e5' },
  failed: { bg: '#fecaca', text: '#dc2626' },
  expired: { bg: '#f3f4f6', text: '#6b7280' },
}

export function PaymentStatusBadge({ clientSecret }: { clientSecret: string }) {
  const { status, loading } = usePaymentStatus(clientSecret)
  if (loading && status === 'unknown') return <span>...</span>
  const colors = STATUS_COLORS[status] || STATUS_COLORS.created
  return (
    <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 500, backgroundColor: colors.bg, color: colors.text }}>
      {status}
    </span>
  )
}
