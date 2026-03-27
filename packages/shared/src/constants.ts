import type { ChainInfo } from './types'

export const DEFAULT_API_URL = 'https://api.crypax.io'
export const DEFAULT_RPC_URL = 'https://plug.plumise.com/rpc'
export const DEFAULT_CHAIN_ID = 41956

export const PLUMISE_MAINNET: ChainInfo = {
  chainId: 41956,
  name: 'Plumise',
  symbol: 'PLM',
  decimals: 18,
  rpcUrl: 'https://plug.plumise.com/rpc',
  explorerUrl: 'https://explorer.plumise.com',
}

export const PLUMISE_TESTNET: ChainInfo = {
  chainId: 41957,
  name: 'Plumise Testnet',
  symbol: 'tPLM',
  decimals: 18,
  rpcUrl: 'https://plug.plumise.com/rpc/testnet',
  explorerUrl: 'https://testnet.explorer.plumise.com',
}

export const SUPPORTED_CHAIN_IDS = [41956, 41957] as const

export const CHAINS: Record<number, ChainInfo> = {
  41956: PLUMISE_MAINNET,
  41957: PLUMISE_TESTNET,
}

export const WEBHOOK_EVENTS = [
  'payment.created',
  'payment.processing',
  'payment.confirmed',
  'payment.failed',
  'payment.expired',
  'payment.refunded',
  'refund.created',
  'refund.completed',
  'refund.failed',
  'settlement.requested',
  'settlement.approved',
  'settlement.completed',
  'settlement.failed',
  'customer.created',
  'customer.updated',
] as const

export const ERROR_CODES = {
  INVALID_KEY: 'invalid_api_key',
  PAYMENT_NOT_FOUND: 'payment_not_found',
  PAYMENT_EXPIRED: 'payment_expired',
  CHAIN_NOT_SUPPORTED: 'chain_not_supported',
  WALLET_NOT_CONNECTED: 'wallet_not_connected',
  TRANSACTION_FAILED: 'transaction_failed',
  NETWORK_ERROR: 'network_error',
} as const
