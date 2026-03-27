export { Crypax } from './crypax'
export { CHAINS, PLUMISE_MAINNET, PLUMISE_TESTNET, SUPPORTED_CHAIN_IDS } from './chains'
export type { ChainInfo } from './chains'
export { verifyWebhookSignature, constructEvent } from './webhooks'
export { verifyPayment, verifyERC20Payment } from './verify'
export { isValidAddress, addressEquals, parseAmount, formatAmount, TRANSFER_EVENT_TOPIC } from './utils'

// Shared package re-exports
export {
  DEFAULT_API_URL,
  DEFAULT_RPC_URL,
  DEFAULT_CHAIN_ID,
  WEBHOOK_EVENTS,
  ERROR_CODES,
} from '@crypax/shared'
export { CrypaxError } from '@crypax/shared'
export type {
  PaymentStatus,
  PaymentMethod,
  CrypaxEventType,
  PaymentResult,
  WalletInfo,
  CreateCustomerParams,
  CreateRefundParams,
  Customer,
  Refund,
  PaginatedList,
} from '@crypax/shared'

export type {
  CrypaxServerConfig,
  CreatePaymentParams,
  Payment,
  PaymentList,
  WebhookEvent,
  PaymentVerification,
  TransactionInfo,
} from './types'
