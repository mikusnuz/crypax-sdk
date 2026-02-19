export interface CrypaxServerConfig {
  secretKey: string
  apiUrl?: string
  rpcUrl?: string
  chainId?: number
}

export interface ResolvedServerConfig {
  secretKey: string
  apiUrl: string
  rpcUrl: string
  chainId: number
}

export interface CreatePaymentParams {
  amount: string
  recipientAddress: string
  chainId: number
  currency?: string
  orderId?: string
  description?: string
  metadata?: Record<string, any>
  expiresInMinutes?: number
}

export interface Payment {
  id: string
  clientSecret: string
  amount: string
  currency: string
  recipientAddress: string
  status: string
  paymentMethod?: 'wallet' | 'direct' | null
  txHash?: string | null
  senderAddress?: string | null
  blockNumber?: number | null
  confirmedAt?: string | null
  expiresAt: string
  orderId?: string | null
  description?: string | null
  metadata?: Record<string, any> | null
  createdAt: string
  updatedAt: string
  chainId?: number
  chainName?: string
  symbol?: string
  decimals?: number
}

export interface PaymentList {
  data: Payment[]
  total: number
}

export interface WebhookEvent {
  type: string
  data: Record<string, any>
}

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
