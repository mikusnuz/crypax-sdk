// Payment types
export type PaymentStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'connecting'
  | 'switching_chain'
  | 'awaiting_approval'
  | 'submitted'
  | 'waiting_direct'
  | 'confirmed'
  | 'failed'
  | 'cancelled'
  | 'expired'

export type PaymentMethod = 'pexus' | 'metamask' | 'walletconnect' | 'coinbase' | 'phantom' | 'direct'

export type CrypaxEventType = 'status_change' | 'wallet_detected' | 'tx_submitted' | 'tx_confirmed' | 'error'

export interface PaymentResult {
  status: 'confirmed' | 'cancelled' | 'expired' | 'failed'
  paymentId?: string
  txHash?: string
  blockNumber?: number
  error?: string
}

export interface WalletInfo {
  type: 'pexus' | 'metamask' | 'coinbase' | 'phantom' | 'other' | 'none'
  address?: string
  chainId?: number
}

export interface ChainInfo {
  chainId: number
  name: string
  symbol: string
  decimals: number
  rpcUrl: string
  explorerUrl?: string
  isTestnet?: boolean
}

// Server-side types
export interface Payment {
  id: string
  clientSecret: string
  projectId?: string
  customerId?: string
  amount: string
  currency: string
  recipientAddress: string
  status: string
  paymentMethod?: string | null
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

export interface Customer {
  id: string
  projectId: string
  walletAddress?: string | null
  email?: string | null
  displayName?: string | null
  metadata?: Record<string, any> | null
  totalPayments: number
  totalVolume: string
  createdAt: string
  updatedAt: string
}

export interface Refund {
  id: string
  paymentId: string
  projectId?: string
  amount: string
  toAddress?: string
  status: string
  txHash?: string | null
  reason?: string | null
  createdAt: string
  updatedAt: string
}

export interface WebhookEvent {
  id: string
  type: string
  data: Record<string, any>
  createdAt: string
}

export interface PaginatedList<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

// Config types
export interface CrypaxConfig {
  publishableKey: string
  apiUrl?: string
  theme?: 'light' | 'dark' | 'auto'
  locale?: string
  chainId?: number
}

export interface CrypaxServerConfig {
  secretKey: string
  apiUrl?: string
}

// Create params
export interface CreatePaymentParams {
  amount: string
  recipientAddress?: string
  chainId: number
  currency?: string
  orderId?: string
  description?: string
  metadata?: Record<string, any>
  expiresInMinutes?: number
  fiatCurrency?: string
  fiatAmount?: number
  qrMode?: boolean
}

export interface CreateCustomerParams {
  walletAddress?: string
  email?: string
  displayName?: string
  metadata?: Record<string, any>
}

export interface CreateRefundParams {
  paymentId: string
  amount?: string
  reason?: string
}
