// Re-export shared types
export type {
  CrypaxServerConfig,
  CreatePaymentParams,
  CreateCustomerParams,
  CreateRefundParams,
  Payment,
  Customer,
  Refund,
  WebhookEvent,
  PaginatedList,
  ChainInfo,
} from '@crypax/shared'

import type { Payment } from '@crypax/shared'

// Node-specific resolved config
export interface ResolvedServerConfig {
  secretKey: string
  apiUrl: string
  rpcUrl: string
  chainId: number
}

// Node-specific verification types
export interface PaymentVerification {
  valid: boolean
  tx?: TransactionInfo
  error?: string
  amountMatch?: boolean
  recipientMatch?: boolean
  chainMatch?: boolean
}

export interface TransactionInfo {
  hash: string
  from: string
  to: string
  value: string
  blockNumber: number
  blockHash: string
  status: 'success' | 'reverted'
  timestamp?: number
}

// PaymentList for backward compatibility
export interface PaymentList {
  data: Payment[]
  total: number
}
