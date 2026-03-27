// Re-export everything from @crypax/react for convenience
export {
  CrypaxProvider, useCrypax, useConfirmPayment, useWallet,
  usePaymentStatus, useChains, CheckoutButton, PaymentElement, PaymentStatusBadge,
} from '@crypax/react'

// Re-export types
export type { CrypaxConfig, PaymentResult, PaymentStatus, WalletInfo, ChainInfo } from '@crypax/shared'
export { CrypaxError, ERROR_CODES, CHAINS, SUPPORTED_CHAIN_IDS } from '@crypax/shared'
