export interface ChainInfo {
  chainId: number
  name: string
  symbol: string
  decimals: number
  rpcUrl: string
  explorerUrl: string
  isTestnet: boolean
}

export const PLUMISE_MAINNET: ChainInfo = {
  chainId: 41956,
  name: 'Plumise Mainnet',
  symbol: 'PLM',
  decimals: 18,
  rpcUrl: 'https://plug.plumise.com/rpc',
  explorerUrl: 'https://explorer.plumise.com',
  isTestnet: false,
} as const

export const PLUMISE_TESTNET: ChainInfo = {
  chainId: 419561,
  name: 'Plumise Testnet',
  symbol: 'PLM',
  decimals: 18,
  rpcUrl: 'https://plug.plumise.com/testnet/rpc',
  explorerUrl: 'https://testnet-explorer.plumise.com',
  isTestnet: true,
} as const

export const CHAINS = {
  PLUMISE_MAINNET,
  PLUMISE_TESTNET,
} as const

export const SUPPORTED_CHAIN_IDS = [
  PLUMISE_MAINNET.chainId,
  PLUMISE_TESTNET.chainId,
] as const
