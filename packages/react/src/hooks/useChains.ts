import { CHAINS, SUPPORTED_CHAIN_IDS } from '@crypax/shared'
import type { ChainInfo } from '@crypax/shared'

export function useChains() {
  const chains: ChainInfo[] = SUPPORTED_CHAIN_IDS.map(id => CHAINS[id]).filter(Boolean)
  return { chains, loading: false, error: null }
}
