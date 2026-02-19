import type { ResolvedConfig } from './types'

export const DEFAULT_API_URL = 'https://api.crypax.io'

/**
 * Default chain configuration.
 * Can be overridden via CrypaxConfig at initialization.
 */
export const DEFAULT_CHAIN = {
  chainId: 41956,
  name: 'Plumise Mainnet',
  rpcUrl: 'https://plug.plumise.com/rpc',
  explorerUrl: 'https://explorer.plumise.com',
  nativeCurrency: {
    name: 'PLM',
    symbol: 'PLM',
    decimals: 18,
  },
} as const

export const PEXUS_CHROME_STORE_URL =
  'https://chromewebstore.google.com/detail/pexus/ldnbgglmfnlamhdbpmiaapbmfnkcadjh'

export const TX_POLL_INTERVAL_MS = 3000
export const BACKEND_POLL_INTERVAL_MS = 3000
export const BACKEND_POLL_TIMEOUT_MS = 120_000

export function buildDefaultConfig(publishableKey: string): ResolvedConfig {
  return {
    publishableKey,
    apiUrl: DEFAULT_API_URL,
    theme: 'auto',
    locale: 'ko',
    chainId: DEFAULT_CHAIN.chainId,
    rpcUrl: DEFAULT_CHAIN.rpcUrl,
    chainName: DEFAULT_CHAIN.name,
    explorerUrl: DEFAULT_CHAIN.explorerUrl,
    nativeCurrency: { ...DEFAULT_CHAIN.nativeCurrency },
  }
}
