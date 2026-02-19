export interface CrypaxConfig {
  publishableKey: string
  apiUrl?: string
  theme?: 'light' | 'dark' | 'auto'
  locale?: 'ko' | 'en'
  chainId?: number
  rpcUrl?: string
  chainName?: string
  explorerUrl?: string
  nativeCurrency?: { name: string; symbol: string; decimals: number }
}

export interface ResolvedConfig {
  publishableKey: string
  apiUrl: string
  theme: 'light' | 'dark' | 'auto'
  locale: 'ko' | 'en'
  chainId: number
  rpcUrl: string
  chainName: string
  explorerUrl: string
  nativeCurrency: { name: string; symbol: string; decimals: number }
}

export interface ModalBranding {
  logoDataUrl?: string
  brandName?: string
  primaryColorStart?: string
  primaryColorEnd?: string
  lightBg?: string
  lightText?: string
  darkBg?: string
  darkText?: string
  walletOrder?: string[]
  borderRadius?: number
  hideFooter?: boolean
}

export interface BackendPaymentInfo {
  id: string
  amount: string
  currency: string
  recipientAddress: string
  status: string
  description?: string
  orderId?: string
  expiresAt: string
  txHash?: string | null
  blockNumber?: number | null
  confirmedAt?: string | null
  paymentMethod?: string
  chainId?: number
  chainName?: string
  rpcUrl?: string
  explorerUrl?: string
  symbol?: string
  decimals?: number
  branding?: ModalBranding | null
}

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

export type CrypaxEventType =
  | 'status_change'
  | 'wallet_detected'
  | 'tx_submitted'
  | 'tx_confirmed'
  | 'error'

export interface StatusChangeEvent {
  status: PaymentStatus
  txHash?: string
  blockNumber?: number
  error?: string
}
